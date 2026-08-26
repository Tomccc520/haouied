#!/usr/bin/env bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-25

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$SOURCE_ROOT/VERSION")"
DOMAIN=""
SITE_ROOT=""
WEB_DIR=""
BACKEND_ONLY=0
CHECK_CONFIG_ONLY=0
CONTAINER_NAME="uied-api"
BACKEND_DIR=""
BACKUP_DIR=""
BACKUP_ROOT="${UIED_BACKUP_ROOT:-/www/backup}"
DEPLOYMENT_STARTED=0
ROLLBACK_RUNNING=0

# 输出已有 Docker 容器原地升级帮助。
print_help() {
  cat <<'EOF'
UIED-NAV 已有 uied-api 原地安全升级

用法：
  ./scripts/deploy/docker/upgrade-existing.sh --domain hao.uied.cn [选项]

选项：
  --domain DOMAIN       站点域名（必填）
  --site-root PATH      宝塔站点目录，默认 /www/wwwroot/DOMAIN
  --web-dir PATH        官网静态目录，默认 SITE_ROOT/web
  --backend-only        只更新后端，不同步前台和后台
  --check-config        只检查挂载、依赖和构建产物，不执行升级
  -h, --help            显示帮助

说明：
  - 仅适用于已经运行且把 /app 持久化到宿主机的 uied-api 容器。
  - 依赖未变化时不会执行 npm install、npm ci，也不会重新构建镜像。
  - 自动备份前台、后台和后端源码；失败时恢复文件并重启旧代码。
EOF
}

# 解析原地升级参数并补齐默认目录。
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain) DOMAIN="${2:-}"; shift 2 ;;
      --site-root) SITE_ROOT="${2:-}"; shift 2 ;;
      --env-file) shift 2 ;;
      --web-dir) WEB_DIR="${2:-}"; shift 2 ;;
      --backend-only) BACKEND_ONLY=1; shift ;;
      --check-config) CHECK_CONFIG_ONLY=1; shift ;;
      -h|--help) print_help; exit 0 ;;
      *) echo "未知参数: $1" >&2; print_help; exit 1 ;;
    esac
  done

  if [[ -z "$DOMAIN" || ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "请通过 --domain 传入合法域名。" >&2
    exit 1
  fi
  SITE_ROOT="${SITE_ROOT:-/www/wwwroot/$DOMAIN}"
  WEB_DIR="${WEB_DIR:-$SITE_ROOT/web}"
}

# 检查原地升级所需命令、现有容器和预构建产物。
check_runtime() {
  local command_name
  for command_name in docker rsync curl grep awk; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "缺少命令: $command_name" >&2
      exit 1
    fi
  done
  docker info >/dev/null 2>&1 || { echo "Docker 服务未启动。" >&2; exit 1; }
  docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 || { echo "未找到现有容器: $CONTAINER_NAME" >&2; exit 1; }
  if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || true)" != "true" ]]; then
    echo "现有容器 $CONTAINER_NAME 未运行，已拒绝原地升级。" >&2
    exit 1
  fi
  [[ -f "$SOURCE_ROOT/server/server/package.json" ]] || { echo "缺少后端 package.json" >&2; exit 1; }
  [[ -f "$SOURCE_ROOT/frontend/build/index.html" ]] || { echo "缺少 frontend/build/index.html" >&2; exit 1; }
  [[ -f "$SOURCE_ROOT/server/frontend/index.html" ]] || { echo "缺少 server/frontend/index.html" >&2; exit 1; }
}

# 从容器挂载信息解析可持久化修改的后端宿主机目录。
resolve_backend_dir() {
  local mount_type mount_source mount_destination candidate
  while IFS=$'\t' read -r mount_type mount_source mount_destination; do
    [[ -n "$mount_source" ]] || continue
    case "${mount_destination%/}" in
      /app)
        candidate="$mount_source"
        ;;
      /app/app|/app/config)
        candidate="$(dirname "$mount_source")"
        ;;
      /app/package.json)
        candidate="$(dirname "$mount_source")"
        ;;
      *)
        continue
        ;;
    esac
    if [[ -d "$candidate/app" && -d "$candidate/config" && -f "$candidate/package.json" ]]; then
      BACKEND_DIR="$candidate"
      break
    fi
  done < <(docker inspect -f '{{range .Mounts}}{{printf "%s\t%s\t%s\n" .Type .Source .Destination}}{{end}}' "$CONTAINER_NAME")

  if [[ -z "$BACKEND_DIR" ]]; then
    echo "现有 $CONTAINER_NAME 没有把 /app 后端源码挂载到宿主机，无法安全原地升级。" >&2
    echo "如需重建标准镜像，请在原部署命令后增加 --rebuild。" >&2
    exit 1
  fi
  echo "检测到已有 ${CONTAINER_NAME}，后端目录: $BACKEND_DIR"
}

