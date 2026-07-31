#!/usr/bin/env bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-01

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE=""
CONFIRMED=0

# 输出新数据库初始化帮助。
print_help() {
  cat <<'EOF'
用法：
  ./scripts/deploy/baota/init-database.sh --env /绝对路径/uied-api.env --confirm-new-database

安全说明：
  server/sql/install.sql 包含 DROP TABLE，仅允许用于全新空数据库。
  脚本检测到业务表后会拒绝执行，老客户升级不要运行本脚本。
EOF
}

# 解析初始化参数。
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env) ENV_FILE="${2:-}"; shift 2 ;;
      --confirm-new-database) CONFIRMED=1; shift ;;
      -h|--help) print_help; exit 0 ;;
      *) echo "未知参数: $1" >&2; print_help; exit 1 ;;
    esac
  done
  if [[ -z "$ENV_FILE" || "$CONFIRMED" -ne 1 ]]; then
    print_help
    exit 1
  fi
}

# 读取仅由部署人员维护的环境变量文件。
load_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "环境变量文件不存在: $ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  : "${UIED_DB_HOST:?缺少 UIED_DB_HOST}"
  : "${UIED_DB_PORT:?缺少 UIED_DB_PORT}"
  : "${UIED_DB_USER:?缺少 UIED_DB_USER}"
  : "${UIED_DB_PASSWORD:?缺少 UIED_DB_PASSWORD}"
  : "${UIED_DB_NAME:?缺少 UIED_DB_NAME}"
}

# 检查目标数据库为空，防止误删正式数据。
assert_empty_database() {
  local table_count
  table_count="$(MYSQL_PWD="$UIED_DB_PASSWORD" mysql -N -B \
    -h "$UIED_DB_HOST" -P "$UIED_DB_PORT" -u "$UIED_DB_USER" "$UIED_DB_NAME" \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('la_system_auth_admin','uied_website');")"
  if [[ "$table_count" != "0" ]]; then
    echo "检测到目标数据库已有业务表，已拒绝执行。老客户请使用对应升级补丁。" >&2
    exit 1
  fi
}

# 按固定顺序导入基础结构、业务结构和客户初始化数据。
import_schema() {
  local sql_file
  for sql_file in \
    "$SOURCE_ROOT/server/sql/install.sql" \
    "$SOURCE_ROOT/server/sql/uied_tables.sql" \
    "$SOURCE_ROOT/server/sql/customer/starter.sql"; do
    echo "正在导入: $sql_file"
    MYSQL_PWD="$UIED_DB_PASSWORD" mysql --default-character-set=utf8mb4 \
      -h "$UIED_DB_HOST" -P "$UIED_DB_PORT" -u "$UIED_DB_USER" "$UIED_DB_NAME" < "$sql_file"
  done
}

# 执行全新空数据库初始化主流程。
main() {
  parse_args "$@"
  command -v mysql >/dev/null 2>&1 || { echo "缺少 mysql 客户端" >&2; exit 1; }
  load_env_file
  assert_empty_database
  import_schema
  echo "全新数据库初始化完成。"
}

main "$@"
