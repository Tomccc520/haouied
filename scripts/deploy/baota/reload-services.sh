#!/usr/bin/env bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-01

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_ROOT="${1:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
ENV_FILE="${2:-$SOURCE_ROOT/../../../shared/uied-api.env}"
BACKEND_DIR="$SOURCE_ROOT/server/server"

# 检查服务重载所需命令。
check_commands() {
  local command_name
  for command_name in node pm2 nginx; do
    command -v "$command_name" >/dev/null 2>&1 || { echo "缺少命令: $command_name" >&2; exit 1; }
  done
  [[ -f "$ENV_FILE" ]] || { echo "环境变量文件不存在: $ENV_FILE" >&2; exit 1; }
  [[ -d "$BACKEND_DIR" ]] || { echo "后端目录不存在: $BACKEND_DIR" >&2; exit 1; }
}

# 平滑重载后端并持久化 PM2 进程列表。
reload_backend() {
  export UIED_BACKEND_DIR="$BACKEND_DIR"
  export UIED_API_ENV_FILE="$ENV_FILE"
  pm2 startOrReload "$SCRIPT_DIR/ecosystem.uied-api.config.cjs" --only uied-api --update-env
  pm2 save
}

# 校验并重载 Nginx。
reload_nginx() {
  nginx -t
  if [[ -x /etc/init.d/nginx ]]; then
    /etc/init.d/nginx reload
  else
    nginx -s reload
  fi
}

# 执行服务重载主流程。
main() {
  check_commands
  reload_backend
  reload_nginx
  echo "后端与 Nginx 已重载完成。"
}

main "$@"
