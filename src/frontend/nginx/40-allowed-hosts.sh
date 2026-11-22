#!/bin/sh
# nginx image start-up hook: turns FRONTEND_ALLOWED_HOSTS (comma-separated hostnames;
# ".example.com" also allows its subdomains; "all" turns the check off) into entries
# for the host check in default.conf. Same syntax as Vite's allowedHosts.
set -eu
out=/etc/nginx/allowed_hosts.conf
: > "$out"
printf '%s' "${FRONTEND_ALLOWED_HOSTS:-}" | tr ',' '\n' | tr 'A-Z' 'a-z' | tr -d ' \t' | sort -u |
while read -r h; do
  if [ -z "$h" ] || [ "$h" = localhost ]; then
    continue
  elif [ "$h" = all ]; then
    echo '~. 1;' >> "$out"
  elif printf '%s' "$h" | grep -Eq '^\.?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$'; then
    echo "$h 1;" >> "$out"
  else
    echo "$0: ignoring invalid FRONTEND_ALLOWED_HOSTS entry '$h'" >&2
  fi
done
