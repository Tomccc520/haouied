#!/bin/bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-06-09

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${UIED_RELEASE_VERSION:-1.1.3}"
DATE_TAG="$(date +%Y%m%d_%H%M%S)"
OUTPUT_DIR="${UIED_RELEASE_OUTPUT_DIR:-$ROOT_DIR/release/customer_${VERSION}_${DATE_TAG}}"
OUTPUT_DIR_EXPLICIT=0
PACKAGE_ROOT="uied-nav-${VERSION}"
WORK_DIR="$OUTPUT_DIR/.package-work"
STAGE_DIR="$WORK_DIR/$PACKAGE_ROOT"
PACKAGE_FILE="$OUTPUT_DIR/uied-nav-${VERSION}-customer-source.tgz"
SHA_FILE="$PACKAGE_FILE.sha256"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 输出信息日志。
log_info() {
  echo -e "${CYAN}[INFO]${NC} $1"
}

# 输出成功日志。
log_ok() {
  echo -e "${GREEN}[OK]${NC} $1"
}

# 输出警告日志。
log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# 输出错误日志。
log_err() {
  echo -e "${RED}[ERR]${NC} $1"
}

# 打印脚本帮助。
print_help() {
  cat <<EOF
UIED-NAV 客户源码包构建脚本

用法:
  ./scripts/build-customer-source-package.sh [选项]

选项:
  --version 1.1.3       指定版本号，默认读取 UIED_RELEASE_VERSION 或 1.1.3
  --output /abs/path    指定输出目录，默认 release/customer_<version>_<date>
  -h, --help            显示帮助

说明:
  - 会排除 node_modules、release、.git、根目录 data、运行时导出数据、本地授权文件、.env、密钥、日志和本地数据库备份。
  - 会生成 .tgz 与 .sha256，并检查包内不包含 .license / customer-license.json / .env / 密钥文件 / 数据库备份 / 历史导出数据。
EOF
}

# 解析命令行参数。
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version)
        VERSION="${2:-$VERSION}"
        PACKAGE_ROOT="uied-nav-${VERSION}"
        if [[ "$OUTPUT_DIR_EXPLICIT" -eq 0 ]]; then
          OUTPUT_DIR="${UIED_RELEASE_OUTPUT_DIR:-$ROOT_DIR/release/customer_${VERSION}_${DATE_TAG}}"
        fi
        WORK_DIR="$OUTPUT_DIR/.package-work"
        STAGE_DIR="$WORK_DIR/$PACKAGE_ROOT"
        PACKAGE_FILE="$OUTPUT_DIR/uied-nav-${VERSION}-customer-source.tgz"
        SHA_FILE="$PACKAGE_FILE.sha256"
        shift 2
        ;;
      --output)
        OUTPUT_DIR="${2:-$OUTPUT_DIR}"
        OUTPUT_DIR_EXPLICIT=1
        WORK_DIR="$OUTPUT_DIR/.package-work"
        STAGE_DIR="$WORK_DIR/$PACKAGE_ROOT"
        PACKAGE_FILE="$OUTPUT_DIR/uied-nav-${VERSION}-customer-source.tgz"
        SHA_FILE="$PACKAGE_FILE.sha256"
        shift 2
        ;;
      -h|--help)
        print_help
        exit 0
        ;;
      *)
        log_err "未知参数: $1"
        print_help
        exit 1
        ;;
    esac
  done
}

# 清理本次构建临时目录，限定在输出目录内，避免误删项目文件。
cleanup_workdir() {
  if [[ -n "${WORK_DIR:-}" && "$WORK_DIR" == "$OUTPUT_DIR/.package-work" && -d "$WORK_DIR" ]]; then
    rm -rf "$WORK_DIR"
  fi
}

# 检查基础命令是否可用。
check_dependencies() {
  for cmd in rsync tar shasum; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      log_err "缺少命令: $cmd"
      exit 1
    fi
  done
}

