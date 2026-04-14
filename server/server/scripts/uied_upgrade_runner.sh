#!/usr/bin/env bash
# shellcheck shell=bash

set -euo pipefail

UIED_FRONTEND_DEPLOY_DIR="${UIED_FRONTEND_DEPLOY_DIR:-}"
UIED_ADMIN_DEPLOY_DIR="${UIED_ADMIN_DEPLOY_DIR:-}"
UIED_BACKEND_DEPLOY_DIR="${UIED_BACKEND_DEPLOY_DIR:-}"
UIED_HEALTHCHECK_URL="${UIED_HEALTHCHECK_URL:-}"
UIED_RESTART_MODE="${UIED_RESTART_MODE:-none}"
UIED_APPLY_DB_PATCH="${UIED_APPLY_DB_PATCH:-1}"
UIED_DB_HOST="${UIED_DB_HOST:-127.0.0.1}"
UIED_DB_PORT="${UIED_DB_PORT:-3306}"
UIED_DB_USER="${UIED_DB_USER:-}"
UIED_DB_PASSWORD="${UIED_DB_PASSWORD:-}"
UIED_DB_NAME="${UIED_DB_NAME:-}"

##
# 输出日志（stdout 由 Node 进程统一写入任务日志文件）
##
log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

##
# JSON 字符串转义（仅用于结果文件）
##
json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\r//g; :a;N;$!ba;s/\n/\\n/g'
}

##
# 写入升级结果文件
##
write_result() {
  local status="$1"
  local phase="$2"
  local error_message="$3"
  local rollback_status="$4"
  local rollback_message="$5"
  RESULT_WRITTEN=1
  mkdir -p "$(dirname "$UIED_RESULT_FILE")"
  cat >"$UIED_RESULT_FILE" <<EOF
{"status":"$(json_escape "$status")","phase":"$(json_escape "$phase")","backupFrontendPath":"$(json_escape "$BACKUP_FRONTEND_FILE")","backupAdminPath":"$(json_escape "$BACKUP_ADMIN_FILE")","backupBackendPath":"$(json_escape "$BACKUP_BACKEND_FILE")","backupDbPath":"$(json_escape "$BACKUP_DB_FILE")","rollbackStatus":"$(json_escape "$rollback_status")","rollbackMessage":"$(json_escape "$rollback_message")","errorMessage":"$(json_escape "$error_message")"}
EOF
}

