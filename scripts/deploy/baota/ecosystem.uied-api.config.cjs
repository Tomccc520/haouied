/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-08-01
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 解析部署环境变量文件，避免把客户密码直接写入 PM2 配置。
 * @param {string} filePath 环境变量文件绝对路径
 * @returns {Record<string, string>}
 */
function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).reduce((env, line) => {
    const normalized = line.trim().replace(/^export\s+/, '');
    if (!normalized || normalized.startsWith('#')) return env;

    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex <= 0) return env;

    const key = normalized.slice(0, separatorIndex).trim();
    let value = normalized.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
    return env;
  }, {});
}

/**
 * 构建支持任意客户目录的 PM2 应用配置。
 * @returns {Array<Record<string, unknown>>}
 */
function buildApps() {
  const backendDir = process.env.UIED_BACKEND_DIR
    ? path.resolve(process.env.UIED_BACKEND_DIR)
    : path.resolve(__dirname, '../../../server/server');
  const envFile = process.env.UIED_API_ENV_FILE
    ? path.resolve(process.env.UIED_API_ENV_FILE)
    : path.resolve(backendDir, '../../../shared/uied-api.env');
  const runtimeEnv = {
    ...loadEnvFile(envFile),
    NODE_ENV: 'production',
    EGG_SERVER_ENV: 'prod',
  };

  return [
    {
      name: 'uied-api',
      cwd: backendDir,
      script: path.join(backendDir, 'node_modules/egg-scripts/bin/egg-scripts.js'),
      args: 'start --title=uied-api',
      interpreter: process.execPath,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      kill_timeout: 10000,
      env: runtimeEnv,
    },
  ];
}

module.exports = {
  apps: buildApps(),
};