# 比较新旧运行依赖，依赖变化时拒绝无安装升级。
check_runtime_dependencies() {
  if ! docker exec -i "$CONTAINER_NAME" node -e '
    const fs = require("fs");
    const current = require("/app/package.json");
    const next = JSON.parse(fs.readFileSync(0, "utf8"));
    const keys = ["dependencies", "optionalDependencies", "peerDependencies"];
    const changed = keys.filter(key => JSON.stringify(current[key] || {}) !== JSON.stringify(next[key] || {}));
    if (changed.length > 0) {
      console.error(`检测到生产依赖变化: ${changed.join(", ")}`);
      process.exit(12);
    }
  ' < "$SOURCE_ROOT/server/server/package.json"; then
    echo "本次版本不能直接原地升级；脚本未修改线上文件，也未执行 npm install。" >&2
    echo "请使用 --rebuild 构建新镜像，或使用官方预构建镜像。" >&2
    exit 1
  fi
  echo "生产依赖未变化，将复用现有 node_modules。"
}

# 输出后端 rsync 共用的运行时保护规则。
backend_rsync_excludes() {
  cat <<'EOF'
node_modules/
.env
.env.*
config/config.local.js
config/config.prod.js
licenses/
logs/
run/
exports/
app/public/uploads/
EOF
}

# 使用统一排除规则同步后端源码，保护配置、依赖与运行时数据。
sync_backend_tree() {
  local source_dir="$1"
  local target_dir="$2"
  local exclude_file
  exclude_file="$(mktemp)"
  backend_rsync_excludes > "$exclude_file"
  rsync -a --delete --exclude-from="$exclude_file" "$source_dir/" "$target_dir/"
  rm -f "$exclude_file"
}

# 备份当前前台、后台、后端源码和容器信息。
backup_current_release() {
  BACKUP_DIR="$BACKUP_ROOT/$DOMAIN/$(date +%Y%m%d_%H%M%S)-v${VERSION}-in-place"
  mkdir -p "$BACKUP_DIR/backend" "$SITE_ROOT/shared"
  chmod 700 "$BACKUP_DIR"
  [[ ! -d "$WEB_DIR" ]] || rsync -a --exclude='.user.ini' "$WEB_DIR/" "$BACKUP_DIR/web/"
  [[ ! -d "$SITE_ROOT/admin" ]] || rsync -a "$SITE_ROOT/admin/" "$BACKUP_DIR/admin/"
  sync_backend_tree "$BACKEND_DIR" "$BACKUP_DIR/backend"
  docker inspect "$CONTAINER_NAME" > "$BACKUP_DIR/uied-api.inspect.json"
  docker logs --tail 300 "$CONTAINER_NAME" > "$BACKUP_DIR/uied-api.log" 2>&1 || true
  printf '%s\n' "$BACKUP_DIR" > "$SITE_ROOT/shared/last-backup-path"
  echo "备份目录: $BACKUP_DIR"
}

# 等待现有后端恢复服务并验证授权状态与动态 Sitemap。
verify_backend() {
  local attempt sitemap_file
  for attempt in {1..45}; do
    if curl -fsS --max-time 5 http://127.0.0.1:8002/api/uied/license/public-status >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  curl -fsS --max-time 10 http://127.0.0.1:8002/api/uied/license/public-status >/dev/null
  sitemap_file="$(mktemp)"
  if ! curl -fsS --max-time 20 http://127.0.0.1:8002/sitemap.xml -o "$sitemap_file"; then
    rm -f "$sitemap_file"
    return 1
  fi
  if ! grep -q '<urlset' "$sitemap_file"; then
    rm -f "$sitemap_file"
    return 1
  fi
  rm -f "$sitemap_file"
}

