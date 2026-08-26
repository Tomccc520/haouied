#!/usr/bin/env bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-24

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$SOURCE_ROOT/VERSION")"
DOMAIN=""
SITE_ROOT=""
ENV_FILE=""
WEB_DIR=""
BACKEND_ONLY=0
CHECK_CONFIG_ONLY=0
ROLLBACK_CONTAINER_NAME="uied-api-rollback"
FORCE_REBUILD=0
ORIGINAL_ARGS=("$@")

# 输出 Docker 部署脚本帮助。
print_help() {
  cat <<'EOF'
UIED-NAV 宝塔 Docker 一键部署

用法：
  ./scripts/deploy/docker/deploy.sh --domain hao.uied.cn [选项]

选项：
  --domain DOMAIN       站点域名（必填）
  --site-root PATH      宝塔站点目录，默认 /www/wwwroot/DOMAIN
  --env-file PATH       环境变量文件，默认 SITE_ROOT/shared/uied-api.env
  --web-dir PATH        官网静态目录，默认 SITE_ROOT/web
  --backend-only        只更新后端容器，不同步前台和后台
  --check-config        只检查环境和配置，不执行备份、构建或部署
  --rebuild             即使已有 uied-api，也强制重建标准 Docker 镜像
  -h, --help            显示帮助

说明：
  - 已有 uied-api 默认原地安全升级，不拉基础镜像、不安装依赖。
  - 全新安装或 --rebuild 才构建 Docker 镜像，npm ci 仅在镜像构建时执行。
  - 自动备份当前 web/admin 和旧容器信息，不导入或覆盖数据库。
  - 上传、授权与日志放在 shared 目录，版本升级不会丢失。
EOF
}

# 解析 Docker 部署参数并补齐默认路径。
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain) DOMAIN="${2:-}"; shift 2 ;;
      --site-root) SITE_ROOT="${2:-}"; shift 2 ;;
      --env-file) ENV_FILE="${2:-}"; shift 2 ;;
      --web-dir) WEB_DIR="${2:-}"; shift 2 ;;
      --backend-only) BACKEND_ONLY=1; shift ;;
      --check-config) CHECK_CONFIG_ONLY=1; shift ;;
      --rebuild) FORCE_REBUILD=1; shift ;;
      -h|--help) print_help; exit 0 ;;
      *) echo "未知参数: $1" >&2; print_help; exit 1 ;;
    esac
  done

  if [[ -z "$DOMAIN" || ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "请通过 --domain 传入合法域名。" >&2
    exit 1
  fi
  SITE_ROOT="${SITE_ROOT:-/www/wwwroot/$DOMAIN}"
  ENV_FILE="${ENV_FILE:-$SITE_ROOT/shared/uied-api.env}"
  WEB_DIR="${WEB_DIR:-$SITE_ROOT/web}"
}

# 已有 uied-api 时自动切换到原地安全升级，避免老客户重复重建镜像。
dispatch_existing_container_upgrade() {
  if [[ "$FORCE_REBUILD" -eq 1 ]]; then return 1; fi
  if ! command -v docker >/dev/null 2>&1; then return 1; fi
  if ! docker info >/dev/null 2>&1; then return 1; fi
  if ! docker inspect uied-api >/dev/null 2>&1; then return 1; fi
  echo "检测到已有 uied-api，自动使用原地安全升级模式。"
  exec "$SCRIPT_DIR/upgrade-existing.sh" "${ORIGINAL_ARGS[@]}"
}

# 选择服务器可用的 Docker Compose 命令。
resolve_compose_command() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
    return
  fi
  echo "缺少 Docker Compose，请先在宝塔安装 Docker 管理器或 Compose 插件。" >&2
  exit 1
}