# 复制源码到 staging 目录，并排除客户包不应该携带的本地文件。
sync_source_to_stage() {
  mkdir -p "$STAGE_DIR"
  log_info "同步源码到 staging: $STAGE_DIR"
  rsync -a --delete \
    --exclude '.git/' \
    --exclude '.DS_Store' \
    --exclude '.agents/' \
    --exclude '.claude/' \
    --exclude '.codex/' \
    --exclude '.codebuddy/' \
    --exclude '.cursor/' \
    --exclude '.kiro/' \
    --exclude '.playwright-cli/' \
    --exclude '.trae/' \
    --exclude '.windsurf/' \
    --exclude '.vscode/' \
    --exclude '.workbuddy/' \
    --exclude '项目检查报告-*.md' \
    --exclude 'node_modules/' \
    --exclude '*/node_modules/' \
    --exclude 'release/' \
    --exclude 'output/' \
    --exclude '/data/' \
    --exclude 'coverage/' \
    --exclude 'test-results/' \
    --exclude 'frontend/test-results/' \
    --exclude 'server/licenses/' \
    --exclude 'server/server/licenses/' \
    --exclude 'server/license' \
    --exclude 'server/server/license' \
    --exclude 'license/' \
    --exclude 'licenses/' \
    --exclude '*.license' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude 'server/server/config/config.local.js' \
    --exclude 'server/server/config/config.prod.js' \
    --exclude '*.pem' \
    --exclude '*.key' \
    --exclude '*.log' \
    --exclude 'server/server/run/' \
    --exclude 'server/server/logs/' \
    --exclude 'server/server/exports/*.json' \
    --exclude 'server/server/typings/' \
    --exclude 'docs/API/reports/*.json' \
    --exclude 'docs/API/1.0.7版本客户安装部署指引-2026-03-17.md' \
    --exclude 'docs/部署文档/生产部署SOP-hao.uied.cn.md' \
    --exclude 'uied_nav_prod_*.sql' \
    --exclude 'uied_ainav_*.sql' \
    --exclude 'uied_nav_mysql56_compatible_*.sql' \
    --exclude '*_mysql_data_*.sql' \
    --exclude '*mysql_backup*.sql' \
    --exclude '*backup*.sql' \
    --exclude '*dump*.sql' \
    --exclude '*.sql.gz' \
    --exclude 'tmp.*.spec.js' \
    "$ROOT_DIR/" "$STAGE_DIR/"
}

