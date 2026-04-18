/**
 * @file service/uied/upgradeCenter.js
 * @description UIED 后台升级中心服务（安全升级/自动备份/失败回滚/审计日志）
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.1.3
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const md5 = require('md5');
const { spawn } = require('child_process');
const Service = require('egg').Service;
const { dbTablePrefix = 'la_' } = require('../../extend/config');

const UPGRADE_CONFIG_KEY = 'upgradeCenterConfig';
const UPGRADE_TASK_TABLE = 'uied_upgrade_task';
const SUPER_ADMIN_ID = 1;
const DEFAULT_CONFIRM_PHRASE = 'UPGRADE';
const ALLOWED_RESTART_MODES = [ 'none', 'pm2_all', 'pm2_backend', 'systemd_uied' ];
const ALLOWED_BUNDLE_SUFFIX = [ '.tgz', '.tar.gz' ];

class UpgradeCenterService extends Service {
  /**
   * 获取当前系统版本号
   */
  getCurrentVersion() {
    return this.toText(this.app?.config?.version, 'v1.0.0');
  }

  /**
   * 获取升级任务表名
   */
  getTaskTableName() {
    return UPGRADE_TASK_TABLE;
  }

  /**
   * 获取当前秒级时间戳
   */
  now() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 生成升级任务编号
   */
  buildTaskNo() {
    const stamp = Date.now();
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `UPG${stamp}${suffix}`;
  }

  /**
   * 获取升级任务初始化锁名，确保“检查运行中任务 + 创建任务”具备互斥性。
   */
  getStartTaskLockName() {
    return `${dbTablePrefix || 'la_'}uied_upgrade_start_lock`;
  }

  /**
   * 规范化字符串
   */
  toText(value, fallback = '') {
    const text = String(value === undefined || value === null ? fallback : value).trim();
    return text || String(fallback || '');
  }

  /**
   * 规范化整数
   */
  toInt(value, fallback = 0, min = null, max = null) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isInteger(parsed)) return fallback;
    let result = parsed;
    if (typeof min === 'number') result = Math.max(min, result);
    if (typeof max === 'number') result = Math.min(max, result);
    return result;
  }

  /**
   * 规范化布尔值
   */
  parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const text = String(value).trim().toLowerCase();
    if ([ '1', 'true', 'yes', 'y', 'on' ].includes(text)) return true;
    if ([ '0', 'false', 'no', 'n', 'off' ].includes(text)) return false;
    return fallback;
  }

  /**
   * 检查目录状态：用于升级中心概览提示“是否已准备好”
   */
  async inspectDirectoryState(targetPath = '', options = {}) {
    const dirPath = this.toText(targetPath, '');
    const ensureCreate = this.parseBoolean(options.ensureCreate, false);
    const mustExist = this.parseBoolean(options.mustExist, true);
    if (!dirPath) {
      return {
        path: '',
        exists: false,
        writable: false,
        ok: false,
        message: '目录未配置',
      };
    }
    try {
      if (ensureCreate) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }
      const stat = await fs.promises.stat(dirPath);
      if (!stat.isDirectory()) {
        return {
          path: dirPath,
          exists: true,
          writable: false,
          ok: false,
          message: '路径存在但不是目录',
        };
      }
      await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
      return {
        path: dirPath,
        exists: true,
        writable: true,
        ok: true,
        message: '目录可读写',
      };
    } catch (error) {
      return {
        path: dirPath,
        exists: false,
        writable: false,
        ok: mustExist ? false : true,
        message: mustExist ? (error?.message || '目录不可用') : '目录将在任务启动时自动创建',
      };
    }
  }

  /**
   * 获取项目根目录（默认按 server/server -> ../.. 回溯）
   */
  getProjectRootDir() {
    const appBaseDir = this.toText(this.app.baseDir, process.cwd());
    return path.resolve(appBaseDir, '../..');
  }

  /**
   * 将输入路径归一化为绝对路径
   */
  normalizeAbsolutePath(inputPath, fallbackPath) {
    const source = this.toText(inputPath, fallbackPath);
    if (!source) return this.toText(fallbackPath, '');
    if (path.isAbsolute(source)) return path.resolve(source);
    return path.resolve(this.getProjectRootDir(), source);
  }

  /**
   * 从 sequelize 配置读取数据库连接信息
   */
  getDbConfig() {
    const sequelizeConfig = this.app?.config?.sequelize || {};
    return {
      host: this.toText(sequelizeConfig.host, '127.0.0.1'),
      port: this.toInt(sequelizeConfig.port, 3306, 1, 65535),
      username: this.toText(sequelizeConfig.username, ''),
      password: this.toText(sequelizeConfig.password, ''),
      database: this.toText(sequelizeConfig.database, ''),
    };
  }

  /**
   * 获取升级中心默认配置
   */
  getDefaultConfig() {
    const projectRoot = this.getProjectRootDir();
    return {
      packageDir: path.join(projectRoot, 'release'),
      backupDir: path.join(projectRoot, 'release', 'upgrade_backups'),
      tempDir: path.join(projectRoot, 'release', 'upgrade_tmp'),
      frontendDeployDir: path.join(projectRoot, 'frontend'),
      adminDeployDir: path.join(projectRoot, 'server', 'frontend'),
      backendDeployDir: path.join(projectRoot, 'server', 'server'),
      healthcheckUrl: 'http://127.0.0.1:8002/api/uied/license/public-status',
      restartMode: 'none',
      applyDbPatch: true,
      confirmPhrase: DEFAULT_CONFIRM_PHRASE,
    };
  }

  /**
   * 规范化升级配置，确保路径与模式可用
   */
  normalizeUpgradeConfig(config = {}) {
    const source = config && typeof config === 'object' ? config : {};
    const defaults = this.getDefaultConfig();
    const restartMode = this.toText(source.restartMode, defaults.restartMode);
    return {
      packageDir: this.normalizeAbsolutePath(source.packageDir, defaults.packageDir),
      backupDir: this.normalizeAbsolutePath(source.backupDir, defaults.backupDir),
      tempDir: this.normalizeAbsolutePath(source.tempDir, defaults.tempDir),
      frontendDeployDir: this.normalizeAbsolutePath(source.frontendDeployDir, defaults.frontendDeployDir),
      adminDeployDir: this.normalizeAbsolutePath(source.adminDeployDir, defaults.adminDeployDir),
      backendDeployDir: this.normalizeAbsolutePath(source.backendDeployDir, defaults.backendDeployDir),
      healthcheckUrl: this.toText(source.healthcheckUrl, defaults.healthcheckUrl),
      restartMode: ALLOWED_RESTART_MODES.includes(restartMode) ? restartMode : defaults.restartMode,
      applyDbPatch: this.parseBoolean(source.applyDbPatch, defaults.applyDbPatch),
      confirmPhrase: this.toText(source.confirmPhrase, defaults.confirmPhrase).slice(0, 32) || defaults.confirmPhrase,
    };
  }

  /**
   * 确保升级任务表存在（幂等）
   */
  async ensureTaskTable() {
    const { app } = this;
    const table = this.getTaskTableName();
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`${table}\` (
        \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
        \`task_no\` varchar(40) NOT NULL DEFAULT '',
        \`target_version\` varchar(64) NOT NULL DEFAULT '',
        \`bundle_name\` varchar(255) NOT NULL DEFAULT '',
        \`bundle_path\` varchar(600) NOT NULL DEFAULT '',
        \`expected_sha256\` varchar(64) NOT NULL DEFAULT '',
        \`actual_sha256\` varchar(64) NOT NULL DEFAULT '',
        \`status\` varchar(20) NOT NULL DEFAULT 'pending',
        \`phase\` varchar(40) NOT NULL DEFAULT 'queued',
        \`progress\` tinyint unsigned NOT NULL DEFAULT 0,
        \`operator_id\` int unsigned NOT NULL DEFAULT 0,
        \`operator_username\` varchar(80) NOT NULL DEFAULT '',
        \`operator_nickname\` varchar(80) NOT NULL DEFAULT '',
        \`confirm_phrase\` varchar(32) NOT NULL DEFAULT '',
        \`log_path\` varchar(600) NOT NULL DEFAULT '',
        \`result_path\` varchar(600) NOT NULL DEFAULT '',
        \`backup_frontend_path\` varchar(600) NOT NULL DEFAULT '',
        \`backup_admin_path\` varchar(600) NOT NULL DEFAULT '',
        \`backup_backend_path\` varchar(600) NOT NULL DEFAULT '',
        \`backup_db_path\` varchar(600) NOT NULL DEFAULT '',
        \`rollback_status\` varchar(20) NOT NULL DEFAULT 'none',
        \`rollback_message\` varchar(500) NOT NULL DEFAULT '',
        \`error_message\` varchar(500) NOT NULL DEFAULT '',
        \`started_at\` int unsigned NOT NULL DEFAULT 0,
        \`finished_at\` int unsigned NOT NULL DEFAULT 0,
        \`duration_sec\` int unsigned NOT NULL DEFAULT 0,
        \`pid\` int unsigned NOT NULL DEFAULT 0,
        \`create_time\` int unsigned NOT NULL DEFAULT 0,
        \`update_time\` int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_task_no\` (\`task_no\`),
        KEY \`idx_status_create_time\` (\`status\`, \`create_time\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='UIED 升级任务审计表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
  }

  /**
   * 获取升级中心配置
   */
  async getUpgradeConfig() {
    const saved = await this.ctx.service.uied.setting.get(UPGRADE_CONFIG_KEY);
    return this.normalizeUpgradeConfig(saved || {});
  }

  /**
   * 保存升级中心配置
   */
  async saveUpgradeConfig(payload = {}) {
    const config = this.normalizeUpgradeConfig(payload);
    await this.ctx.service.uied.setting.save({
      [UPGRADE_CONFIG_KEY]: config,
    });
    return config;
  }

  /**
   * 校验升级包后缀
   */
  isBundleFileNameAllowed(fileName = '') {
    const lowerName = this.toText(fileName, '').toLowerCase();
    return ALLOWED_BUNDLE_SUFFIX.some(suffix => lowerName.endsWith(suffix));
  }

  /**
   * 遍历目录获取升级包列表（限制 3 层）
   */
  async collectBundleFiles(rootDir, currentDir, depth = 0, result = []) {
    if (depth > 3) return result;
    let entries = [];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      return result;
    }
    for (const entry of entries) {
      const name = this.toText(entry?.name, '');
      if (!name || name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, name);
      if (entry.isDirectory()) {
        await this.collectBundleFiles(rootDir, fullPath, depth + 1, result);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!this.isBundleFileNameAllowed(name)) continue;
      const stat = await fs.promises.stat(fullPath);
      result.push({
        bundleName: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
        size: Number(stat.size || 0),
        mtime: this.toInt(Math.floor(stat.mtimeMs / 1000), 0, 0),
      });
    }
    return result;
  }

  /**
   * 获取服务器内可选升级包列表
   */
  async listBundlePackages() {
    const config = await this.getUpgradeConfig();
    const packageDir = this.toText(config.packageDir, '');
    if (!packageDir) return [];
    await fs.promises.mkdir(packageDir, { recursive: true });
    const list = await this.collectBundleFiles(packageDir, packageDir, 0, []);
    return list.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  }

  /**
   * 获取升级中心概览：当前版本、目录状态、升级包状态、最近任务摘要
   */
  async getOverview() {
    await this.ensureTaskTable();
    const { app } = this;
    const config = await this.getUpgradeConfig();
    const [
      bundleList,
      packageDirState,
      backupDirState,
      tempDirState,
      frontendDeployState,
      adminDeployState,
      backendDeployState,
      latestTask,
      runningTask,
    ] = await Promise.all([
      this.listBundlePackages(),
      this.inspectDirectoryState(config.packageDir, { ensureCreate: true, mustExist: false }),
      this.inspectDirectoryState(config.backupDir, { ensureCreate: true, mustExist: false }),
      this.inspectDirectoryState(config.tempDir, { ensureCreate: true, mustExist: false }),
      this.inspectDirectoryState(config.frontendDeployDir, { mustExist: true }),
      this.inspectDirectoryState(config.adminDeployDir, { mustExist: true }),
      this.inspectDirectoryState(config.backendDeployDir, { mustExist: true }),
      app.model.query(
        `SELECT task_no, status, target_version, bundle_name, started_at, finished_at
         FROM \`${this.getTaskTableName()}\`
         ORDER BY id DESC
         LIMIT 1`,
        { type: app.Sequelize.QueryTypes.SELECT }
      ).then(rows => rows?.[0] || null),
      app.model.query(
        `SELECT task_no, status, target_version, bundle_name, started_at
         FROM \`${this.getTaskTableName()}\`
         WHERE status IN ('pending', 'running')
         ORDER BY id DESC
         LIMIT 1`,
        { type: app.Sequelize.QueryTypes.SELECT }
      ).then(rows => rows?.[0] || null),
    ]);
    const configChecks = [
      { key: 'packageDir', label: '升级包目录', ...packageDirState },
      { key: 'backupDir', label: '备份目录', ...backupDirState },
      { key: 'tempDir', label: '临时目录', ...tempDirState },
      { key: 'frontendDeployDir', label: '前端部署目录', ...frontendDeployState },
      { key: 'adminDeployDir', label: '管理后台目录', ...adminDeployState },
      { key: 'backendDeployDir', label: '后端部署目录', ...backendDeployState },
      {
        key: 'healthcheckUrl',
        label: '健康检查地址',
        path: this.toText(config.healthcheckUrl, ''),
        exists: Boolean(this.toText(config.healthcheckUrl, '')),
        writable: true,
        ok: /^https?:\/\//i.test(this.toText(config.healthcheckUrl, '')),
        message: /^https?:\/\//i.test(this.toText(config.healthcheckUrl, ''))
          ? '已配置健康检查地址'
          : '请填写 http/https 健康检查地址',
      },
      {
        key: 'confirmPhrase',
        label: '二次确认口令',
        path: this.toText(config.confirmPhrase, ''),
        exists: Boolean(this.toText(config.confirmPhrase, '')),
        writable: true,
        ok: this.toText(config.confirmPhrase, '').length >= 4,
        message: this.toText(config.confirmPhrase, '').length >= 4
          ? '口令已配置'
          : '建议设置 4 位以上确认口令',
      },
    ];
    const configReady = configChecks.every(item => item.ok === true);
    const packageReady = Array.isArray(bundleList) && bundleList.length > 0;
    return {
      currentVersion: this.getCurrentVersion(),
      config,
      configChecks,
      configReady,
      packageReady,
      packageCount: Array.isArray(bundleList) ? bundleList.length : 0,
      latestBundle: Array.isArray(bundleList) && bundleList.length > 0 ? bundleList[0] : null,
      latestTask: latestTask || null,
      runningTask: runningTask || null,
      startReady: configReady && packageReady && !runningTask,
      checkedAt: this.now(),
    };
  }

  /**
   * 解析安全升级包路径（仅允许 packageDir 内部相对路径）
   */
  resolveSafeBundlePath(bundleName = '', packageDir = '') {
    const relativeName = this.toText(bundleName, '').replace(/\\/g, '/');
    if (!relativeName) throw new Error('请先填写升级包路径');
    if (relativeName.includes('\0')) throw new Error('升级包路径不合法');
    if (relativeName.startsWith('/')) throw new Error('升级包必须使用相对路径');
    if (relativeName.split('/').some(segment => segment === '..')) {
      throw new Error('升级包路径不合法（禁止 ..）');
    }
    if (!this.isBundleFileNameAllowed(relativeName)) {
      throw new Error('升级包格式仅支持 .tgz / .tar.gz');
    }
    const baseDir = path.resolve(packageDir);
    const bundlePath = path.resolve(baseDir, relativeName);
    if (!(bundlePath === baseDir || bundlePath.startsWith(baseDir + path.sep))) {
      throw new Error('升级包路径越界');
    }
    return bundlePath;
  }

  /**
   * 计算文件 SHA256
   */
  async calculateFileSha256(filePath) {
    return await new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * 校验必须为超级管理员
   */
  requireSuperAdmin() {
    const adminId = Number(this.ctx?.session?.admin_id || 0);
    if (adminId !== SUPER_ADMIN_ID) {
      throw new Error('仅超级管理员可执行升级操作');
    }
    return adminId;
  }

  /**
   * 校验超级管理员操作密码
   */
  async verifyOperatorPassword(password = '') {
    const { app } = this;
    const adminId = this.requireSuperAdmin();
    const passwordText = this.toText(password, '');
    if (!passwordText) throw new Error('请填写当前管理员密码');
    const tableName = `${dbTablePrefix}system_auth_admin`;
    const [ row ] = await app.model.query(
      `SELECT id, username, nickname, password, salt
       FROM \`${tableName}\`
       WHERE id = ?
         AND is_delete = 0
       LIMIT 1`,
      {
        replacements: [ adminId ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!row?.id) throw new Error('管理员信息不存在或已失效');
    const passwordHash = md5(passwordText + String(row.salt || ''));
    if (String(passwordHash) !== String(row.password || '')) {
      throw new Error('管理员密码校验失败');
    }
    return {
      id: Number(row.id || adminId),
      username: this.toText(row.username, ''),
      nickname: this.toText(row.nickname, ''),
    };
  }

  /**
   * 获取升级任务启动锁，避免并发重复创建升级任务。
   */
  async acquireStartTaskLock(timeoutSeconds = 5) {
    const { app } = this;
    const lockName = this.getStartTaskLockName();
    const [ row ] = await app.model.query(
      'SELECT GET_LOCK(?, ?) AS locked',
      {
        replacements: [ lockName, this.toInt(timeoutSeconds, 5, 1, 30) ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (Number(row?.locked || 0) !== 1) {
      throw new Error('升级任务正在初始化，请稍后重试');
    }
    return lockName;
  }

  /**
   * 释放升级任务启动锁。
   */
  async releaseStartTaskLock(lockName = '') {
    const { app } = this;
    const normalizedLockName = this.toText(lockName, '');
    if (!normalizedLockName) return;
    try {
      await app.model.query(
        'SELECT RELEASE_LOCK(?) AS released',
        {
          replacements: [ normalizedLockName ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      this.ctx.logger.warn('[upgradeCenter] 释放启动锁失败:', error.message);
    }
  }

  /**
   * 查询是否有正在执行的升级任务
   */
  async hasRunningTask() {
    const { app } = this;
    const table = this.getTaskTableName();
    const [ row ] = await app.model.query(
      `SELECT COUNT(*) AS total
       FROM \`${table}\`
       WHERE status IN ('pending', 'running')`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Number(row?.total || 0) > 0;
  }

  /**
   * 写入升级任务记录
   */
  async createTask(task = {}) {
    const { app } = this;
    const table = this.getTaskTableName();
    const now = this.now();
    await app.model.query(
      `INSERT INTO \`${table}\`
       (task_no, target_version, bundle_name, bundle_path, expected_sha256, actual_sha256,
        status, phase, progress, operator_id, operator_username, operator_nickname, confirm_phrase,
        log_path, result_path, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 'queued', 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          this.toText(task.taskNo, ''),
          this.toText(task.targetVersion, ''),
          this.toText(task.bundleName, ''),
          this.toText(task.bundlePath, ''),
          this.toText(task.expectedSha256, ''),
          this.toText(task.actualSha256, ''),
          this.toInt(task.operatorId, 0, 0),
          this.toText(task.operatorUsername, ''),
          this.toText(task.operatorNickname, ''),
          this.toText(task.confirmPhrase, ''),
          this.toText(task.logPath, ''),
          this.toText(task.resultPath, ''),
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );
  }

  /**
   * 按任务号更新升级任务记录
   */
  async updateTask(taskNo, patch = {}) {
    const { app } = this;
    const table = this.getTaskTableName();
    const updates = [];
    const values = [];
    const assignField = (field, value) => {
      if (value === undefined) return;
      updates.push(`\`${field}\` = ?`);
      values.push(value);
    };
    assignField('status', patch.status);
    assignField('phase', patch.phase);
    assignField('progress', patch.progress);
    assignField('started_at', patch.startedAt);
    assignField('finished_at', patch.finishedAt);
    assignField('duration_sec', patch.durationSec);
    assignField('pid', patch.pid);
    assignField('backup_frontend_path', patch.backupFrontendPath);
    assignField('backup_admin_path', patch.backupAdminPath);
    assignField('backup_backend_path', patch.backupBackendPath);
    assignField('backup_db_path', patch.backupDbPath);
    assignField('rollback_status', patch.rollbackStatus);
    assignField('rollback_message', patch.rollbackMessage);
    assignField('error_message', patch.errorMessage);
    assignField('update_time', this.now());
    if (!updates.length) return;
    values.push(this.toText(taskNo, ''));
    await app.model.query(
      `UPDATE \`${table}\`
       SET ${updates.join(', ')}
       WHERE task_no = ?`,
      {
        replacements: values,
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 获取升级任务详情
   */
  async getTaskDetail(taskNo = '') {
    await this.ensureTaskTable();
    const { app } = this;
    const table = this.getTaskTableName();
    const [ row ] = await app.model.query(
      `SELECT *
       FROM \`${table}\`
       WHERE task_no = ?
       LIMIT 1`,
      {
        replacements: [ this.toText(taskNo, '') ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!row) return null;
    return row;
  }

  /**
   * 获取升级任务列表
   */
  async listTasks(params = {}) {
    await this.ensureTaskTable();
    const { app } = this;
    const table = this.getTaskTableName();
    const pageNo = this.toInt(params.pageNo || params.page || 1, 1, 1);
    const pageSize = this.toInt(params.pageSize || params.limit || 10, 10, 1, 100);
    const status = this.toText(params.status, '');
    const where = [];
    const replacements = [];
    if (status) {
      where.push('status = ?');
      replacements.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [ totalRow ] = await app.model.query(
      `SELECT COUNT(*) AS total
       FROM \`${table}\`
       ${whereSql}`,
      {
        replacements,
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    const total = Number(totalRow?.total || 0);
    const offset = (pageNo - 1) * pageSize;
    const rows = await app.model.query(
      `SELECT *
       FROM \`${table}\`
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    return {
      lists: rows || [],
      count: total,
      pageNo,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  }

  /**
   * 读取任务日志（尾部 N 行）
   */
  async readTaskLog(taskNo = '', lines = 200) {
    await this.ensureTaskTable();
    const detail = await this.getTaskDetail(taskNo);
    if (!detail) {
      throw new Error('升级任务不存在');
    }
    const logPath = this.toText(detail.log_path, '');
    if (!logPath) return { content: '', logPath: '', exists: false };
    try {
      const content = await fs.promises.readFile(logPath, 'utf8');
      const lineCount = this.toInt(lines, 200, 20, 2000);
      const chunk = content.split(/\r?\n/).slice(-lineCount).join('\n');
      return { content: chunk, logPath, exists: true };
    } catch (error) {
      return { content: '', logPath, exists: false };
    }
  }

  /**
   * 解析升级结果文件
   */
  async parseResultFile(resultPath = '') {
    const filePath = this.toText(resultPath, '');
    if (!filePath) return {};
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * 构建脚本执行环境变量（固定白名单参数）
   */
  buildScriptEnv(task = {}, config = {}) {
    const db = this.getDbConfig();
    return {
      ...process.env,
      UIED_TASK_NO: this.toText(task.taskNo, ''),
      UIED_BUNDLE_FILE: this.toText(task.bundlePath, ''),
      UIED_EXPECTED_SHA256: this.toText(task.expectedSha256, ''),
      UIED_RESULT_FILE: this.toText(task.resultPath, ''),
      UIED_BACKUP_DIR: this.toText(config.backupDir, ''),
      UIED_TEMP_DIR: this.toText(config.tempDir, ''),
      UIED_FRONTEND_DEPLOY_DIR: this.toText(config.frontendDeployDir, ''),
      UIED_ADMIN_DEPLOY_DIR: this.toText(config.adminDeployDir, ''),
      UIED_BACKEND_DEPLOY_DIR: this.toText(config.backendDeployDir, ''),
      UIED_HEALTHCHECK_URL: this.toText(config.healthcheckUrl, ''),
      UIED_RESTART_MODE: this.toText(config.restartMode, 'none'),
      UIED_APPLY_DB_PATCH: this.parseBoolean(config.applyDbPatch, true) ? '1' : '0',
      UIED_DB_HOST: this.toText(db.host, ''),
      UIED_DB_PORT: String(this.toInt(db.port, 3306, 1, 65535)),
      UIED_DB_USER: this.toText(db.username, ''),
      UIED_DB_PASSWORD: this.toText(db.password, ''),
      UIED_DB_NAME: this.toText(db.database, ''),
    };
  }

  /**
   * 启动升级子进程并在退出后回写任务结果
   */
  async launchUpgradeProcess(task = {}, config = {}) {
    const scriptPath = path.resolve(this.app.baseDir, 'scripts/uied_upgrade_runner.sh');
    await fs.promises.mkdir(path.dirname(this.toText(task.logPath, '')), { recursive: true });
    const logStream = fs.createWriteStream(this.toText(task.logPath, ''), { flags: 'a' });
    const startedAt = this.now();

    const child = spawn('bash', [ scriptPath ], {
      cwd: this.getProjectRootDir(),
      env: this.buildScriptEnv(task, config),
      stdio: [ 'ignore', 'pipe', 'pipe' ],
    });

    await this.updateTask(task.taskNo, {
      status: 'running',
      phase: 'running',
      progress: 5,
      pid: Number(child.pid || 0),
      startedAt,
    });

    const writeLog = chunk => {
      try {
        logStream.write(chunk);
      } catch (error) {
        this.ctx.logger.warn('[upgradeCenter] 任务日志写入失败:', error.message);
      }
    };
    if (child.stdout) child.stdout.on('data', writeLog);
    if (child.stderr) child.stderr.on('data', writeLog);

    child.on('error', async (error) => {
      writeLog(Buffer.from(`\n[upgrade-error] ${error.message || error}\n`, 'utf8'));
      const finishedAt = this.now();
      await this.updateTask(task.taskNo, {
        status: 'failed',
        phase: 'spawn_error',
        progress: 100,
        finishedAt,
        durationSec: Math.max(0, finishedAt - startedAt),
        errorMessage: this.toText(error.message || '升级进程启动失败', '升级进程启动失败').slice(0, 500),
      });
      try {
        logStream.end();
      } catch (closeError) {
        // ignore
      }
    });

    child.on('close', async (code, signal) => {
      writeLog(Buffer.from(`\n[upgrade-exit] code=${code} signal=${signal || 'none'}\n`, 'utf8'));
      const result = await this.parseResultFile(task.resultPath);
      const finishedAt = this.now();
      const isSuccess = Number(code) === 0 && this.toText(result.status, '').toLowerCase() === 'success';
      await this.updateTask(task.taskNo, {
        status: isSuccess ? 'success' : 'failed',
        phase: this.toText(result.phase, isSuccess ? 'done' : 'failed').slice(0, 40),
        progress: 100,
        finishedAt,
        durationSec: Math.max(0, finishedAt - startedAt),
        backupFrontendPath: this.toText(result.backupFrontendPath, '').slice(0, 600),
        backupAdminPath: this.toText(result.backupAdminPath, '').slice(0, 600),
        backupBackendPath: this.toText(result.backupBackendPath, '').slice(0, 600),
        backupDbPath: this.toText(result.backupDbPath, '').slice(0, 600),
        rollbackStatus: this.toText(result.rollbackStatus, isSuccess ? 'none' : 'failed').slice(0, 20),
        rollbackMessage: this.toText(result.rollbackMessage, '').slice(0, 500),
        errorMessage: this.toText(
          result.errorMessage,
          isSuccess ? '' : `升级失败（exit_code=${Number(code) || 1}）`
        ).slice(0, 500),
      });
      try {
        logStream.end();
      } catch (closeError) {
        // ignore
      }
    });
  }

  /**
   * 发起升级任务（超管 + 操作密码 + SHA256 + 单任务互斥）
   */
  async startUpgradeTask(payload = {}) {
    await this.ensureTaskTable();

    const operator = await this.verifyOperatorPassword(payload.adminPassword);
    const config = await this.getUpgradeConfig();
    const confirmPhrase = this.toText(payload.confirmPhrase, '');
    const expectedPhrase = this.toText(config.confirmPhrase, DEFAULT_CONFIRM_PHRASE);
    if (confirmPhrase !== expectedPhrase) {
      throw new Error(`二次确认口令不正确，请输入 ${expectedPhrase}`);
    }

    await fs.promises.mkdir(config.packageDir, { recursive: true });
    await fs.promises.mkdir(config.backupDir, { recursive: true });
    await fs.promises.mkdir(config.tempDir, { recursive: true });
    await fs.promises.mkdir(path.join(config.backupDir, 'logs'), { recursive: true });

    const bundleName = this.toText(payload.bundleName, '');
    const bundlePath = this.resolveSafeBundlePath(bundleName, config.packageDir);
    let stat = null;
    try {
      stat = await fs.promises.stat(bundlePath);
    } catch (error) {
      throw new Error('升级包不存在，请先上传到服务器指定目录');
    }
    if (!stat?.isFile?.()) {
      throw new Error('升级包路径不是有效文件');
    }

    const expectedSha256 = this.toText(payload.expectedSha256, '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
      throw new Error('请填写 64 位 SHA256 校验值');
    }
    const actualSha256 = String(await this.calculateFileSha256(bundlePath)).toLowerCase();
    if (actualSha256 !== expectedSha256) {
      throw new Error('升级包 SHA256 校验失败，请确认包完整性');
    }

    const taskNo = this.buildTaskNo();
    const logPath = path.join(config.backupDir, 'logs', `${taskNo}.log`);
    const resultPath = path.join(config.tempDir, `${taskNo}.result.json`);
    const task = {
      taskNo,
      targetVersion: this.toText(payload.targetVersion, ''),
      bundleName,
      bundlePath,
      expectedSha256,
      actualSha256,
      operatorId: Number(operator.id || 0),
      operatorUsername: this.toText(operator.username, ''),
      operatorNickname: this.toText(operator.nickname, ''),
      confirmPhrase,
      logPath,
      resultPath,
    };

    /**
     * 使用数据库命名锁包裹“查询运行中任务 + 创建任务”，防止双击或并发请求重复发起升级。
     */
    const lockName = await this.acquireStartTaskLock();
    try {
      if (await this.hasRunningTask()) {
        throw new Error('已有升级任务正在执行，请等待完成后再试');
      }
      await this.createTask(task);
    } finally {
      await this.releaseStartTaskLock(lockName);
    }

    // 异步执行升级流程，接口立即返回任务编号，前端轮询任务状态。
    await this.launchUpgradeProcess(task, config);

    return {
      taskNo,
      bundleName,
      bundleSize: Number(stat.size || 0),
      expectedSha256,
      actualSha256,
      status: 'running',
      confirmPhrase,
    };
  }
}

module.exports = UpgradeCenterService;
