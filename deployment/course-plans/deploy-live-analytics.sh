#!/usr/bin/env bash
set -Eeuo pipefail
test "$(id -u)" = 0
exec 9>/run/lock/course-plans-deploy.lock
flock -n 9 || { echo 'Another course-plans deployment is running'; exit 1; }
source_dir=$(cd "$(dirname "$0")/../.." && pwd)
if test "$#" = 2; then
  archive=$(realpath "$1")
  revision=$2
  [[ "$revision" =~ ^[a-f0-9]{40}$ ]]
  test -f "$archive"
else
  git -C "$source_dir" diff --quiet
  git -C "$source_dir" diff --cached --quiet
  revision=$(git -C "$source_dir" rev-parse HEAD)
  archive=''
fi
release_id="$(date -u +%Y%m%dT%H%M%SZ)-${revision:0:8}"
release="/srv/course-plans/releases/$release_id"
previous=$(readlink -f /srv/course-plans/current)
case "$previous" in /srv/course-plans/releases/*) ;; *) exit 1;; esac
test -s "$previous/.next/BUILD_ID"
test -f "$previous/.env.local"
test -z "$(ss -H -ltn sport = :3105)"
site=/etc/nginx/sites-available/course-plans
backup="/srv/course-plans/deployment/nginx-before-$release_id.conf"
preview="course-plans-preview-$release_id"
switched=0
site_changed=0
nginx -t
systemctl show learning-report-api surprise-draw -p MainPID -p ActiveEnterTimestamp > "/srv/course-plans/deployment/services-before-$release_id.txt"
cp -p "$site" "$backup"
cleanup() {
  result=$?
  trap - EXIT
  systemctl stop "$preview" >/dev/null 2>&1 || true
  if test "$result" -ne 0; then
    if test "$switched" = 1; then
      ln -s "$previous" "/srv/course-plans/rollback-$release_id"
      mv -Tf "/srv/course-plans/rollback-$release_id" /srv/course-plans/current
      systemctl restart course-plans
    fi
    if test "$site_changed" = 1; then cp -p "$backup" "$site"; nginx -t && systemctl reload nginx; fi
    echo 'Deployment failed; previous application/configuration restored.' >&2
  fi
  exit "$result"
}
trap cleanup EXIT
mkdir "$release"
if test -n "$archive"; then tar -xf "$archive" -C "$release"; else git -C "$source_dir" archive HEAD | tar -x -C "$release"; fi
cp "$previous/.env.local" "$release/.env.local"
chmod 600 "$release/.env.local"
python3 - "$release/.env.local" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
lines = [line for line in path.read_text().splitlines() if not line.startswith(('ANALYTICS_DB_FILE=', 'ANALYTICS_ORIGIN='))]
lines += ['ANALYTICS_DB_FILE=/srv/course-plans/data/analytics.sqlite', 'ANALYTICS_ORIGIN=https://plan.bcmty.cn']
path.write_text('\n'.join(lines) + '\n')
PY
install -d -o courseplan -g courseplan -m 750 /srv/course-plans/data
chown -R courseplan:courseplan "$release"
systemd-run --unit="course-plans-build-$release_id" --wait --pipe --collect \
  --property=User=courseplan --property=Group=courseplan --property=CPUQuota=60% \
  --property=MemoryMax=1500M --property=Nice=15 --working-directory="$release" \
  --setenv=NEXT_TELEMETRY_DISABLED=1 --setenv=CIRCLE_NODE_TOTAL=1 \
  --setenv=NODE_OPTIONS=--max-old-space-size=1024 --setenv=npm_config_cache=/srv/course-plans/npm-cache \
  /bin/bash -c 'set -e; npm ci --no-audit --no-fund; npm test; npm run build'
systemd-run --unit="$preview" --collect --property=User=courseplan --property=Group=courseplan \
  --property=CPUQuota=60% --property=MemoryMax=800M --working-directory="$release" \
  --setenv=ANALYTICS_DB_FILE="$release/preview.sqlite" --setenv=ANALYTICS_ORIGIN=http://127.0.0.1:3105 \
  /usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3105
for attempt in {1..30}; do
  if curl -fsS --max-time 3 http://127.0.0.1:3105/admin/login >/dev/null; then break; fi
  sleep 1
done
node "$release/scripts/verify-course-plans.mjs" http://127.0.0.1:3105
test "$(curl -s -o /dev/null -w '%{http_code}' -H 'Origin: http://127.0.0.1:3105' -H 'Content-Type: application/json' --data '{}' http://127.0.0.1:3105/api/analytics/track)" = 400
site_changed=1
python3 - "$site" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
route_prefix = '    location ~ ^/course-plan/('
routes = [line for line in text.splitlines() if line.startswith(route_prefix)]
if len(routes) != 1:
    raise SystemExit('Unexpected course route configuration')
published = '    location ~ ^/course-plan/(yucai-rocket|yucai-preschool|kete-moon|kete-python|yingcai-python|b-yucai-rocket|b-kete-moon|b-kete-python|b-yingcai-rocket|b-yingcai-moon|b-yingcai-python)/?$ {'
text = text.replace(routes[0], published)
if 'location = /api/analytics/track {' not in text:
    anchor = '    location ^~ /_next/ {'
    if text.count(anchor) != 1 or text.count('server_name plan.bcmty.cn;') != 2:
        raise SystemExit('Unexpected plan Nginx configuration')
    block = '''    # Anonymous course analytics events only.
    location = /api/analytics/track {
        client_max_body_size 1k;
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store" always;
    }

'''
    text = text.replace(anchor, block + anchor)
path.write_text(text)
PY
nginx -t
systemctl stop "$preview"
test "$(readlink -f /srv/course-plans/current)" = "$previous"
ln -s "$release" "/srv/course-plans/next-$release_id"
switched=1
mv -Tf "/srv/course-plans/next-$release_id" /srv/course-plans/current
systemctl restart course-plans
for attempt in {1..30}; do
  if curl -fsS --max-time 3 http://127.0.0.1:3100/admin/login >/dev/null; then break; fi
  sleep 1
done
systemctl reload nginx
node "$release/scripts/verify-course-plans.mjs" https://plan.bcmty.cn
test "$(curl -s -o /dev/null -w '%{http_code}' https://plan.bcmty.cn/admin/analytics)" = 307
test "$(curl -s -o /dev/null -w '%{http_code}' -H 'Origin: https://plan.bcmty.cn' -H 'Content-Type: application/json' --data '{}' https://plan.bcmty.cn/api/analytics/track)" = 400
systemctl show learning-report-api surprise-draw -p MainPID -p ActiveEnterTimestamp > "/srv/course-plans/deployment/services-after-$release_id.txt"
diff "/srv/course-plans/deployment/services-before-$release_id.txt" "/srv/course-plans/deployment/services-after-$release_id.txt"
printf 'Revision: %s\nRelease: %s\nPrevious: %s\nNginx backup: %s\n' "$revision" "$release" "$previous" "$backup" > "/srv/course-plans/deployment/live-$release_id.txt"
echo 'Published automatic analytics: https://plan.bcmty.cn/admin/analytics'