# 写入客户包清单，方便客户和交付人员核对。
write_package_manifest() {
  cat > "$STAGE_DIR/RELEASE-PACKAGE.md" <<EOF
# UIED-NAV ${VERSION} 客户源码包

- 生成时间：$(date '+%Y-%m-%d %H:%M:%S')
- 包类型：customer-source
- 默认排除：node_modules、release、.git、根目录 data、运行时导出数据、本地授权文件、.env、密钥、日志、数据库备份

## 部署提醒

1. 宝塔命令部署入口：\`scripts/deploy/baota/deploy.sh\`。
2. 全新空数据库初始化：\`scripts/deploy/baota/init-database.sh\`，老客户禁止执行。
3. 客户部署后再放入授权文件：\`server/licenses/*.license\`。
4. 老客户只补星流短链可执行：\`server/sql/patch_2026_0609_seo_xingliu_redirect.sql\`。
5. 客户站不要配置签发端密钥，不要开启本地自签：\`UIED_ENABLE_LOCAL_LICENSE_SIGN=false\`。
6. 发包前可执行：\`node scripts/release-doctor.js --scan-release-archives\`。
EOF
}

# 覆盖源码包根安装说明，避免客户被旧开发文档或签发端密钥说明误导。
write_customer_install_docs() {
  cat > "$STAGE_DIR/INSTALL.md" <<EOF
# UIED-NAV ${VERSION} 客户安装入口

本文件是客户源码包的安装入口。源码内历史开发文档仅供研发参考，宝塔部署请以 \`docs/部署文档/宝塔命令行部署-1.1.3.md\` 为准。

## 快速步骤

1. 解压源码包：\`tar -xzf uied-nav-${VERSION}-customer-source.tgz\`。
2. 创建全新 MySQL 数据库，字符集使用 \`utf8mb4\`。
3. 首次执行部署命令生成环境变量模板：\`./scripts/deploy/baota/deploy.sh --domain 你的域名\`。
4. 填写 \`/www/wwwroot/你的域名/shared/uied-api.env\` 后，执行全新数据库初始化脚本。
5. 再次执行部署命令，脚本会安装后端依赖、同步预构建前后台并启动 PM2。
6. 将生成的 \`deploy/uied-nav.nginx.conf\` 应用到宝塔站点，检查后重载 Nginx。

> \`server/sql/install.sql\` 包含 DROP TABLE。老客户升级禁止运行数据库初始化脚本，只执行版本对应补丁。

## 授权说明

- 通用客户源码包不包含真实 \`.license\` 文件。
- 客户部署后通过后台授权中心激活授权码，或按交付约定放入正式授权文件。
- 客户站必须保持 \`UIED_ENABLE_LOCAL_LICENSE_SIGN=false\`。
- 客户站不要配置签发端密钥；签发密钥只属于授权中心，不属于客户站部署参数。

## 安全边界

- 本包已排除本地授权、\`.env\`、本机 \`config.prod.js/config.local.js\`、密钥、日志、根目录 \`data/\`、运行时导出 JSON 和数据库备份。
- 如果客户已有正式数据，执行 SQL 前必须先备份数据库。
EOF
}

# 创建 tgz 包和 sha256 校验文件。
create_archive() {
  local package_name
  local sha_name
  package_name="$(basename "$PACKAGE_FILE")"
  sha_name="$(basename "$SHA_FILE")"
  log_info "创建客户源码包: $PACKAGE_FILE"
  mkdir -p "$OUTPUT_DIR"
  tar -czf "$PACKAGE_FILE" -C "$WORK_DIR" "$PACKAGE_ROOT"
  (
    cd "$OUTPUT_DIR"
    shasum -a 256 "$package_name" > "$sha_name"
  )
}

# 检查归档文件内是否仍包含敏感授权、本地配置或数据库备份文件。
verify_archive_safe() {
  local list_file
  list_file="$WORK_DIR/archive-list.txt"
  tar -tzf "$PACKAGE_FILE" > "$list_file"

  if grep -E '(^|/)[^/]+\.license$|(^|/)customer-license\.json$|(^|/)\.env($|\.)|(^|/)[^/]+\.(pem|key)$|(^|/)licenses?/|/server/server/config/config\.(local|prod)\.js$|(^|/)\.(workbuddy|codex)/|(^|/)项目检查报告-' "$list_file" >/dev/null; then
    log_err "客户包内仍发现授权文件、运行时配置、环境变量或密钥风险："
    grep -E '(^|/)[^/]+\.license$|(^|/)customer-license\.json$|(^|/)\.env($|\.)|(^|/)[^/]+\.(pem|key)$|(^|/)licenses?/|/server/server/config/config\.(local|prod)\.js$|(^|/)\.(workbuddy|codex)/|(^|/)项目检查报告-' "$list_file" | head -n 20
    exit 1
  fi

  if grep -E '^[^/]+/data/|^[^/]+/server/server/exports/[^/]+\.json$|(^|/)([^/]*mysql_backup[^/]*|[^/]*backup[^/]*|[^/]*dump[^/]*|[^/]*mysql_data[^/]*|uied_nav_prod_[^/]*)\.sql(\.gz)?$|(^|/)export_[0-9]{8}[^/]*\.json$' "$list_file" >/dev/null; then
    log_err "客户包内仍发现本地数据备份或导出文件风险："
    grep -E '^[^/]+/data/|^[^/]+/server/server/exports/[^/]+\.json$|(^|/)([^/]*mysql_backup[^/]*|[^/]*backup[^/]*|[^/]*dump[^/]*|[^/]*mysql_data[^/]*|uied_nav_prod_[^/]*)\.sql(\.gz)?$|(^|/)export_[0-9]{8}[^/]*\.json$' "$list_file" | head -n 20
    exit 1
  fi
  log_ok "归档安全检查通过：未发现授权文件、运行时配置、customer-license.json、.env、pem/key、数据库备份、运行时导出数据"
}

# 主流程入口。
main() {
  parse_args "$@"
  check_dependencies
  mkdir -p "$OUTPUT_DIR"
  trap cleanup_workdir EXIT
  cleanup_workdir
  sync_source_to_stage
  write_package_manifest
  write_customer_install_docs
  create_archive
  verify_archive_safe
  cleanup_workdir
  log_ok "客户源码包已生成: $PACKAGE_FILE"
  log_ok "SHA256: $SHA_FILE"
}

main "$@"
