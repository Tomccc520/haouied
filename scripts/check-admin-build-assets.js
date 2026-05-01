#!/usr/bin/env node
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-05-02
 * @description 检查后台构建入口引用的静态资源是否完整，避免客户部署后 /admin 资源 404。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const adminDistRoot = path.join(projectRoot, 'server', 'frontend');
const indexHtmlPath = path.join(adminDistRoot, 'index.html');

/**
 * 从 HTML 内容中提取 /admin/assets 下的静态资源路径。
 * @param {string} html HTML 文本
 * @return {string[]} 去重后的资源相对路径
 */
function extractAdminAssets(html) {
  const matches = [...String(html || '').matchAll(/\/admin\/(assets\/[^"'?#]+)/g)];
  return Array.from(new Set(matches.map(match => match[1]).filter(Boolean)));
}

/**
 * 校验后台构建产物是否完整，并输出机器可读结果。
 */
function main() {
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(JSON.stringify({ ok: false, message: 'server/frontend/index.html 不存在' }, null, 2));
    process.exit(1);
  }

  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  const assets = extractAdminAssets(html);
  const missing = assets.filter(asset => !fs.existsSync(path.join(adminDistRoot, asset)));
  const result = {
    ok: missing.length === 0,
    indexHtml: path.relative(projectRoot, indexHtmlPath),
    assetCount: assets.length,
    missing,
  };

  const output = JSON.stringify(result, null, 2);
  if (missing.length > 0) {
    console.error(output);
    process.exit(1);
  }
  console.log(output);
}

main();
