#!/usr/bin/env python3
"""Import course document requests; retain no raw IPs or user agents in output."""
import argparse
from collections import Counter
from datetime import datetime, timezone, timedelta
import gzip
import hashlib
import hmac
import json
from pathlib import Path
import re
import secrets
from urllib.parse import urlsplit, parse_qs

COURSES = {'yucai-rocket', 'yucai-preschool', 'kete-moon', 'kete-python', 'yingcai-python'}
LINE = re.compile(r'^(\S+) \S+ \S+ \[([^]]+)\] "(\S+) (\S+) [^"]+" (\d{3}) \S+ "([^"]*)" "([^"]*)"')
AUTOMATION = re.compile(r'bot|spider|crawler|headless|curl|wget|python|node|undici|httpclient|go-http|lighthouse|monitor', re.I)

def parse_line(line):
    match = LINE.match(line)
    if not match:
        return None, 'unparsed'
    ip, stamp, method, target, status, referer, agent = match.groups()
    url = urlsplit(target)
    parts = url.path.rstrip('/').split('/')
    if len(parts) != 3 or parts[1] != 'course-plan' or parts[2] not in COURSES:
        return None, 'other_path'
    if method != 'GET' or status not in ('200', '304'):
        return None, 'non_document_status'
    if '_rsc' in parse_qs(url.query, keep_blank_values=True):
        return None, 'rsc_request'
    if AUTOMATION.search(agent) or not re.search(r'Mozilla/|MicroMessenger', agent):
        return None, 'automation'
    date = datetime.strptime(stamp, '%d/%b/%Y:%H:%M:%S %z').astimezone(timezone(timedelta(hours=8))).strftime('%Y-%m-%d')
    if date < '2026-09-11':
        return None, 'before_launch'
    return {'ip': ip, 'agent': agent, 'date': date, 'course': parts[2]}, 'accepted'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--logs', default='/var/log/nginx')
    parser.add_argument('--output', required=True)
    parser.add_argument('--key', required=True)
    args = parser.parse_args()
    key_path = Path(args.key)
    key_path.parent.mkdir(parents=True, exist_ok=True)
    if not key_path.exists():
        key_path.write_bytes(secrets.token_bytes(32))
        key_path.chmod(0o600)
    key = key_path.read_bytes()
    counts = Counter()
    records = []
    files = sorted(Path(args.logs).glob('access.log*'))
    for path in files:
        opener = gzip.open if path.suffix == '.gz' else open
        with opener(path, 'rt', encoding='utf-8', errors='replace') as stream:
            for line in stream:
                record, reason = parse_line(line)
                counts[reason] += 1
                if record:
                    visitor = hmac.new(key, (record['ip'] + '\0' + record['agent']).encode(), hashlib.sha256).hexdigest()
                    records.append({'visitor': visitor, 'date': record['date'], 'course': record['course']})
    records.sort(key=lambda r: (r['date'], r['course'], r['visitor']))
    document = {'source': 'nginx-history', 'importedAt': datetime.now(timezone.utc).isoformat(),
                'start': min((r['date'] for r in records), default='2026-09-11'),
                'end': datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d'),
                'records': records, 'audit': dict(counts), 'files': [p.name for p in files]}
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise SystemExit('Output already exists. Use a new snapshot filename; do not overwrite imported history.')
    output.write_text(json.dumps(document, ensure_ascii=False), encoding='utf-8')
    output.chmod(0o640)
    print(json.dumps({'start': document['start'], 'end': document['end'], 'pv': len(records),
        'estimatedUV': len({r['visitor'] for r in records}), 'courses': dict(Counter(r['course'] for r in records)),
        'audit': dict(counts)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
