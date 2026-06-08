#!/usr/bin/env node
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-06-08
 * @description UIED-NAV 客户交付发布自检脚本，检查源码包、后台构建产物与客户初始化文件完整性。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(PROJECT_ROOT, 'docs', 'API', 'reports');
const REPORT_FILE = path.join(REPORT_DIR, 'release_doctor_latest.json');

/**
 * 解析命令行参数，支持 --json-only 控制输出。
 * @param {string[]} argv 命令行参数
 * @returns {Record<string, string|boolean>} 参数对象
 */
function parseArgs(argv = []) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const raw = String(argv[i] || '');
    if (!raw.startsWith('--')) continue;
    const key = raw.replace(/^--/, '');
    const next = argv[i + 1];
    if (!next || String(next).startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = String(next);
    i += 1;
  }
  return args;
}

/**
 * 判断路径是否存在。
 * @param {string} targetPath 目标路径
 * @returns {boolean} 是否存在
 */
function exists(targetPath) {
  return fs.existsSync(targetPath);
}

/**
 * 将绝对路径转换成项目内相对路径，便于报告阅读。
 * @param {string} targetPath 目标路径
 * @returns {string} 相对路径
 */
function rel(targetPath) {
  return path.relative(PROJECT_ROOT, targetPath).replace(/\\/g, '/');
}

/**
 * 构造单条检查结果。
 * @param {string} group 检查分组
 * @param {string} key 检查键
 * @param {'pass'|'warn'|'fail'} status 检查状态
 * @param {string} title 标题
 * @param {string} message 说明
 * @param {string} suggestion 建议
 * @returns {Record<string, string>} 检查结果
 */
function makeCheck(group, key, status, title, message, suggestion = '') {
  return { group, key, status, title, message, suggestion };
}

/**
 * 检查关键源码与交付文件是否存在。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkRequiredFiles() {
  const requiredFiles = [
    'server/server/package.json',
    'server/admin/package.json',
    'frontend/package.json',
    'server/sql/install.sql',
    'server/sql/uied_tables.sql',
    'server/sql/customer/starter.sql',
    'server/server/app/controller/uied/deliveryInit.js',
    'server/server/app/service/uied/deliveryInit.js',
    'server/admin/src/views/uied/deliveryInit/index.vue',
    'frontend/src/pages/Changelog/index.tsx',
  ];
  return requiredFiles.map(file => {
    const target = path.join(PROJECT_ROOT, file);
    return exists(target)
      ? makeCheck('files', `file:${file}`, 'pass', file, '文件存在')
      : makeCheck('files', `file:${file}`, 'fail', file, '文件缺失', '请重新打包完整源码后再交付客户。');
  });
}

/**
 * 提取后台 index.html 中引用的 /admin/assets 资源。
 * @param {string} html HTML 内容
 * @returns {string[]} 资源路径列表
 */