# 兼容 Docker 20.10 之前不支持 host-gateway 的服务器。
resolve_docker_host_gateway() {
  local server_version version_core major minor bridge_gateway
  if [[ -n "${UIED_DOCKER_HOST_GATEWAY:-}" ]]; then
    export UIED_DOCKER_HOST_GATEWAY
    return
  fi
  server_version="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
  version_core="${server_version%%-*}"
  IFS='.' read -r major minor _ <<< "$version_core"
  major="${major:-0}"
  minor="${minor:-0}"
  if [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] \
    && (( 10#$major > 20 || (10#$major == 20 && 10#$minor >= 10) )); then
    export UIED_DOCKER_HOST_GATEWAY=host-gateway
    return
  fi
  bridge_gateway="$(docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || true)"
  if [[ -z "$bridge_gateway" ]]; then
    echo "当前 Docker ${server_version:-未知版本} 不支持 host-gateway，且无法读取 bridge 网关。" >&2
    echo "请升级 Docker 至 20.10+，或手动设置 UIED_DOCKER_HOST_GATEWAY。" >&2
    exit 1
  fi
  export UIED_DOCKER_HOST_GATEWAY="$bridge_gateway"
  echo "检测到旧 Docker ${server_version}，已使用 bridge 网关 ${bridge_gateway}。"
}

# 从简单 KEY=VALUE 文件读取单项值并去除外层引号。
read_env_value() {
  local key="$1"
  awk -v expected="$key" '
    /^[[:space:]]*(#|$)/ { next }
    {
      line=$0
      sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      name=line
      sub(/=.*/, "", name)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
      if (name == expected) {
        value=substr(line, index(line, "=") + 1)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
        if ((substr(value,1,1) == "\"" && substr(value,length(value),1) == "\"") || (substr(value,1,1) == "\047" && substr(value,length(value),1) == "\047")) {
          value=substr(value,2,length(value)-2)
        }
        print value
        exit
      }
    }
  ' "$ENV_FILE"
}

# 检查部署所需命令与构建产物。
check_runtime() {
  local command_name
  for command_name in docker rsync curl sed; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "缺少命令: $command_name" >&2
      exit 1
    fi
  done
  docker info >/dev/null 2>&1 || { echo "Docker 服务未启动。" >&2; exit 1; }
  [[ -f "$SOURCE_ROOT/frontend/build/index.html" ]] || { echo "缺少 frontend/build/index.html" >&2; exit 1; }
  [[ -f "$SOURCE_ROOT/server/frontend/index.html" ]] || { echo "缺少 server/frontend/index.html" >&2; exit 1; }
  resolve_compose_command
  resolve_docker_host_gateway
}

# 首次运行生成 Docker 环境变量模板。
prepare_env_file() {
  local key value site_origin
  mkdir -p "$(dirname "$ENV_FILE")" "$SITE_ROOT/shared/uploads" "$SITE_ROOT/shared/licenses" "$SITE_ROOT/shared/logs"
  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$SOURCE_ROOT/docker/uied-api.env.example" "$ENV_FILE"
    sed -i.bak "s|你的域名|$DOMAIN|g" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
    chmod 600 "$ENV_FILE"
    echo "已生成配置: $ENV_FILE"
    echo "请填写数据库账号、密码和数据库名，再重新执行同一条部署命令。"
    exit 2
  fi
  chmod 600 "$ENV_FILE"
  if grep -q '请填写\|你的域名' "$ENV_FILE"; then
    echo "环境变量仍有未填写项: $ENV_FILE" >&2
    exit 1
  fi
  for key in UIED_DB_HOST UIED_DB_PORT UIED_DB_USER UIED_DB_PASSWORD UIED_DB_NAME UIED_SITE_ORIGIN; do
    value="$(read_env_value "$key")"
    if [[ -z "$value" ]]; then
      echo "Docker 环境变量缺失或为空: $key" >&2
      exit 1
    fi
  done
  site_origin="$(read_env_value UIED_SITE_ORIGIN)"
  if [[ "$site_origin" != "https://$DOMAIN" && "$site_origin" != "http://$DOMAIN" ]]; then
    echo "UIED_SITE_ORIGIN 必须与部署域名一致，当前: $site_origin" >&2
    exit 1
  fi
  value="$(read_env_value UIED_DB_HOST)"
  if [[ "$value" == "127.0.0.1" || "$value" == "localhost" || "$value" == "0.0.0.0" ]]; then
    echo "Docker 内不能使用 UIED_DB_HOST=${value}，请改为 host.docker.internal 或数据库容器服务名。" >&2
    exit 1
  fi
  value="$(read_env_value UIED_REDIS_HOST)"
  if [[ "$value" == "127.0.0.1" || "$value" == "localhost" || "$value" == "0.0.0.0" ]]; then
    echo "Docker 内不能使用 UIED_REDIS_HOST=${value}，请改为 host.docker.internal 或 Redis 容器服务名。" >&2
    exit 1
  fi
  if [[ "$(read_env_value UIED_ENABLE_LOCAL_LICENSE_SIGN)" != "false" ]]; then
    echo "客户站必须保持 UIED_ENABLE_LOCAL_LICENSE_SIGN=false" >&2
    exit 1
  fi
  for key in UIED_LICENSE_SIGN_SECRET UIED_LICENSE_API_SIGN_SECRET; do
    if [[ -n "$(read_env_value "$key")" ]]; then
      echo "客户站禁止配置授权签发密钥: $key" >&2
      exit 1
    fi
  done
}

# 导出 Compose 构建、端口和持久化目录参数，确保检查与正式部署使用同一份配置。
export_compose_environment() {
  export UIED_VERSION="$VERSION"
  export UIED_API_ENV_FILE="$ENV_FILE"
  export UIED_UPLOADS_HOST_DIR="$SITE_ROOT/shared/uploads"
  export UIED_LICENSES_HOST_DIR="$SITE_ROOT/shared/licenses"
  export UIED_LOGS_HOST_DIR="$SITE_ROOT/shared/logs"
  export UIED_API_PORT=8002
  export UIED_CONTAINER_NAME=uied-api
}

# 在构建和切换前展开 Compose 配置，提前拦截旧版 Compose 语法或变量错误。
validate_compose_config() {
  export_compose_environment
  if ! "${COMPOSE[@]}" -f "$SOURCE_ROOT/docker/docker-compose.yml" config >/dev/null; then
    echo "Docker Compose 配置校验失败，未执行部署。" >&2
    exit 1
  fi
}

# 备份静态文件与当前容器元数据，便于快速回滚。
backup_current_release() {
  BACKUP_DIR="/www/backup/$DOMAIN/$(date +%Y%m%d_%H%M%S)-v${VERSION}"
  mkdir -p "$BACKUP_DIR"
  [[ ! -d "$WEB_DIR" ]] || rsync -a --exclude='.user.ini' "$WEB_DIR/" "$BACKUP_DIR/web/"
  [[ ! -d "$SITE_ROOT/admin" ]] || rsync -a "$SITE_ROOT/admin/" "$BACKUP_DIR/admin/"
  if docker inspect uied-api >/dev/null 2>&1; then
    docker inspect uied-api > "$BACKUP_DIR/uied-api.inspect.json"
    docker logs --tail 300 uied-api > "$BACKUP_DIR/uied-api.log" 2>&1 || true
  fi
  printf '%s\n' "$BACKUP_DIR" > "$SITE_ROOT/shared/last-backup-path"
  echo "备份目录: $BACKUP_DIR"
}

# 原子同步前台与管理后台，保留宝塔防跨站文件。
deploy_static_files() {
  local web_next admin_next
  if [[ "$BACKEND_ONLY" -eq 1 ]]; then return; fi
  web_next="$SITE_ROOT/.web-next"
  admin_next="$SITE_ROOT/.admin-next"
  rm -rf "$web_next" "$admin_next" || return 1
  mkdir -p "$web_next" "$admin_next" "$WEB_DIR" "$SITE_ROOT/admin" || return 1
  rsync -a --delete --exclude='.user.ini' "$SOURCE_ROOT/frontend/build/" "$web_next/" || return 1
  rsync -a --delete "$SOURCE_ROOT/server/frontend/" "$admin_next/" || return 1
  rsync -a --delete --exclude='.user.ini' "$web_next/" "$WEB_DIR/" || return 1
  rsync -a --delete "$admin_next/" "$SITE_ROOT/admin/" || return 1
  rm -rf "$web_next" "$admin_next" || return 1
}

# 静态文件切换失败时从本次部署备份恢复官网和管理后台。
restore_static_files() {
  if [[ "$BACKEND_ONLY" -eq 1 ]]; then return; fi
  if [[ -d "$BACKUP_DIR/web" ]]; then
    mkdir -p "$WEB_DIR"
    rsync -a --delete --exclude='.user.ini' "$BACKUP_DIR/web/" "$WEB_DIR/" || true
  fi
  if [[ -d "$BACKUP_DIR/admin" ]]; then
    mkdir -p "$SITE_ROOT/admin"
    rsync -a --delete "$BACKUP_DIR/admin/" "$SITE_ROOT/admin/" || true
  fi
  rm -rf "$SITE_ROOT/.web-next" "$SITE_ROOT/.admin-next"
  echo "静态文件切换失败，已恢复本次部署前备份。" >&2
}

# 构建不可变后端镜像并重建容器，重启阶段不执行 npm install。
deploy_backend_container() {
  local deploy_project_name
  export_compose_environment
  deploy_project_name="uied-nav-${VERSION//./-}-$(date +%s)"

  # 先完成镜像构建，构建失败时保留旧容器继续提供服务。
  "${COMPOSE[@]}" -f "$SOURCE_ROOT/docker/docker-compose.yml" -p "$deploy_project_name" build
  if docker inspect "$ROLLBACK_CONTAINER_NAME" >/dev/null 2>&1; then
    docker rm -f "$ROLLBACK_CONTAINER_NAME" >/dev/null
  fi
  if docker inspect uied-api >/dev/null 2>&1; then
    docker stop uied-api >/dev/null
    docker rename uied-api "$ROLLBACK_CONTAINER_NAME"
  fi
  # 每次切换使用独立 Compose 项目名，避免重建时误删除已改名的回滚容器。
  if ! "${COMPOSE[@]}" -f "$SOURCE_ROOT/docker/docker-compose.yml" -p "$deploy_project_name" up -d --no-build; then
    rollback_backend_container
    exit 1
  fi
}

# 新容器启动失败时恢复上一版后端容器。
rollback_backend_container() {
  docker rm -f uied-api >/dev/null 2>&1 || true
  if docker inspect "$ROLLBACK_CONTAINER_NAME" >/dev/null 2>&1; then
    docker rename "$ROLLBACK_CONTAINER_NAME" uied-api
    docker start uied-api >/dev/null
    echo "新容器启动失败，已恢复上一版 uied-api。" >&2
  fi
}

# 渲染与 web 目录匹配的 Nginx 参考配置。
render_nginx_config() {
  local output_file escaped_root
  mkdir -p "$SITE_ROOT/deploy" || return 1
  output_file="$SITE_ROOT/deploy/uied-nav.nginx.conf"
  escaped_root="$(printf '%s' "$SITE_ROOT" | sed 's/[&|]/\\&/g')"
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__SITE_ROOT__|$escaped_root|g" \
    "$SOURCE_ROOT/scripts/deploy/baota/nginx.conf.example" \
    | sed 's|/frontend;|/web;|' > "$output_file" || return 1
  echo "Nginx 参考配置: $output_file"
}

# 等待容器健康并验证关键 SEO 接口。
verify_deployment() {
  local attempt health sitemap_file
  health="starting"
  for attempt in {1..45}; do
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' uied-api 2>/dev/null || true)"
    if [[ "$health" == "healthy" ]]; then break; fi
    if [[ "$health" == "unhealthy" || "$health" == "exited" ]]; then
      docker logs --tail 120 uied-api >&2 || true
      rollback_backend_container
      exit 1
    fi
    sleep 2
  done
  if [[ "$health" != "healthy" ]]; then
    docker logs --tail 120 uied-api >&2 || true
    rollback_backend_container
    exit 1
  fi
  if ! curl -fsS --max-time 10 http://127.0.0.1:8002/api/uied/license/public-status >/dev/null; then
    rollback_backend_container
    exit 1
  fi
  sitemap_file="$(mktemp)"
  if ! curl -fsS --max-time 20 http://127.0.0.1:8002/sitemap.xml -o "$sitemap_file"; then
    rm -f "$sitemap_file"
    rollback_backend_container
    exit 1
  fi
  if ! grep -q '<urlset' "$sitemap_file"; then
    rm -f "$sitemap_file"
    rollback_backend_container
    exit 1
  fi
  rm -f "$sitemap_file"
  echo "UIED-NAV v$VERSION 后端健康检查通过，容器状态: $health"
  if docker inspect "$ROLLBACK_CONTAINER_NAME" >/dev/null 2>&1; then
    echo "上一版后端容器已保留为: $ROLLBACK_CONTAINER_NAME"
  fi
}

# 新版本切换阶段失败时同时恢复静态文件和上一版后端。
rollback_release() {
  restore_static_files
  rollback_backend_container
}

# 执行 Docker 标准部署主流程。
main() {
  parse_args "$@"
  dispatch_existing_container_upgrade || true
  check_runtime
  prepare_env_file
  validate_compose_config
  if [[ "$CHECK_CONFIG_ONLY" -eq 1 ]]; then
    echo "Docker 部署配置检查通过: $ENV_FILE"
    exit 0
  fi
  backup_current_release
  deploy_backend_container
  verify_deployment
  if ! deploy_static_files; then
    rollback_release
    exit 1
  fi
  if ! render_nginx_config; then
    rollback_release
    exit 1
  fi
  echo "UIED-NAV v$VERSION Docker 部署完成。"
}

main "$@"
