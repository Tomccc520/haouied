#!/bin/bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-25

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$ROOT_DIR/VERSION")"
HOTFIX_NAME="admin-static"
OUTPUT_DIR="$ROOT_DIR/release/客户部署包"
WORK_DIR=""
PACKAGE_FILE=""
SHA_FILE=""

# 输出构建日志。
log() {
  printf '[ADMIN-HOTFIX] %s\n' "$1"
}

# 输出错误并终止构建。
fail() {
  printf '[ADMIN-HOTFIX][ERR] %s\n' "$1" >&2
  exit 1
}

# 打印脚本帮助。
print_help() {
  cat <<EOF
UIED-NAV 后台静态热修包构建脚本

用法:
  ./scripts/build-admin-hotfix-package.sh --name banner-html [选项]

选项:
  --name banner-html    热修标识，只允许小写字母、数字和连字符
  --version ${VERSION}       版本号，必须与 VERSION 一致
  --output /abs/path    输出目录，默认 release/客户部署包
  -h, --help            显示帮助
EOF
}

# 解析命令行参数。
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)
        HOTFIX_NAME="${2:-}"
        shift 2
        ;;
      --version)
        local requested_version="${2:-}"
        if [[ "$requested_version" != "$VERSION" ]]; then
          fail "指定版本 ${requested_version} 与 VERSION=${VERSION} 不一致"
        fi
        shift 2
        ;;
      --output)
        OUTPUT_DIR="${2:-}"
        shift 2
        ;;
      -h|--help)
        print_help
        exit 0
        ;;
      *)
        fail "未知参数：$1"
        ;;
    esac
  done

  if [[ ! "$HOTFIX_NAME" =~ ^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$ ]]; then
    fail "非法热修标识：$HOTFIX_NAME"
  fi
}

# 清理本次热修包临时目录。
cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" && "$WORK_DIR" == "$OUTPUT_DIR"/.admin-hotfix-work.* ]]; then
    rm -rf "$WORK_DIR"
  fi
}

# 检查构建依赖和后台产物。
check_dependencies() {
  local command_name
  for command_name in rsync tar shasum gzip strings; do
    command -v "$command_name" >/dev/null 2>&1 || fail "缺少命令：$command_name"
  done
  [[ -f "$ROOT_DIR/server/frontend/index.html" ]] || fail "缺少后台构建产物 server/frontend/index.html"
}

