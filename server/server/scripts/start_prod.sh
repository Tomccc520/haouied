#!/usr/bin/env sh
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-04-18

set -eu

ensure_runtime_env() {
  # 函数说明：未显式传入时默认注入生产环境变量，避免容器误跑到 development。
  NODE_ENV="${NODE_ENV:-production}"
  EGG_SERVER_ENV="${EGG_SERVER_ENV:-prod}"
  export NODE_ENV
  export EGG_SERVER_ENV
}

start_server() {
  # 函数说明：使用既有进程标题启动 Egg 守护进程，保持与 stop 脚本兼容。
  egg-scripts start --daemon --title=egg-server-vue-admin-serve
}

main() {
  # 函数说明：启动入口，先补齐运行时环境，再拉起服务。
  ensure_runtime_env
  start_server
}

main "$@"
