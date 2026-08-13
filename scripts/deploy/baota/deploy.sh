#!/usr/bin/env bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-01

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DOMAIN=""
SITE_ROOT=""
ENV_FILE=""
SKIP_NPM=0
SKIP_RESTART=0
USE_PREBUILT_FRONTEND=0

# 输出命令帮助。
print_help() {
  cat <<'EOF'
UIED-NAV 宝塔命令行部署脚本

用法：
  ./scripts/deploy/baota/deploy.sh --domain example.com [选项]

选项：
  --domain DOMAIN       站点域名（必填）
  --site-root PATH      宝塔站点目录，默认 /www/wwwroot/DOMAIN
  --env-file PATH       后端环境变量文件，默认 SITE_ROOT/shared/uied-api.env
  --skip-npm            跳过后端 npm ci（仅确认依赖已安装时使用）
  --skip-restart        只部署文件，不启动或重载 PM2
  --prebuilt-frontend   使用包内预构建前台，不按当前域名重新生成 SEO 页面
  -h, --help            显示帮助

说明：
  - 不会自动导入数据库，也不会覆盖授权文件和上传目录。
  - 默认按客户域名重新构建 SEO 前台；后台直接使用 server/frontend。
  - 首次运行若环境变量文件不存在，会生成模板并停止，请填写后重新执行。
EOF
}

# 解析命令行参数。
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain) DOMAIN="${2:-}"; shift 2 ;;
      --site-root) SITE_ROOT="${2:-}"; shift 2 ;;
      --env-file) ENV_FILE="${2:-}"; shift 2 ;;
      --skip-npm) SKIP_NPM=1; shift ;;
      --skip-restart) SKIP_RESTART=1; shift ;;
      --prebuilt-frontend) USE_PREBUILT_FRONTEND=1; shift ;;
      -h|--help) print_help; exit 0 ;;
      *) echo "未知参数: $1" >&2; print_help; exit 1 ;;
    esac
  done

  if [[ -z "$DOMAIN" ]]; then
    echo "缺少必填参数 --domain" >&2
    print_help
    exit 1
  fi
  if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ || "$DOMAIN" == .* || "$DOMAIN" == *. ]]; then
    echo "域名格式不合法: $DOMAIN" >&2
    exit 1
  fi
  SITE_ROOT="${SITE_ROOT:-/www/wwwroot/$DOMAIN}"
  ENV_FILE="${ENV_FILE:-$SITE_ROOT/shared/uied-api.env}"
}

# 检查部署依赖和 Node.js 版本。
check_runtime() {
  local command_name node_major
  for command_name in node npm rsync curl sed; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "缺少命令: $command_name" >&2
      exit 1
    fi
  done

  node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
  if [[ "$node_major" -lt 18 ]]; then
    echo "Node.js 版本过低，当前 $(node -v)，请在宝塔安装 Node.js 18 或 20。" >&2
    exit 1
  fi
  if [[ "$SKIP_RESTART" -eq 0 ]] && ! command -v pm2 >/dev/null 2>&1; then
    echo "缺少 PM2，请先执行: npm install -g pm2" >&2
    exit 1
  fi
}

# 检查后台及可选预构建前台静态文件，避免部署空目录。
check_build_outputs() {
  if [[ "$USE_PREBUILT_FRONTEND" -eq 1 && ! -f "$SOURCE_ROOT/frontend/build/index.html" ]]; then
    echo "缺少前台构建产物 frontend/build/index.html，请先执行 npm run build。" >&2
    exit 1
  fi
  if [[ ! -f "$SOURCE_ROOT/server/frontend/index.html" ]]; then
    echo "缺少后台构建产物 server/frontend/index.html，请先构建 server/admin。" >&2
    exit 1
  fi
}