# 原子同步官网和管理后台，并验证入口引用的哈希资源存在。
deploy_static_files() {
  local web_next admin_next web_asset admin_asset
  if [[ "$BACKEND_ONLY" -eq 1 ]]; then return; fi
  web_next="$SITE_ROOT/.web-next"
  admin_next="$SITE_ROOT/.admin-next"
  rm -rf "$web_next" "$admin_next"
  mkdir -p "$web_next" "$admin_next" "$WEB_DIR" "$SITE_ROOT/admin"
  rsync -a --delete --exclude='.user.ini' "$SOURCE_ROOT/frontend/build/" "$web_next/"
  rsync -a --delete "$SOURCE_ROOT/server/frontend/" "$admin_next/"
  rsync -a --delete --exclude='.user.ini' "$web_next/" "$WEB_DIR/"
  rsync -a --delete "$admin_next/" "$SITE_ROOT/admin/"
  rm -rf "$web_next" "$admin_next"

  web_asset="$(grep -oE 'static/js/main\.[a-z0-9]+\.js' "$WEB_DIR/index.html" | head -n 1)"
  admin_asset="$(grep -oE '/admin/assets/index\.[a-z0-9]+\.js' "$SITE_ROOT/admin/index.html" | head -n 1)"
  [[ -n "$web_asset" && -f "$WEB_DIR/$web_asset" ]] || { echo "官网入口资源校验失败。" >&2; return 1; }
  admin_asset="${admin_asset#/admin/}"
  [[ -n "$admin_asset" && -f "$SITE_ROOT/admin/$admin_asset" ]] || { echo "管理后台入口资源校验失败。" >&2; return 1; }
}

# 从备份恢复本次原地升级前的后端和静态文件。
rollback_release() {
  [[ "$ROLLBACK_RUNNING" -eq 0 ]] || return 0
  ROLLBACK_RUNNING=1
  set +e
  if [[ -d "$BACKUP_DIR/backend" ]]; then
    sync_backend_tree "$BACKUP_DIR/backend" "$BACKEND_DIR"
  fi
  if [[ "$BACKEND_ONLY" -eq 0 && -d "$BACKUP_DIR/web" ]]; then
    mkdir -p "$WEB_DIR"
    rsync -a --delete --exclude='.user.ini' "$BACKUP_DIR/web/" "$WEB_DIR/"
  fi
  if [[ "$BACKEND_ONLY" -eq 0 && -d "$BACKUP_DIR/admin" ]]; then
    mkdir -p "$SITE_ROOT/admin"
    rsync -a --delete "$BACKUP_DIR/admin/" "$SITE_ROOT/admin/"
  fi
  rm -rf "$SITE_ROOT/.web-next" "$SITE_ROOT/.admin-next"
  docker restart "$CONTAINER_NAME" >/dev/null 2>&1
  echo "原地升级失败，已恢复部署前文件并重启旧后端。" >&2
}

# 捕获升级阶段错误并执行自动回滚。
handle_deployment_error() {
  local exit_code=$?
  trap - ERR
  if [[ "$DEPLOYMENT_STARTED" -eq 1 ]]; then
    rollback_release
  fi
  exit "$exit_code"
}

# 执行已有 uied-api 原地安全升级主流程。
main() {
  parse_args "$@"
  check_runtime
  resolve_backend_dir
  check_runtime_dependencies
  if [[ "$CHECK_CONFIG_ONLY" -eq 1 ]]; then
    echo "原地升级检查通过：v${VERSION}，不重建镜像、不安装依赖。"
    exit 0
  fi

  backup_current_release
  trap handle_deployment_error ERR
  DEPLOYMENT_STARTED=1
  sync_backend_tree "$SOURCE_ROOT/server/server" "$BACKEND_DIR"
  docker restart "$CONTAINER_NAME" >/dev/null
  verify_backend
  deploy_static_files
  DEPLOYMENT_STARTED=0
  trap - ERR
  echo "UIED-NAV v$VERSION 原地安全升级完成：未重建镜像，未执行 npm install。"
}

main "$@"