function extractAdminAssets(html) {
  const matches = Array.from(String(html || '').matchAll(/\/admin\/(assets\/[^"'?#]+)/g));
  return Array.from(new Set(matches.map(match => match[1]).filter(Boolean)));
}

/**
 * 检查后台构建产物引用是否完整。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkAdminBuildAssets() {
  const adminDistRoot = path.join(PROJECT_ROOT, 'server', 'frontend');
  const indexHtmlPath = path.join(adminDistRoot, 'index.html');
  if (!exists(indexHtmlPath)) {
    return [
      makeCheck(
        'assets',
        'admin:index',
        'fail',
        '后台构建入口',
        'server/frontend/index.html 不存在',
        '请先执行后台构建并把 server/frontend 一并打包。'
      ),
    ];
  }

  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  const assets = extractAdminAssets(html);
  const missing = assets.filter(asset => !exists(path.join(adminDistRoot, asset)));
  if (missing.length > 0) {
    return [
      makeCheck(
        'assets',
        'admin:assets',
        'fail',
        '后台静态资源',
        `发现 ${missing.length} 个构建资源缺失：${missing.slice(0, 5).join(', ')}`,
        '请重新执行后台 build，确保 server/frontend/assets 内 hash 文件和 index.html 匹配。'
      ),
    ];
  }
  return [
    makeCheck(
      'assets',
      'admin:assets',
      'pass',
      '后台静态资源',
      `后台入口引用资源完整，共 ${assets.length} 个资源`
    ),
  ];
}

/**
 * 安全读取 package.json。
 * @param {string} relativePath package.json 相对路径
 * @returns {Record<string, any>|null} package 内容
 */
function readPackage(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8'));
  } catch (error) {
    return null;
  }
}

/**
 * 检查 npm 脚本是否包含交付自检命令。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkPackageScripts() {
  const pkg = readPackage('server/server/package.json');
  if (!pkg) {
    return [
      makeCheck('scripts', 'package:server', 'fail', '后端 package.json', '无法读取后端 package.json'),
    ];
  }
  const scripts = pkg.scripts || {};
  const checks = [];
  checks.push(
    scripts['release:doctor']
      ? makeCheck('scripts', 'script:release-doctor', 'pass', 'release:doctor', '后端已配置客户交付自检命令')
      : makeCheck(
        'scripts',
        'script:release-doctor',
        'fail',
        'release:doctor',
        '后端缺少 release:doctor 命令',
        '请在 server/server/package.json 中配置该命令。'
      )
  );
  checks.push(
    scripts['preflight:commercial']
      ? makeCheck('scripts', 'script:preflight', 'pass', 'preflight:commercial', '商业发布预检命令存在')
      : makeCheck('scripts', 'script:preflight', 'warn', 'preflight:commercial', '商业发布预检命令缺失')
  );
  return checks;
}

/**
 * 检查授权文件交付边界，避免把真实许可证误打进通用源码包。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkLicenseBoundary() {
  const licenseDirs = [
    path.join(PROJECT_ROOT, 'server', 'licenses'),
    path.join(PROJECT_ROOT, 'server', 'server', 'licenses'),
  ];
  const licenseFiles = [];
  licenseDirs.forEach(dir => {
    if (!exists(dir)) return;
    fs.readdirSync(dir)
      .filter(name => /\.license$/i.test(name))
      .forEach(name => licenseFiles.push(path.join(dir, name)));
  });
  if (licenseFiles.length > 0) {
    return [
      makeCheck(
        'license',
        'license:local-files',
        'warn',
        '本地授权文件',
        `检测到 ${licenseFiles.length} 个本地 .license 文件`,
        '通用客户源码包不要包含真实授权文件；客户部署后再放入 server/licenses。'
      ),
    ];
  }
  return [
    makeCheck(
      'license',
      'license:local-files',
      'pass',
      '本地授权文件',
      '未发现真实 .license 文件，适合制作通用源码包'
    ),
  ];
}

/**
 * 检查生产配置示例是否保持环境变量化。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkProductionConfig() {
  const prodConfig = path.join(PROJECT_ROOT, 'server', 'server', 'config', 'config.prod.js');
  if (!exists(prodConfig)) {
    return [
      makeCheck('config', 'config:prod', 'fail', '生产配置', 'config.prod.js 缺失'),
    ];
  }
  const content = fs.readFileSync(prodConfig, 'utf8');
  const checks = [];
  checks.push(
    /process\.env\.UIED_DB_PASSWORD/.test(content)
      ? makeCheck('config', 'config:db-env', 'pass', '数据库密码配置', '生产数据库密码支持环境变量')
      : makeCheck('config', 'config:db-env', 'warn', '数据库密码配置', '未检测到 UIED_DB_PASSWORD 环境变量读取')
  );
  checks.push(
    /UIED_UPLOADS_ABS_DIR/.test(content)
      ? makeCheck('config', 'config:uploads-env', 'pass', '上传目录配置', '生产上传目录支持独立环境变量')
      : makeCheck('config', 'config:uploads-env', 'warn', '上传目录配置', '未检测到 UIED_UPLOADS_ABS_DIR')
  );
  return checks;
}

/**
 * 生成汇总信息。
 * @param {Array<Record<string, string>>} checks 检查结果
 * @returns {Record<string, any>} 汇总
 */
function buildSummary(checks) {
  const pass = checks.filter(item => item.status === 'pass').length;
  const warn = checks.filter(item => item.status === 'warn').length;
  const fail = checks.filter(item => item.status === 'fail').length;
  const score = Math.max(0, 100 - fail * 25 - warn * 8);
  return {
    pass,
    warn,
    fail,
    total: checks.length,
    score,
    level: fail > 0 ? 'risk' : (warn > 2 ? 'attention' : 'ready'),
  };
}

/**
 * 写入自检报告文件。
 * @param {Record<string, any>} report 报告对象
 */
function writeReport(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
}

/**
 * 执行发布自检。
 */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const checks = [
    ...checkRequiredFiles(),
    ...checkAdminBuildAssets(),
    ...checkPackageScripts(),
    ...checkLicenseBoundary(),
    ...checkProductionConfig(),
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    summary: buildSummary(checks),
    checks,
    commands: {
      backend: 'cd server/server && npm run release:doctor',
      staticScript: 'node scripts/release-doctor.js',
      starterSql: 'mysql --default-character-set=utf8mb4 -u <user> -p <database> < server/sql/customer/starter.sql',
    },
    reportFile: rel(REPORT_FILE),
  };
  writeReport(report);

  const output = JSON.stringify(report, null, 2);
  if (args['json-only']) {
    process.stdout.write(output + '\n');
  } else {
    console.log(output);
    console.log(`\n自检报告已写入：${rel(REPORT_FILE)}`);
  }
  process.exit(report.summary.fail > 0 ? 1 : 0);
}

main();