##
# 校验路径是否存在越界风险（禁止绝对路径与 ..）
##
is_unsafe_tar_entry() {
  local entry="$1"
  if [[ -z "$entry" ]]; then
    return 1
  fi
  if [[ "$entry" == /* ]]; then
    return 0
  fi
  if [[ "$entry" =~ (^|/)\.\.($|/) ]]; then
    return 0
  fi
  return 1
}

##
# 校验 tgz 包内文件路径安全性，防止 Zip Slip 覆盖系统文件
##
check_tgz_entry_safety() {
  local tgz_file="$1"
  while IFS= read -r entry; do
    if is_unsafe_tar_entry "$entry"; then
      log "检测到不安全压缩路径: $entry"
      return 1
    fi
  done < <(tar -tzf "$tgz_file")
  return 0
}

##
# 使用 tgz 覆盖部署目标目录（固定流程，不接受外部命令）
##
deploy_tgz_to_dir() {
  local package_file="$1"
  local target_dir="$2"
  local stage_name="$3"
  local preserve_uploads="${4:-0}"
  if [[ ! -f "$package_file" ]]; then
    log "$stage_name: 未提供对应包，跳过"
    return 0
  fi
  if [[ -z "$target_dir" || "$target_dir" == "/" ]]; then
    log "$stage_name: 目标目录非法"
    return 1
  fi
  check_tgz_entry_safety "$package_file"
  local tmp_extract="$UIED_TEMP_DIR/extract_${UIED_TASK_NO}_${stage_name}"
  rm -rf "$tmp_extract"
  mkdir -p "$tmp_extract" "$target_dir"
  tar -xzf "$package_file" -C "$tmp_extract"
  if command -v rsync >/dev/null 2>&1; then
    if [[ "$preserve_uploads" == "1" ]]; then
      rsync -a --delete --exclude 'app/public/uploads/' "$tmp_extract"/ "$target_dir"/
    else
      rsync -a --delete "$tmp_extract"/ "$target_dir"/
    fi
  else
    local preserved_uploads_tmp="$UIED_TEMP_DIR/preserved_uploads_${UIED_TASK_NO}"
    rm -rf "$preserved_uploads_tmp"
    if [[ "$preserve_uploads" == "1" && -d "$target_dir/app/public/uploads" ]]; then
      mkdir -p "$preserved_uploads_tmp"
      cp -a "$target_dir/app/public/uploads" "$preserved_uploads_tmp/uploads"
    fi
    find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a "$tmp_extract"/. "$target_dir"/
    if [[ "$preserve_uploads" == "1" && -d "$preserved_uploads_tmp/uploads" ]]; then
      mkdir -p "$target_dir/app/public"
      rm -rf "$target_dir/app/public/uploads"
      mv "$preserved_uploads_tmp/uploads" "$target_dir/app/public/uploads"
    fi
  fi
  log "$stage_name: 部署完成 -> $target_dir"
}

##
# 备份目录为 tgz 文件（用于失败回滚）
##
backup_dir_to_tgz() {
  local source_dir="$1"
  local backup_file="$2"
  if [[ -z "$source_dir" || ! -d "$source_dir" ]]; then
    return 0
  fi
  mkdir -p "$(dirname "$backup_file")"
  tar -czf "$backup_file" -C "$source_dir" .
  log "目录备份完成: $source_dir -> $backup_file"
}

##
# 从 tgz 文件恢复目录（回滚使用）
##
restore_dir_from_tgz() {
  local backup_file="$1"
  local target_dir="$2"
  if [[ ! -f "$backup_file" || -z "$target_dir" || "$target_dir" == "/" ]]; then
    return 0
  fi
  mkdir -p "$target_dir"
  find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  tar -xzf "$backup_file" -C "$target_dir"
  log "目录回滚完成: $target_dir"
}

##
# 数据库备份（gzip）
##
backup_database() {
  if [[ -z "$UIED_DB_NAME" || -z "$UIED_DB_USER" ]]; then
    log "数据库参数缺失，跳过数据库备份"
    return 0
  fi
  if ! command -v mysqldump >/dev/null 2>&1; then
    log "未安装 mysqldump，无法执行数据库备份"
    return 1
  fi
  mkdir -p "$(dirname "$BACKUP_DB_FILE")"
  MYSQL_PWD="$UIED_DB_PASSWORD" mysqldump \
    -h "$UIED_DB_HOST" \
    -P "$UIED_DB_PORT" \
    -u "$UIED_DB_USER" \
    --single-transaction \
    --quick \
    "$UIED_DB_NAME" | gzip -c >"$BACKUP_DB_FILE"
  log "数据库备份完成: $BACKUP_DB_FILE"
}

##
# 数据库回滚
##
restore_database() {
  if [[ ! -f "$BACKUP_DB_FILE" ]]; then
    return 0
  fi
  if ! command -v mysql >/dev/null 2>&1; then
    log "未安装 mysql 客户端，数据库回滚失败"
    return 1
  fi
  gunzip -c "$BACKUP_DB_FILE" | MYSQL_PWD="$UIED_DB_PASSWORD" mysql \
    -h "$UIED_DB_HOST" \
    -P "$UIED_DB_PORT" \
    -u "$UIED_DB_USER" \
    "$UIED_DB_NAME"
  log "数据库回滚完成"
}

##
# 执行升级 SQL 补丁（仅执行 db/upgrade.sql 与 db/patch/*.sql）
##
apply_db_patch() {
  if [[ "$UIED_APPLY_DB_PATCH" != "1" ]]; then
    log "已关闭数据库补丁执行，跳过"
    return 0
  fi
  if [[ -z "$UIED_DB_NAME" || -z "$UIED_DB_USER" ]]; then
    log "数据库参数缺失，跳过数据库补丁"
    return 0
  fi
  if ! command -v mysql >/dev/null 2>&1; then
    log "未安装 mysql 客户端，无法执行数据库补丁"
    return 1
  fi
  local has_patch=0
  if [[ -f "$WORK_DIR/db/upgrade.sql" ]]; then
    has_patch=1
    log "执行数据库补丁: db/upgrade.sql"
    MYSQL_PWD="$UIED_DB_PASSWORD" mysql \
      -h "$UIED_DB_HOST" \
      -P "$UIED_DB_PORT" \
      -u "$UIED_DB_USER" \
      "$UIED_DB_NAME" <"$WORK_DIR/db/upgrade.sql"
  fi
  if [[ -d "$WORK_DIR/db/patch" ]]; then
    local patch_file
    while IFS= read -r patch_file; do
      [[ -z "$patch_file" ]] && continue
      has_patch=1
      log "执行数据库补丁: ${patch_file#$WORK_DIR/}"
      MYSQL_PWD="$UIED_DB_PASSWORD" mysql \
        -h "$UIED_DB_HOST" \
        -P "$UIED_DB_PORT" \
        -u "$UIED_DB_USER" \
        "$UIED_DB_NAME" <"$patch_file"
    done < <(find "$WORK_DIR/db/patch" -type f -name '*.sql' | sort)
  fi
  if [[ "$has_patch" -eq 0 ]]; then
    log "未找到数据库升级补丁，跳过"
  fi
}

##
# 执行固定重启动作（白名单）
##
run_restart_action() {
  case "$UIED_RESTART_MODE" in
    none)
      log "重启模式: none，跳过重启"
      ;;
    pm2_all)
      command -v pm2 >/dev/null 2>&1 || { log "未安装 pm2"; return 1; }
      pm2 restart all
      log "已执行 pm2 restart all"
      ;;
    pm2_backend)
      command -v pm2 >/dev/null 2>&1 || { log "未安装 pm2"; return 1; }
      pm2 restart uied-server || pm2 restart all
      log "已执行 pm2 backend 重启"
      ;;
    systemd_uied)
      command -v systemctl >/dev/null 2>&1 || { log "未安装 systemctl"; return 1; }
      systemctl restart uied-server
      log "已执行 systemctl restart uied-server"
      ;;
    *)
      log "未知重启模式: $UIED_RESTART_MODE"
      return 1
      ;;
  esac
}

##
# 健康检查
##
run_healthcheck() {
  if [[ -z "$UIED_HEALTHCHECK_URL" ]]; then
    log "未配置健康检查地址，跳过"
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    log "未安装 curl，跳过健康检查"
    return 0
  fi
  curl -fsS --max-time 8 "$UIED_HEALTHCHECK_URL" >/dev/null
  log "健康检查通过: $UIED_HEALTHCHECK_URL"
}

##
# 执行失败后的自动回滚
##
rollback_all() {
  local rollback_message=""
  local rollback_status="success"

  if ! restore_dir_from_tgz "$BACKUP_FRONTEND_FILE" "$UIED_FRONTEND_DEPLOY_DIR"; then
    rollback_status="failed"
    rollback_message="前端目录回滚失败"
  fi
  if ! restore_dir_from_tgz "$BACKUP_ADMIN_FILE" "$UIED_ADMIN_DEPLOY_DIR"; then
    rollback_status="failed"
    rollback_message="${rollback_message};管理后台目录回滚失败"
  fi
  if ! restore_dir_from_tgz "$BACKUP_BACKEND_FILE" "$UIED_BACKEND_DEPLOY_DIR"; then
    rollback_status="failed"
    rollback_message="${rollback_message};后端目录回滚失败"
  fi
  if ! restore_database; then
    rollback_status="failed"
    rollback_message="${rollback_message};数据库回滚失败"
  fi
  write_result "failed" "rollback" "$1" "$rollback_status" "$rollback_message"
}

##
# 兜底错误处理（确保结果文件可回写，便于后台审计）
##
on_unexpected_error() {
  local code="$1"
  if [[ "${RESULT_WRITTEN:-0}" -eq 0 ]]; then
    write_result "failed" "${CURRENT_PHASE:-unknown}" "脚本异常退出（code=${code}）" "none" ""
  fi
  exit "$code"
}

##
# 核心执行流程
##
main() {
  : "${UIED_TASK_NO:?缺少 UIED_TASK_NO}"
  : "${UIED_BUNDLE_FILE:?缺少 UIED_BUNDLE_FILE}"
  : "${UIED_EXPECTED_SHA256:?缺少 UIED_EXPECTED_SHA256}"
  : "${UIED_RESULT_FILE:?缺少 UIED_RESULT_FILE}"
  : "${UIED_BACKUP_DIR:?缺少 UIED_BACKUP_DIR}"
  : "${UIED_TEMP_DIR:?缺少 UIED_TEMP_DIR}"

  mkdir -p "$UIED_BACKUP_DIR" "$UIED_TEMP_DIR"
  BACKUP_FRONTEND_FILE="$UIED_BACKUP_DIR/frontend_${UIED_TASK_NO}.tar.gz"
  BACKUP_ADMIN_FILE="$UIED_BACKUP_DIR/admin_${UIED_TASK_NO}.tar.gz"
  BACKUP_BACKEND_FILE="$UIED_BACKUP_DIR/backend_${UIED_TASK_NO}.tar.gz"
  BACKUP_DB_FILE="$UIED_BACKUP_DIR/db_${UIED_TASK_NO}.sql.gz"
  WORK_DIR="$UIED_TEMP_DIR/work_${UIED_TASK_NO}"

  log "开始执行升级任务: $UIED_TASK_NO"

  CURRENT_PHASE="verify_bundle"
  if [[ ! -f "$UIED_BUNDLE_FILE" ]]; then
    write_result "failed" "verify_bundle" "升级包不存在" "none" ""
    return 1
  fi

  if ! check_tgz_entry_safety "$UIED_BUNDLE_FILE"; then
    write_result "failed" "verify_bundle" "升级包包含不安全路径，已拒绝执行" "none" ""
    return 1
  fi

  local actual_sha256
  actual_sha256="$(shasum -a 256 "$UIED_BUNDLE_FILE" | awk '{print $1}')"
  if [[ "$actual_sha256" != "$UIED_EXPECTED_SHA256" ]]; then
    write_result "failed" "verify_bundle" "升级包 SHA256 校验失败" "none" ""
    return 1
  fi
  log "升级包 SHA256 校验通过"

  CURRENT_PHASE="backup"
  backup_dir_to_tgz "$UIED_FRONTEND_DEPLOY_DIR" "$BACKUP_FRONTEND_FILE"
  backup_dir_to_tgz "$UIED_ADMIN_DEPLOY_DIR" "$BACKUP_ADMIN_FILE"
  backup_dir_to_tgz "$UIED_BACKEND_DEPLOY_DIR" "$BACKUP_BACKEND_FILE"
  if ! backup_database; then
    write_result "failed" "backup" "数据库备份失败，升级已中止" "none" ""
    return 1
  fi

  CURRENT_PHASE="unpack"
  rm -rf "$WORK_DIR"
  mkdir -p "$WORK_DIR"
  tar -xzf "$UIED_BUNDLE_FILE" -C "$WORK_DIR"

  if [[ -f "$WORK_DIR/checksums.sha256" ]]; then
    (cd "$WORK_DIR" && shasum -a 256 -c checksums.sha256)
    log "升级包内部 checksums.sha256 校验通过"
  else
    log "未发现 checksums.sha256，继续执行（仅已校验外层包）"
  fi

  CURRENT_PHASE="deploy"
  set +e
  deploy_tgz_to_dir "$WORK_DIR/frontend-site.tgz" "$UIED_FRONTEND_DEPLOY_DIR" "frontend"
  local frontend_code=$?
  deploy_tgz_to_dir "$WORK_DIR/admin-static.tgz" "$UIED_ADMIN_DEPLOY_DIR" "admin"
  local admin_code=$?
  deploy_tgz_to_dir "$WORK_DIR/backend-server.tgz" "$UIED_BACKEND_DEPLOY_DIR" "backend" "1"
  local backend_code=$?
  if [[ "$frontend_code" -ne 0 || "$admin_code" -ne 0 || "$backend_code" -ne 0 ]]; then
    rollback_all "升级包部署阶段失败"
    return 1
  fi

  CURRENT_PHASE="db_patch"
  apply_db_patch
  local patch_code=$?
  if [[ "$patch_code" -ne 0 ]]; then
    rollback_all "数据库补丁执行失败"
    return 1
  fi

  CURRENT_PHASE="restart"
  run_restart_action
  local restart_code=$?
  if [[ "$restart_code" -ne 0 ]]; then
    rollback_all "重启服务失败"
    return 1
  fi

  CURRENT_PHASE="healthcheck"
  run_healthcheck
  local health_code=$?
  set -e

  if [[ "$health_code" -ne 0 ]]; then
    rollback_all "健康检查失败"
    return 1
  fi

  CURRENT_PHASE="done"
  write_result "success" "done" "" "none" ""
  log "升级任务执行完成: $UIED_TASK_NO"
  return 0
}

BACKUP_FRONTEND_FILE=""
BACKUP_ADMIN_FILE=""
BACKUP_BACKEND_FILE=""
BACKUP_DB_FILE=""
WORK_DIR=""
CURRENT_PHASE="init"
RESULT_WRITTEN=0
trap 'on_unexpected_error $?' ERR

main "$@"