# 生成带备份和入口校验的线上部署脚本。
write_deploy_script() {
  cat > "$WORK_DIR/deploy.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="${1:-$PWD}"
PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ADMIN="$PACKAGE_ROOT/admin"
TARGET_ADMIN="$SITE_ROOT/admin"
DOMAIN="$(basename "$SITE_ROOT")"
BACKUP_ROOT="/www/backup/$DOMAIN/$(date +%Y%m%d_%H%M%S)-admin-hotfix"

# 校验修复包和正式站点目录，避免部署到错误路径。
test -f "$SOURCE_ADMIN/index.html" || {
  echo "错误：修复包缺少 admin/index.html"
  exit 1
}
test -d "$SITE_ROOT" || {
  echo "错误：站点目录不存在：$SITE_ROOT"
  exit 1
}
command -v rsync >/dev/null 2>&1 || {
  echo "错误：服务器未安装 rsync"
  exit 1
}

# 先备份当前后台，再同步新版静态资源。
mkdir -p "$BACKUP_ROOT/admin" "$TARGET_ADMIN"
rsync -a "$TARGET_ADMIN/" "$BACKUP_ROOT/admin/"
rsync -a --delete "$SOURCE_ADMIN/" "$TARGET_ADMIN/"

# 校验后台入口引用的主资源已经部署完整。
ENTRY_ASSET="$(sed -n 's#.*src="/admin/\([^"]*\)".*#\1#p' "$TARGET_ADMIN/index.html" | head -n 1)"
test -n "$ENTRY_ASSET" && test -f "$TARGET_ADMIN/$ENTRY_ASSET" || {
  echo "错误：后台入口资源校验失败，备份位于：$BACKUP_ROOT"
  exit 1
}

echo "后台静态热修部署完成。"
echo "备份目录：$BACKUP_ROOT"
echo "后台入口资源：$ENTRY_ASSET"
echo "无需重启 Docker，也无需执行 npm install。"
SH
  chmod +x "$WORK_DIR/deploy.sh"
}

# 写入热修包部署说明。
write_readme() {
  cat > "$WORK_DIR/README.txt" <<EOF
UIED-NAV ${VERSION} 后台静态热修包：${HOTFIX_NAME}

部署：
cd /www/wwwroot/你的域名
HOTFIX=/tmp/uied-admin-hotfix-\$(date +%Y%m%d_%H%M%S)
mkdir -p "\$HOTFIX"
tar -xzf $(basename "$PACKAGE_FILE") -C "\$HOTFIX"
bash "\$HOTFIX/deploy.sh" /www/wwwroot/你的域名

本包只替换 admin/，不会修改前台、后端、数据库、授权和上传文件。
EOF
}

# 创建不携带 macOS 扩展属性的热修包。
create_package() {
  mkdir -p "$OUTPUT_DIR"
  WORK_DIR="$(mktemp -d "$OUTPUT_DIR/.admin-hotfix-work.XXXXXX")"
  PACKAGE_FILE="$OUTPUT_DIR/uied-nav-${VERSION}-hotfix-${HOTFIX_NAME}.tgz"
  SHA_FILE="$PACKAGE_FILE.sha256"
  trap cleanup EXIT

  mkdir -p "$WORK_DIR/admin"
  rsync -a --delete \
    --exclude '.DS_Store' \
    --exclude '._*' \
    --exclude '__MACOSX/' \
    --exclude '.AppleDouble/' \
    "$ROOT_DIR/server/frontend/" "$WORK_DIR/admin/"
  if command -v xattr >/dev/null 2>&1; then
    xattr -cr "$WORK_DIR"
  fi

  write_deploy_script
  write_readme
  COPYFILE_DISABLE=1 tar --no-xattrs -czf "$PACKAGE_FILE" -C "$WORK_DIR" .
  (
    cd "$OUTPUT_DIR"
    shasum -a 256 "$(basename "$PACKAGE_FILE")" > "$(basename "$SHA_FILE")"
  )
}

# 检查归档入口、macOS 文件和 PAX 扩展属性。
verify_package() {
  local archive_list="$WORK_DIR/archive-list.txt"
  local metadata_hits="$WORK_DIR/macos-metadata.txt"
  local entry_asset

  tar -tzf "$PACKAGE_FILE" > "$archive_list"
  if grep -E '(^|/)(__MACOSX|\.AppleDouble)(/|$)|(^|/)\._[^/]+$|(^|/)\.DS_Store$' "$archive_list" >/dev/null; then
    fail "热修包包含 macOS 元数据文件"
  fi

  if gzip -dc "$PACKAGE_FILE" | strings | grep -E 'LIBARCHIVE\.xattr|SCHILY\.xattr|com\.apple\.(provenance|quarantine|FinderInfo|ResourceFork)' > "$metadata_hits"; then
    fail "热修包包含 macOS PAX 扩展属性"
  fi

  entry_asset="$(tar -xOf "$PACKAGE_FILE" ./admin/index.html | sed -n 's#.*src="/admin/\([^"]*\)".*#\1#p' | head -n 1)"
  [[ -n "$entry_asset" ]] || fail "无法解析后台入口资源"
  grep -Fx "./admin/$entry_asset" "$archive_list" >/dev/null || fail "后台入口资源未进入热修包"
}

# 执行后台热修包构建。
main() {
  parse_args "$@"
  check_dependencies
  create_package
  verify_package
  cleanup
  trap - EXIT
  log "已生成：$PACKAGE_FILE"
  log "SHA256：$(awk '{print $1}' "$SHA_FILE")"
}

main "$@"
