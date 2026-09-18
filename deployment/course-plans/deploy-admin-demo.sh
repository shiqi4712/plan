#!/usr/bin/env bash
set -Eeuo pipefail

# Run from an immutable Git checkout as root. Never build over the live release.
test "$(id -u)" = 0 || { echo 'Run this script as root.' >&2; exit 1; }
for tool in git node npm python3 curl systemd-run nginx flock; do command -v "$tool" >/dev/null; done
exec 9>/run/lock/course-plans-deploy.lock
flock -n 9 || { echo 'A course-plans deployment is already running.' >&2; exit 1; }
source_dir=$(cd "$(dirname "$0")/../.." && pwd)
git -C "$source_dir" diff --quiet
git -C "$source_dir" diff --cached --quiet
revision=$(git -C "$source_dir" rev-parse HEAD)
release_id="$(date -u +%Y%m%dT%H%M%SZ)-${revision:0:8}"
release="/srv/course-plans/releases/$release_id"
previous=$(readlink -f /srv/course-plans/current)
site=/etc/nginx/sites-available/course-plans
backup="/srv/course-plans/deployment/nginx-before-$release_id.conf"
preview="course-plans-preview-$release_id"
switched=0
site_changed=0
case "$previous" in /srv/course-plans/releases/*) ;; *) echo 'Unexpected current release'; exit 1;; esac
test -s "$previous/.next/BUILD_ID"
test -f "$site"
test -z "$(ss -H -ltn sport = :3105)"
test ! -e "$release"
id courseplan >/dev/null
nginx -t
read -r -p 'Admin username [shiqi]: ' admin_name
admin_name=${admin_name:-shiqi}
[[ "$admin_name" =~ ^[a-zA-Z0-9_-]{1,100}$ ]] || { echo 'Invalid username'; exit 1; }
read -r -s -p 'Admin password: ' admin_password
printf '\n'
read -r -s -p 'Repeat password: ' admin_confirmation
printf '\n'
test -n "$admin_password" && test "$admin_password" = "$admin_confirmation" || { echo 'Passwords do not match'; exit 1; }
test "${#admin_password}" -le 256 || { echo 'Password too long'; exit 1; }

cleanup() {
  result=$?
  trap - EXIT
  systemctl stop "$preview" >/dev/null 2>&1 || true
  if test "$result" -ne 0; then
    if test "$switched" = 1; then
      ln -sfn "$previous" "/srv/course-plans/rollback-$release_id"
      mv -Tf "/srv/course-plans/rollback-$release_id" /srv/course-plans/current
      systemctl restart course-plans
    fi
    if test "$site_changed" = 1; then
      cp -p "$backup" "$site"
      nginx -t && systemctl reload nginx
    fi
    echo 'Deployment failed. Previous application/configuration retained or restored.' >&2
  fi
  exit "$result"
}
trap cleanup EXIT
mkdir "$release"
git -C "$source_dir" archive HEAD | tar -x -C "$release"
umask 077
password_hash=$(printf '%s' "$admin_password" | node -e 'const fs=require("node:fs"),c=require("node:crypto");const p=fs.readFileSync(0,"utf8"),s=c.randomBytes(16).toString("hex");process.stdout.write(s+":"+c.scryptSync(p,s,64).toString("hex"));')
printf 'ADMIN_USERNAME=%s\nADMIN_PASSWORD_HASH=%s\n' "$admin_name" "$password_hash" > "$release/.env.local"
unset admin_password admin_confirmation password_hash
python3 - "$previous/.env.local" "$release/.env.local" <<'PY'
from pathlib import Path
import sys
old, new = map(Path, sys.argv[1:])
if old.exists():
    for line in old.read_text().splitlines():
        if line.startswith('ANALYTICS_HISTORY_FILE='):
            with new.open('a') as stream:
                stream.write(line + '\n')
PY
umask 022
chown -R courseplan:courseplan "$release"

systemd-run --unit="course-plans-build-$release_id" --wait --pipe --collect \
  --property=User=courseplan --property=Group=courseplan --property=CPUQuota=60% \
  --property=MemoryMax=1500M --property=Nice=15 --working-directory="$release" \
  --setenv=NEXT_TELEMETRY_DISABLED=1 --setenv=CIRCLE_NODE_TOTAL=1 \
  --setenv=NODE_OPTIONS=--max-old-space-size=1024 --setenv=npm_config_cache=/srv/course-plans/npm-cache \
  /bin/bash -c 'set -e; npm ci --no-audit --no-fund; npm test; npm run build'

systemd-run --unit="$preview" --collect --property=User=courseplan --property=Group=courseplan \
  --property=CPUQuota=60% --property=MemoryMax=800M --property=Nice=15 \
  --working-directory="$release" --setenv=NODE_ENV=production --setenv=NEXT_TELEMETRY_DISABLED=1 \
  --setenv=NODE_OPTIONS=--max-old-space-size=512 \
  /usr/bin/node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3105
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3105/admin/login >/dev/null; then break; fi
  sleep 1
done
node "$release/scripts/verify-course-plans.mjs" http://127.0.0.1:3105
test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3105/admin/analytics)" = 307

# Insert only the two admin routes into the existing plan.bcmty.cn TLS server.
cp -p "$site" "$backup"
site_changed=1
python3 - "$site" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
marker = '    # Course admin demo routes.'
if marker not in text:
    anchor = '    location ^~ /_next/ {'
    if text.count(anchor) != 1 or text.count('server_name plan.bcmty.cn;') != 2 or 'location ~ ^/admin/' in text:
        raise SystemExit('Unexpected plan Nginx configuration; stopped for manual review')
    block = '''    # Course admin demo routes.
    location ~ ^/admin/(login|analytics)/?$ {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "private, no-store" always;
    }

'''
    path.write_text(text.replace(anchor, block + anchor))
PY
nginx -t
systemctl stop "$preview"
test "$(readlink -f /srv/course-plans/current)" = "$previous"
ln -s "$release" "/srv/course-plans/next-$release_id"
switched=1
mv -Tf "/srv/course-plans/next-$release_id" /srv/course-plans/current
systemctl restart course-plans
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3100/admin/login >/dev/null; then break; fi
  sleep 1
done
systemctl reload nginx
node "$release/scripts/verify-course-plans.mjs" https://plan.bcmty.cn
curl -fsS https://plan.bcmty.cn/admin/login >/dev/null
test "$(curl -s -o /dev/null -w '%{http_code}' https://plan.bcmty.cn/admin/analytics)" = 307
printf 'Revision: %s\nRelease: %s\nPrevious: %s\nNginx backup: %s\n' "$revision" "$release" "$previous" "$backup" > "/srv/course-plans/deployment/admin-demo-$release_id.txt"
echo 'Published: https://plan.bcmty.cn/admin/login (simulation data only)'
echo "Previous release retained: $previous"
