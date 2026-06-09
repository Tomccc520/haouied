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
const childProcess = require('child_process');

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
 * 安全读取项目内文本文件。
 * @param {string} relativePath 文件相对路径
 * @returns {string} 文件内容
 */
function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
  } catch (error) {
    return '';
  }
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
 * 递归收集目录内匹配文件，避免真实授权文件藏在子目录里被打包。
 * @param {string} dir 起始目录
 * @param {(filePath:string)=>boolean} predicate 匹配函数
 * @param {string[]} output 收集结果
 * @returns {string[]} 文件列表
 */
function collectFilesRecursive(dir, predicate, output = []) {
  if (!exists(dir)) return output;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return output;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFilesRecursive(target, predicate, output);
      return;
    }
    if (entry.isFile() && predicate(target)) {
      output.push(target);
    }
  });
  return output;
}

/**
 * 去重并保持原始顺序。
 * @param {string[]} items 原始列表
 * @returns {string[]} 去重列表
 */
function uniqueList(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

/**
 * 判断授权字段是否仍是占位模板值。
 * @param {any} value 待检测字段
 * @returns {boolean} 是否为安全占位值
 */
function isPlaceholderLicenseValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return true;
  return /REPLACE-ME|YOUR_|EXAMPLE|DEMO|PLACEHOLDER|待填写|示例/i.test(text);
}

/**
 * 解析客户授权 JSON 文本里的敏感字段风险。
 * @param {string} content 授权 JSON 内容
 * @returns {string[]} 风险说明列表
 */
function detectCustomerLicenseJsonContentRisks(content) {
  const risks = [];
  try {
    const data = JSON.parse(content);
    const licenseKey = data.licenseKey || data.license_key || '';
    const signature = data.signature || '';
    const domains = data.domainWhitelist || data.domain_whitelist || data.domains || [];
    if (!isPlaceholderLicenseValue(licenseKey)) risks.push('包含真实授权码');
    if (!isPlaceholderLicenseValue(signature) && /^[a-f0-9]{32,}$/i.test(String(signature))) risks.push('包含授权签名');
    if (Array.isArray(domains) && domains.some(item => !isPlaceholderLicenseValue(item))) risks.push('包含域名白名单');
    [ 'customerName', 'companyName', 'contactEmail' ].forEach(key => {
      if (!isPlaceholderLicenseValue(data[key])) risks.push(`包含客户字段 ${key}`);
    });
  } catch (error) {
    if (/"signature"\s*:\s*"[a-f0-9]{32,}"/i.test(content)) risks.push('包含授权签名');
    if (/"licenseKey"\s*:\s*"UIED-(?![^"]*REPLACE-ME)[^"]+"/i.test(content)) risks.push('包含真实授权码');
    if (/"domainWhitelist"\s*:\s*\[\s*"[^"]+"/i.test(content) && !/REPLACE-ME|EXAMPLE|DEMO/i.test(content)) {
      risks.push('包含域名白名单');
    }
  }
  return uniqueList(risks);
}

/**
 * 解析客户授权 JSON 模板里的敏感字段风险。
 * @param {string} filePath 授权 JSON 路径
 * @returns {string[]} 风险说明列表
 */
function detectCustomerLicenseJsonRisks(filePath) {
  try {
    return detectCustomerLicenseJsonContentRisks(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return [ '文件无法读取' ];
  }
}

/**
 * 判断文件是否是需要检查的发布压缩包。
 * @param {string} filePath 文件路径
 * @returns {boolean} 是否为发布压缩包
 */
function isReleaseArchive(filePath) {
  return /\.(zip|tgz|tar\.gz|tar)$/i.test(filePath);
}

/**
 * 使用系统工具列出压缩包内部文件。
 * @param {string} filePath 压缩包路径
 * @returns {string[]} 文件列表
 */
function listArchiveEntries(filePath) {
  const lower = filePath.toLowerCase();
  try {
    if (lower.endsWith('.zip')) {
      return childProcess.execFileSync('unzip', [ '-Z1', filePath ], { encoding: 'utf8' })
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);
    }
    if (lower.endsWith('.tgz') || lower.endsWith('.tar.gz')) {
      return childProcess.execFileSync('tar', [ '-tzf', filePath ], { encoding: 'utf8' })
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);
    }
    if (lower.endsWith('.tar')) {
      return childProcess.execFileSync('tar', [ '-tf', filePath ], { encoding: 'utf8' })
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);
    }
  } catch (error) {
    return [];
  }
  return [];
}