# 首次部署生成环境变量模板，要求客户填写后再继续。
prepare_env_file() {
  local env_dir escaped_site_root
  env_dir="$(dirname "$ENV_FILE")"
  mkdir -p "$env_dir" "$SITE_ROOT/shared/uploads"

  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$SCRIPT_DIR/uied-api.env.example" "$ENV_FILE"
    escaped_site_root="$(printf '%s' "$SITE_ROOT" | sed 's/[&|]/\\&/g')"
    sed -i.bak \
      -e "s|/www/wwwroot/你的域名|$escaped_site_root|g" \
      -e "s|你的域名|$DOMAIN|g" \
      "$ENV_FILE" && rm -f "$ENV_FILE.bak"
    chmod 600 "$ENV_FILE"
    echo "已生成环境变量模板: $ENV_FILE"
    echo "请填写数据库账号、密码、数据库名，再重新执行本命令。"
    exit 2
  fi

  chmod 600 "$ENV_FILE"
  if grep -q '请填写\|你的域名' "$ENV_FILE"; then
    echo "环境变量文件仍有未填写项: $ENV_FILE" >&2
    exit 1
  fi
  validate_env_file
}

# 从简单 KEY=VALUE 文件读取单项值并去除外层引号。
read_env_value() {
  local key="$1"
  awk -v expected="$key" '
    /^[[:space:]]*(#|$)/ { next }
    {
      line=$0
      sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      split(line, parts, "=")
      name=parts[1]
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

# 校验数据库参数和客户站授权安全开关。
validate_env_file() {
  local key value uploads_dir site_origin
  for key in UIED_DB_HOST UIED_DB_PORT UIED_DB_USER UIED_DB_PASSWORD UIED_DB_NAME UIED_UPLOADS_ABS_DIR UIED_SITE_ORIGIN; do
    value="$(read_env_value "$key")"
    if [[ -z "$value" ]]; then
      echo "环境变量缺失或为空: $key" >&2
      exit 1
    fi
  done
  site_origin="$(read_env_value UIED_SITE_ORIGIN)"
  if [[ ! "$site_origin" =~ ^https?://[^/]+$ || "$site_origin" == *127.0.0.1* || "$site_origin" == *localhost* || "$site_origin" == *0.0.0.0* ]]; then
    echo "UIED_SITE_ORIGIN 必须是客户真实站点的 http(s) 主域名，不能是本机地址。" >&2
    exit 1
  fi
  if [[ "$(read_env_value UIED_ENABLE_LOCAL_LICENSE_SIGN)" != "false" ]]; then
    echo "客户站必须配置 UIED_ENABLE_LOCAL_LICENSE_SIGN=false" >&2
    exit 1
  fi
  for key in UIED_LICENSE_SIGN_SECRET UIED_LICENSE_API_SIGN_SECRET; do
    if [[ -n "$(read_env_value "$key")" ]]; then
      echo "客户站禁止配置签发密钥: $key" >&2
      exit 1
    fi
  done
  uploads_dir="$(read_env_value UIED_UPLOADS_ABS_DIR)"
  if [[ "$uploads_dir" != /* || "$uploads_dir" == "/" ]]; then
    echo "UIED_UPLOADS_ABS_DIR 必须是安全的绝对目录，且不能为根目录。" >&2
    exit 1
  fi
  mkdir -p "$uploads_dir"
}

# 准备 Egg 生产配置并安装后端生产依赖。
prepare_backend() {
  local backend_dir
  backend_dir="$SOURCE_ROOT/server/server"
  if [[ ! -f "$backend_dir/config/config.prod.js" ]]; then
    cp "$backend_dir/config/config.prod.example.js" "$backend_dir/config/config.prod.js"
  fi

  if [[ "$SKIP_NPM" -eq 0 ]]; then
    echo "[1/5] 安装后端生产依赖..."
    (cd "$backend_dir" && npm ci --omit=dev)
  else
    echo "[1/5] 已跳过后端依赖安装。"
  fi
}

# 检查 8002 是否被非 PM2 进程占用，避免健康检查误判旧 Docker 服务。
assert_backend_port_owner() {
  local pm2_pid
  pm2_pid="$(pm2 pid uied-api 2>/dev/null | tail -n 1 | tr -d '[:space:]')"
  if curl -fsS --max-time 2 http://127.0.0.1:8002/api/uied/license/public-status >/dev/null 2>&1; then
    if [[ "$pm2_pid" =~ ^[1-9][0-9]*$ ]]; then return; fi
    echo "端口 8002 已被非 PM2 的服务占用。若之前使用 Docker，请先停止旧 uied-api 容器再部署。" >&2
    echo "检查命令: docker ps --format '{{.Names}} {{.Ports}}' | grep 8002" >&2
    exit 1
  fi
}

# 按客户域名和当前数据库重新构建 SEO 前台。
build_frontend() {
  if [[ "$USE_PREBUILT_FRONTEND" -eq 1 ]]; then
    echo "[3/5] 使用源码包内预构建前台。"
    return
  fi
  if [[ "$SKIP_RESTART" -eq 1 ]]; then
    echo "--skip-restart 模式无法读取当前站点 SEO 数据，请同时传入 --prebuilt-frontend。" >&2
    exit 1
  fi

  echo "[3/5] 按 https://$DOMAIN 构建 SEO 前台..."
  (
    cd "$SOURCE_ROOT/frontend"
    npm ci
    REACT_APP_API_URL=/api \
      REACT_APP_SITE_ORIGIN="https://$DOMAIN" \
      SEO_SITE_ORIGIN="https://$DOMAIN" \
      SEO_API_ORIGIN=http://127.0.0.1:8002 \
      npm run build
  )
}

# 原子化同步前台与后台静态文件。
deploy_static_files() {
  local frontend_next admin_next
  frontend_next="$SITE_ROOT/.frontend-next"
  admin_next="$SITE_ROOT/.admin-next"
  echo "[4/5] 部署前台与后台静态文件..."
  rm -rf "$frontend_next" "$admin_next"
  mkdir -p "$frontend_next" "$admin_next"
  rsync -a --delete --exclude '.DS_Store' "$SOURCE_ROOT/frontend/build/" "$frontend_next/"
  rsync -a --delete --exclude '.DS_Store' "$SOURCE_ROOT/server/frontend/" "$admin_next/"
  rm -rf "$SITE_ROOT/frontend.prev" "$SITE_ROOT/admin.prev"
  [[ ! -d "$SITE_ROOT/frontend" ]] || mv "$SITE_ROOT/frontend" "$SITE_ROOT/frontend.prev"
  [[ ! -d "$SITE_ROOT/admin" ]] || mv "$SITE_ROOT/admin" "$SITE_ROOT/admin.prev"
  mv "$frontend_next" "$SITE_ROOT/frontend"
  mv "$admin_next" "$SITE_ROOT/admin"
}

# 渲染当前域名可直接参考的 Nginx 配置。
render_nginx_config() {
  local output_dir output_file escaped_root
  output_dir="$SITE_ROOT/deploy"
  output_file="$output_dir/uied-nav.nginx.conf"
  escaped_root="$(printf '%s' "$SITE_ROOT" | sed 's/[&|]/\\&/g')"
  mkdir -p "$output_dir"
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__SITE_ROOT__|$escaped_root|g" \
    "$SCRIPT_DIR/nginx.conf.example" > "$output_file"
  echo "[5/5] 已生成 Nginx 参考配置: $output_file"
}

# 通过 PM2 启动或平滑重载 Egg 后端。
restart_backend() {
  local backend_dir
  if [[ "$SKIP_RESTART" -eq 1 ]]; then
    echo "[2/5] 已跳过 PM2 启动。"
    return
  fi

  backend_dir="$SOURCE_ROOT/server/server"
  assert_backend_port_owner
  export UIED_BACKEND_DIR="$backend_dir"
  export UIED_API_ENV_FILE="$ENV_FILE"
  pm2 startOrReload "$SCRIPT_DIR/ecosystem.uied-api.config.cjs" --only uied-api --update-env
  pm2 save
  echo "[2/5] 后端已由 PM2 托管。"
}

# 轮询本机公开接口，确认后端真实监听 8002。
health_check() {
  local attempt
  if [[ "$SKIP_RESTART" -eq 1 ]]; then return; fi
  for attempt in {1..20}; do
    if curl -fsS --max-time 3 http://127.0.0.1:8002/api/uied/license/public-status >/dev/null; then
      echo "后端健康检查通过: http://127.0.0.1:8002"
      return
    fi
    sleep 1
  done
  echo "后端健康检查失败，请执行 pm2 logs uied-api --lines 100 查看日志。" >&2
  exit 1
}

# 执行安全的宝塔命令部署主流程。
main() {
  parse_args "$@"
  check_runtime
  check_build_outputs
  prepare_env_file
  prepare_backend
  restart_backend
  health_check
  build_frontend
  deploy_static_files
  render_nginx_config
  echo "部署完成。首次上线请把生成的 Nginx 配置应用到宝塔站点，并执行 nginx -t 后重载。"
}

main "$@"