/**
 * 读取压缩包内单个文件内容。
 * @param {string} filePath 压缩包路径
 * @param {string} entryName 内部文件路径
 * @returns {string} 文件内容
 */
function readArchiveEntry(filePath, entryName) {
  const lower = filePath.toLowerCase();
  try {
    if (lower.endsWith('.zip')) {
      return childProcess.execFileSync('unzip', [ '-p', filePath, entryName ], { encoding: 'utf8' });
    }
    if (lower.endsWith('.tgz') || lower.endsWith('.tar.gz')) {
      return childProcess.execFileSync('tar', [ '-xOzf', filePath, entryName ], { encoding: 'utf8' });
    }
    if (lower.endsWith('.tar')) {
      return childProcess.execFileSync('tar', [ '-xOf', filePath, entryName ], { encoding: 'utf8' });
    }
  } catch (error) {
    return '';
  }
  return '';
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
 * 检查客户初始化 SQL 是否带上当前运营短链默认值。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkStarterSqlDefaults() {
  const content = readText('server/sql/customer/starter.sql');
  if (!content) {
    return [
      makeCheck(
        'delivery',
        'starter:readable',
        'fail',
        '客户初始化 SQL 默认值',
        '无法读取 server/sql/customer/starter.sql',
        '请确认客户初始化 SQL 已随源码包交付。'
      ),
    ];
  }
  const hasSeoConfig = /['"]seoCenterConfig['"]/.test(content);
  const hasXingliu = /\/xingliu/.test(content)
    && /https:\/\/www\.xingliu\.art\/\?souceid=005903&utm=cg&cgv=dqndprwn2z/.test(content);
  const patchContent = readText('server/sql/patch_2026_0609_seo_xingliu_redirect.sql');
  const hasXingliuPatch = /\/xingliu/.test(patchContent)
    && /INSERT INTO `uied_site_setting`/.test(patchContent)
    && /LOCATE\('\[', `value`, LOCATE\('"redirects"', `value`\)\)/.test(patchContent);
  return [
    hasSeoConfig
      ? makeCheck('delivery', 'starter:seo-config', 'pass', 'SEO 默认配置', 'starter.sql 已包含 seoCenterConfig')
      : makeCheck(
        'delivery',
        'starter:seo-config',
        'warn',
        'SEO 默认配置',
        'starter.sql 未包含 seoCenterConfig',
        '新客户导入后需要手动配置 SEO 中心短链。'
      ),
    hasXingliu
      ? makeCheck('delivery', 'starter:xingliu-shortlink', 'pass', '星流运营短链', 'starter.sql 已内置 /xingliu -> 星流推广链接')
      : makeCheck(
        'delivery',
        'starter:xingliu-shortlink',
        'warn',
        '星流运营短链',
        'starter.sql 未内置 /xingliu 短链',
        '如需默认带运营短链，请补齐 seoCenterConfig.redirects。'
      ),
    hasXingliuPatch
      ? makeCheck('delivery', 'patch:xingliu-shortlink', 'pass', '老客户短链补丁', '已提供 /xingliu 短链补丁 SQL，老客户可选择执行')
      : makeCheck(
        'delivery',
        'patch:xingliu-shortlink',
        'warn',
        '老客户短链补丁',
        '未检测到 /xingliu 短链补丁 SQL',
        '建议提供单独 patch，避免用 starter.sql 覆盖已有客户配置。'
      ),
  ];
}

/**
 * 检查客户包导出边界，避免默认导出真实授权或通过 GET 泄露敏感查询参数。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkDeliveryExportBoundary() {
  const serviceContent = readText('server/server/app/service/uied/deliveryInit.js');
  const adminApiContent = readText('server/admin/src/api/uied.ts');
  const adminPageContent = readText('server/admin/src/views/uied/deliveryInit/index.vue');
  const defaultLicenseSafe = /includeLicense:\s*this\.parseBoolean\(input\.includeLicense,\s*false\)/.test(serviceContent)
    && /buildExportLicenseSnapshot/.test(serviceContent);
  const adminPostExport = /request\.post\(\{\s*url:\s*['"]\/uied\/delivery\/package\/export['"]/.test(adminApiContent);
  const adminExplicitNoLicense = /includeLicense:\s*false/.test(adminPageContent)
    && /includeFeatureOverrides:\s*false/.test(adminPageContent);
  return [
    defaultLicenseSafe
      ? makeCheck('delivery', 'export:license-safe-default', 'pass', '客户包授权脱敏', '导出客户包默认不包含真实授权码与签名')
      : makeCheck(
        'delivery',
        'export:license-safe-default',
        'fail',
        '客户包授权脱敏',
        '导出客户包默认可能包含真实授权码或签名',
        '请将 includeLicense 默认值改为 false，并输出脱敏授权快照。'
      ),
    adminPostExport
      ? makeCheck('delivery', 'export:post', 'pass', '客户包导出请求', '后台导出客户包使用 POST，避免敏感字段进入 URL')
      : makeCheck(
        'delivery',
        'export:post',
        'warn',
        '客户包导出请求',
        '后台导出客户包未使用 POST',
        '建议使用 POST，避免授权码等字段进入浏览器历史、代理日志或 Nginx 访问日志。'
      ),
    adminExplicitNoLicense
      ? makeCheck('delivery', 'export:admin-no-license', 'pass', '后台导出默认项', '后台导出按钮明确不导出授权与功能覆盖')
      : makeCheck(
        'delivery',
        'export:admin-no-license',
        'warn',
        '后台导出默认项',
        '后台导出按钮未显式关闭授权/功能覆盖',
        '请确认通用客户包不带真实授权与客户私有功能开关。'
      ),
  ];
}

/**
 * 检查客户源码包构建脚本是否排除本地数据备份，避免把历史数据库导出交付给客户。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkCustomerSourcePackageScriptBoundary() {
  const scriptContent = readText('scripts/build-customer-source-package.sh');
  if (!scriptContent) {
    return [
      makeCheck(
        'delivery',
        'package-script:data-boundary',
        'fail',
        '客户源码包数据边界',
        '无法读取 scripts/build-customer-source-package.sh',
        '请恢复客户源码包构建脚本后再发包。'
      ),
    ];
  }
  const excludesRootData = /--exclude ['"]\/data\/['"]/.test(scriptContent);
  const excludesBackupSql = /\*mysql_backup\*\.sql/.test(scriptContent)
    && /\*backup\*\.sql/.test(scriptContent)
    && /\*dump\*\.sql/.test(scriptContent)
    && /\*\.sql\.gz/.test(scriptContent);
  const verifiesArchiveData = /\^\[\^\/\]\+\/data\//.test(scriptContent)
    && /mysql_backup/.test(scriptContent)
    && /export_\[0-9\]\{8\}/.test(scriptContent)
    && /server\/server\/exports/.test(scriptContent);
  const excludesRuntimeExports = /--exclude ['"]server\/server\/exports\/\*\.json['"]/.test(scriptContent);
  const writesCustomerInstall = /write_customer_install_docs/.test(scriptContent)
    && /客户站不要配置签发端密钥/.test(scriptContent);
  const writesRelativeSha = /basename "\$PACKAGE_FILE"/.test(scriptContent)
    && /cd "\$OUTPUT_DIR"/.test(scriptContent)
    && /shasum -a 256 "\$package_name" > "\$sha_name"/.test(scriptContent);
  if (excludesRootData && excludesBackupSql && excludesRuntimeExports && verifiesArchiveData && writesCustomerInstall && writesRelativeSha) {
    return [
      makeCheck(
        'delivery',
        'package-script:data-boundary',
        'pass',
        '客户源码包数据边界',
        '构建脚本已排除根目录 data、运行时导出数据与数据库备份，归档后复查，覆盖客户安装入口，并生成相对路径 SHA256'
      ),
    ];
  }
  return [
    makeCheck(
      'delivery',
      'package-script:data-boundary',
      'fail',
      '客户源码包数据边界',
      '构建脚本缺少根目录 data、运行时导出数据、数据库备份、归档复查、客户安装入口或相对路径 SHA256 规则',
      '请确保客户源码包不包含 data/mysql_backup*.sql、server/server/exports/*.json、export_*.json、*_mysql_data_*.sql 等本地数据文件，且校验文件不暴露本机绝对路径。'
    ),
  ];
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
    collectFilesRecursive(dir, filePath => /\.license$/i.test(filePath), licenseFiles);
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
 * 检查客户授权 JSON 模板，避免旧打包链路把已签名授权模板带进通用交付包。
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkCustomerLicenseJsonBoundary() {
  const candidateDirs = [
    path.join(PROJECT_ROOT, 'license'),
    path.join(PROJECT_ROOT, 'licenses'),
    path.join(PROJECT_ROOT, 'release'),
    path.join(PROJECT_ROOT, 'releases'),
    path.join(PROJECT_ROOT, 'dist'),
    path.join(PROJECT_ROOT, 'packages'),
    path.join(PROJECT_ROOT, 'server', 'license'),
    path.join(PROJECT_ROOT, 'server', 'licenses'),
    path.join(PROJECT_ROOT, 'server', 'server', 'license'),
    path.join(PROJECT_ROOT, 'server', 'server', 'licenses'),
  ];
  const jsonFiles = [];
  candidateDirs.forEach(dir => {
    collectFilesRecursive(dir, filePath => path.basename(filePath).toLowerCase() === 'customer-license.json', jsonFiles);
  });
  const uniqueFiles = uniqueList(jsonFiles);
  if (!uniqueFiles.length) {
    return [
      makeCheck('license', 'license:customer-json', 'pass', '客户授权 JSON', '未发现 customer-license.json，通用包无已签名授权模板风险'),
    ];
  }
  const riskItems = uniqueFiles
    .map(filePath => ({ filePath, risks: detectCustomerLicenseJsonRisks(filePath) }))
    .filter(item => item.risks.length > 0);
  if (riskItems.length > 0) {
    return [
      makeCheck(
        'license',
        'license:customer-json',
        'fail',
        '客户授权 JSON',
        `检测到 ${riskItems.length} 个 customer-license.json 含敏感授权字段：${riskItems.slice(0, 3).map(item => `${rel(item.filePath)}(${item.risks.join('/')})`).join(', ')}`,
        '通用客户包只能保留 REPLACE-ME 占位模板；真实授权文件请客户部署后单独放入 server/licenses。'
      ),
    ];
  }
  return [
    makeCheck(
      'license',
      'license:customer-json',
      'warn',
      '客户授权 JSON',
      `发现 ${uniqueFiles.length} 个 customer-license.json，占位字段检查通过`,
      '请确认这些文件仅作为模板交付，不包含真实客户信息。'
    ),
  ];
}

/**
 * 收集需要检查的发布压缩包，避免真实授权被打入 zip/tgz 后绕过文件扫描。
 * @param {boolean} scanReleaseArchives 是否扫描历史 release 目录
 * @returns {string[]} 压缩包路径列表
 */
function collectReleaseArchives(scanReleaseArchives = false) {
  const candidateDirs = scanReleaseArchives
    ? [
      path.join(PROJECT_ROOT, 'release'),
      path.join(PROJECT_ROOT, 'releases'),
      path.join(PROJECT_ROOT, 'dist'),
      path.join(PROJECT_ROOT, 'packages'),
    ]
    : [];
  const archiveFiles = [];
  candidateDirs.forEach(dir => {
    collectFilesRecursive(dir, filePath => isReleaseArchive(filePath), archiveFiles);
  });
  fs.readdirSync(PROJECT_ROOT, { withFileTypes: true }).forEach(entry => {
    const target = path.join(PROJECT_ROOT, entry.name);
    if (entry.isFile() && isReleaseArchive(target)) {
      archiveFiles.push(target);
    }
  });
  return uniqueList(archiveFiles);
}

/**
 * 检查发布压缩包内部是否包含真实授权文件或已签名授权模板。
 * @param {Record<string, boolean>} options 检查选项
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkArchiveLicenseBoundary(options = {}) {
  const archiveFiles = collectReleaseArchives(options.scanReleaseArchives === true);
  if (!archiveFiles.length) {
    return [
      makeCheck(
        'license',
        'license:archive-files',
        'pass',
        '压缩包授权文件',
        options.scanReleaseArchives === true
          ? '未发现待检查的发布压缩包'
          : '未发现根目录发布压缩包；如需深扫 release 目录，请追加 --scan-release-archives'
      ),
    ];
  }

  const riskItems = [];
  const templateItems = [];
  archiveFiles.forEach(archivePath => {
    const entries = listArchiveEntries(archivePath);
    if (!entries.length) {
      riskItems.push(`${rel(archivePath)}(无法读取压缩包目录)`);
      return;
    }
    entries.forEach(entryName => {
      const baseName = path.basename(entryName).toLowerCase();
      if (/\.license$/i.test(baseName)) {
        riskItems.push(`${rel(archivePath)}:${entryName}(包含 .license 文件)`);
        return;
      }
      if (baseName !== 'customer-license.json') return;
      const content = readArchiveEntry(archivePath, entryName);
      if (!content) {
        riskItems.push(`${rel(archivePath)}:${entryName}(无法读取授权模板内容)`);
        return;
      }
      const risks = detectCustomerLicenseJsonContentRisks(content);
      if (risks.length > 0) {
        riskItems.push(`${rel(archivePath)}:${entryName}(${risks.join('/')})`);
        return;
      }
      templateItems.push(`${rel(archivePath)}:${entryName}`);
    });
  });

  if (riskItems.length > 0) {
    return [
      makeCheck(
        'license',
        'license:archive-files',
        'fail',
        '压缩包授权文件',
        `检测到 ${riskItems.length} 个压缩包授权风险：${riskItems.slice(0, 3).join(', ')}`,
        '请重新打包，通用源码包不要包含 .license 或已填写/已签名的 customer-license.json。'
      ),
    ];
  }
  if (templateItems.length > 0) {
    return [
      makeCheck(
        'license',
        'license:archive-files',
        'warn',
        '压缩包授权文件',
        `压缩包内发现 ${templateItems.length} 个 customer-license.json，占位字段检查通过`,
        '请确认这些模板只保留 REPLACE-ME 占位内容。'
      ),
    ];
  }
  return [
    makeCheck(
      'license',
      'license:archive-files',
      'pass',
      '压缩包授权文件',
      `已检查 ${archiveFiles.length} 个压缩包，未发现授权文件风险`
    ),
  ];
}

/**
 * 判断压缩包条目是否属于本地数据备份或导出文件。
 * @param {string} entryName 压缩包内路径
 * @returns {boolean} 是否敏感
 */
function isSensitiveDataArchiveEntry(entryName) {
  const normalized = String(entryName || '').replace(/\\/g, '/');
  const baseName = path.basename(normalized);
  return /^[^/]+\/data\//.test(normalized)
    || /^[^/]+\/server\/server\/exports\/[^/]+\.json$/i.test(normalized)
    || /(^|\/)([^/]*mysql_backup[^/]*|[^/]*backup[^/]*|[^/]*dump[^/]*|[^/]*mysql_data[^/]*|uied_nav_prod_[^/]*)\.sql(\.gz)?$/i.test(normalized)
    || /^export_[0-9]{8}[^/]*\.json$/i.test(baseName);
}

/**
 * 检查发布压缩包内部是否包含本地数据库备份或导出文件。
 * @param {Record<string, boolean>} options 检查选项
 * @returns {Array<Record<string, string>>} 检查结果
 */
function checkArchiveDataBoundary(options = {}) {
  const archiveFiles = collectReleaseArchives(options.scanReleaseArchives === true);
  if (!archiveFiles.length) {
    return [
      makeCheck(
        'delivery',
        'archive:data-files',
        'pass',
        '压缩包本地数据文件',
        options.scanReleaseArchives === true
          ? '未发现待检查的发布压缩包'
          : '未发现根目录发布压缩包；如需深扫 release 目录，请追加 --scan-release-archives'
      ),
    ];
  }

  const riskItems = [];
  archiveFiles.forEach(archivePath => {
    const entries = listArchiveEntries(archivePath);
    if (!entries.length) return;
    entries.forEach(entryName => {
      if (isSensitiveDataArchiveEntry(entryName)) {
        riskItems.push(`${rel(archivePath)}:${entryName}`);
      }
    });
  });

  if (riskItems.length > 0) {
    return [
      makeCheck(
        'delivery',
        'archive:data-files',
        'fail',
        '压缩包本地数据文件',
        `检测到 ${riskItems.length} 个压缩包本地数据文件风险：${riskItems.slice(0, 3).join(', ')}`,
        '请重新打包，通用源码包不要包含根目录 data、数据库备份或历史导出文件。'
      ),
    ];
  }
  return [
    makeCheck(
      'delivery',
      'archive:data-files',
      'pass',
      '压缩包本地数据文件',
      `已检查 ${archiveFiles.length} 个压缩包，未发现本地数据文件风险`
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
  const scanReleaseArchives = args['scan-release-archives'] === true;
  const checks = [
    ...checkRequiredFiles(),
    ...checkAdminBuildAssets(),
    ...checkPackageScripts(),
    ...checkStarterSqlDefaults(),
    ...checkDeliveryExportBoundary(),
    ...checkCustomerSourcePackageScriptBoundary(),
    ...checkLicenseBoundary(),
    ...checkCustomerLicenseJsonBoundary(),
    ...checkArchiveLicenseBoundary({ scanReleaseArchives }),
    ...checkArchiveDataBoundary({ scanReleaseArchives }),
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
      archiveScan: 'node scripts/release-doctor.js --scan-release-archives',
      customerSourcePackage: 'scripts/build-customer-source-package.sh --version 1.1.3',
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
