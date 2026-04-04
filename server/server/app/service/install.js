/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.18
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const md5 = require('md5');
const mysql = require('mysql2/promise');
const Service = require('egg').Service;
const { dbTablePrefix = 'la_' } = require('../extend/config');

const INSTALL_STATE_KEY = 'install_wizard_state';
const INSTALL_WIZARD_VERSION = '1.0.0';
const DEFAULT_ADMIN_AVATAR = '/public/static/backend_avatar.png';

class InstallService extends Service {
  /**
   * 生成随机字符串（用于管理员盐值）
   */
  randomString(length = 6) {
    return crypto.randomBytes(Math.max(4, length)).toString('hex').slice(0, length);
  }

  /**
   * 授权码脱敏显示（用于安装状态记录）
   */
  maskLicenseKey(licenseKey = '') {
    const text = String(licenseKey || '').trim();
    if (!text) return '';
    if (text.length <= 8) return `${text.slice(0, 2)}****`;
    return `${text.slice(0, 4)}****${text.slice(-4)}`;
  }

  /**
   * 解析版本号（提取 major/minor/patch）
   */
  parseVersion(versionText = '') {
    const text = String(versionText || '').trim();
    const match = text.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return { raw: text, major: 0, minor: 0, patch: 0 };
    }
    return {
      raw: text,
      major: Number(match[1] || 0),
      minor: Number(match[2] || 0),
      patch: Number(match[3] || 0),
    };
  }

  /**
   * 检查系统命令是否存在
   */
  resolveCommandPath(commandName = '') {
    const command = String(commandName || '').trim();
    if (!command) return '';
    try {
      const result = spawnSync('sh', [ '-lc', `command -v ${command}` ], {
        encoding: 'utf8',
        timeout: 1500,
      });
      if (result.status !== 0) return '';
      return String(result.stdout || '').trim();
    } catch (error) {
      return '';
    }
  }

  /**
   * 判断版本是否大于等于目标版本（仅比较 major/minor）
   */
  isVersionGte(version = { major: 0, minor: 0 }, targetMajor = 0, targetMinor = 0) {
    if (version.major > targetMajor) return true;
    if (version.major < targetMajor) return false;
    return version.minor >= targetMinor;
  }

  /**
   * 获取管理员表名
   */
  getAdminTableName() {
    return `${dbTablePrefix}system_auth_admin`;
  }

  /**
   * 获取角色表名
   */
  getRoleTableName() {
    return `${dbTablePrefix}system_auth_role`;
  }

  /**
   * 获取菜单表名
   */
  getMenuTableName() {
    return `${dbTablePrefix}system_auth_menu`;
  }

  /**
   * 获取角色权限表名
   */
  getPermTableName() {
    return `${dbTablePrefix}system_auth_perm`;
  }

  /**
   * 查询管理员数量
   */
  async countAdmins() {
    const { app } = this;
    const [ row ] = await app.model.query(
      `SELECT COUNT(*) AS total FROM \`${this.getAdminTableName()}\` WHERE is_delete = 0`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Number(row?.total || 0);
  }

  /**
   * 读取安装向导状态
   */
  async getInstallState() {
    try {
      const raw = await this.ctx.service.uied.setting.get(INSTALL_STATE_KEY);
      if (!raw || typeof raw !== 'object') return null;
      return raw;
    } catch (error) {
      this.ctx.logger.warn('[install] 读取安装状态失败，按未安装处理:', error.message);
      return null;
    }
  }

  /**
   * 查询单表是否存在
   */
  async tableExists(tableName) {
    const { app } = this;
    const [ row ] = await app.model.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      {
        replacements: [ String(tableName || '') ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    return Number(row?.total || 0) > 0;
  }

  /**
   * 检测目录是否可写（自动创建目录）
   */
  async checkWritableDirectory(dirPath) {
    const folder = String(dirPath || '').trim();
    if (!folder) {
      return { ok: false, message: '目录路径为空' };
    }
    try {
      await fs.promises.mkdir(folder, { recursive: true });
      const tempFile = path.join(folder, `.install_check_${Date.now()}.tmp`);
      await fs.promises.writeFile(tempFile, 'ok', 'utf8');
      await fs.promises.unlink(tempFile);
      return { ok: true, message: '可写' };
    } catch (error) {
      return { ok: false, message: error.message || '不可写' };
    }
  }

  /**
   * 检测 Node 运行环境
   */
  detectNodeCheck() {
    const version = this.parseVersion(process.versions.node || process.version || '');
    const supported = this.isVersionGte(version, 16, 0);
    const recommended = this.isVersionGte(version, 20, 0);
    return {
      key: 'node',
      label: 'Node.js 版本',
      status: supported ? (recommended ? 'pass' : 'warn') : 'fail',
      value: version.raw || process.version,
      message: supported
        ? (recommended ? '满足推荐版本（>=20）' : '可运行，建议升级到 Node 20+')
        : '版本过低，需 Node 16+',
    };
  }

  /**
   * 检测 MySQL 连接与版本
   */
  async detectMysqlCheck() {
    const { app } = this;
    try {
      const [ row ] = await app.model.query(
        'SELECT VERSION() AS version',
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      const versionText = String(row?.version || '');
      const version = this.parseVersion(versionText);
      const supported = this.isVersionGte(version, 5, 6);
      const recommended = this.isVersionGte(version, 5, 7);
      return {
        key: 'mysql',
        label: 'MySQL 版本',
        status: supported ? (recommended ? 'pass' : 'warn') : 'fail',
        value: versionText || 'unknown',
        message: supported
          ? (recommended ? '满足推荐版本（>=5.7）' : '可运行，建议升级到 MySQL 5.7+')
          : '版本过低，需 MySQL 5.6+',
      };
    } catch (error) {
      return {
        key: 'mysql',
        label: 'MySQL 版本',
        status: 'fail',
        value: 'unreachable',
        message: error.message || '数据库连接失败',
      };
    }
  }

  /**
   * 检测 Redis 可用性（可降级为警告）
   */
  async detectRedisCheck() {
    const { ctx } = this;
    try {
      const key = `install:health:${Date.now()}:${this.randomString(8)}`;
      await ctx.service.redis.set(key, 'ok', 15);
      const value = await ctx.service.redis.get(key);
      await ctx.service.redis.del(key);
      if (String(value || '') !== 'ok') {
        return {
          key: 'redis',
          label: 'Redis 连接',
          status: 'warn',
          value: 'degraded',
          message: 'Redis 可访问但返回值异常，可先安装后排查',
        };
      }
      return {
        key: 'redis',
        label: 'Redis 连接',
        status: 'pass',
        value: 'ok',
        message: '连接正常',
      };
    } catch (error) {
      return {
        key: 'redis',
        label: 'Redis 连接',
        status: 'warn',
        value: 'unreachable',
        message: error.message || 'Redis 连接失败（不阻断安装）',
      };
    }
  }

  /**
   * 检测反向代理环境（Nginx / Apache）
   */
  detectWebServerCheck() {
    const proxyHint = String(
      process.env.UIED_REVERSE_PROXY
      || process.env.SERVER_SOFTWARE
      || ''
    ).trim().toLowerCase();
    const nginxPath = this.resolveCommandPath('nginx');
    const apachePath = this.resolveCommandPath('httpd') || this.resolveCommandPath('apache2');
    if (proxyHint.includes('nginx') || nginxPath) {
      return {
        key: 'webserver',
        label: 'Nginx/Apache',
        status: 'pass',
        value: nginxPath || proxyHint || 'nginx',
        message: '检测到 Nginx 运行环境',
      };
    }
    if (proxyHint.includes('apache') || apachePath) {
      return {
        key: 'webserver',
        label: 'Nginx/Apache',
        status: 'pass',
        value: apachePath || proxyHint || 'apache',
        message: '检测到 Apache 运行环境',
      };
    }
    return {
      key: 'webserver',
      label: 'Nginx/Apache',
      status: 'warn',
      value: 'not_detected',
      message: '未检测到 Nginx/Apache（生产环境建议使用反向代理）',
    };
  }

  /**
   * 检测核心数据表是否齐全
   */
  async detectTableCheck() {
    const requiredTables = [
      'uied_site_info',
      'uied_site_setting',
      this.getAdminTableName(),
      this.getRoleTableName(),
      this.getMenuTableName(),
      this.getPermTableName(),
    ];
    const missingTables = [];
    for (const tableName of requiredTables) {
      const exists = await this.tableExists(tableName);
      if (!exists) missingTables.push(tableName);
    }
    const passed = missingTables.length === 0;
    return {
      key: 'tables',
      label: '核心数据表',
      status: passed ? 'pass' : 'fail',
      value: passed ? 'ready' : 'missing',
      message: passed
        ? `核心表已就绪（${requiredTables.length} 张）`
        : `缺少数据表：${missingTables.join(', ')}`,
      missingTables,
    };
  }

  /**
   * 检测运行目录可写性
   */
  async detectWritableCheck() {
    const uploadPath = path.join(this.app.baseDir, 'app/public/uploads');
    const logsPath = path.join(this.app.baseDir, 'logs');
    const runPath = path.join(this.app.baseDir, 'run');
    const checks = await Promise.all([
      this.checkWritableDirectory(uploadPath),
      this.checkWritableDirectory(logsPath),
      this.checkWritableDirectory(runPath),
    ]);
    const allWritable = checks.every(item => item.ok);
    const detail = [
      `uploads:${checks[0].ok ? 'ok' : checks[0].message}`,
      `logs:${checks[1].ok ? 'ok' : checks[1].message}`,
      `run:${checks[2].ok ? 'ok' : checks[2].message}`,
    ].join(' | ');
    return {
      key: 'filesystem',
      label: '目录写入权限',
      status: allWritable ? 'pass' : 'fail',
      value: allWritable ? 'ok' : 'readonly',
      message: allWritable ? '目录可写' : detail,
    };
  }

  /**
   * 获取安装状态
   */
  async getStatus() {
    const installState = await this.getInstallState();
    const adminCount = await this.countAdmins();
    const installed = Boolean(installState?.completed === true || adminCount > 0);
    return {
      installed,
      adminCount,
      installState: installState || null,
      wizardVersion: INSTALL_WIZARD_VERSION,
      now: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * 环境检测聚合
   */
  async checkEnvironment() {
    const checks = await Promise.all([
      Promise.resolve(this.detectNodeCheck()),
      this.detectMysqlCheck(),
      this.detectRedisCheck(),
      Promise.resolve(this.detectWebServerCheck()),
      this.detectTableCheck(),
      this.detectWritableCheck(),
    ]);
    const passCount = checks.filter(item => item.status === 'pass').length;
    const warnCount = checks.filter(item => item.status === 'warn').length;
    const failCount = checks.filter(item => item.status === 'fail').length;
    return {
      checks,
      passCount,
      warnCount,
      failCount,
      canInstall: failCount === 0,
      checkedAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * 规范化安装初始化参数
   */
  normalizeInstallPayload(payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const siteName = String(source.siteName || '').trim() || 'UIED导航系统';
    const siteTitle = String(source.siteTitle || '').trim() || `${siteName} - 高质量资源导航`;
    const siteDescription = String(source.siteDescription || '').trim()
      || '基于 UIED-NAV 构建的可运营网址导航系统。';
    const siteKeywords = String(source.siteKeywords || '').trim()
      || 'UIED,导航系统,网址导航,AI导航';
    const adminUsername = String(source.adminUsername || '').trim();
    const adminPassword = String(source.adminPassword || '').trim();
    const adminNickname = String(source.adminNickname || '').trim() || '系统管理员';
    const adminEmail = String(source.adminEmail || '').trim();
    const licenseKey = String(source.licenseKey || '').trim();
    const bindDomain = String(source.bindDomain || '').trim();
    const roleId = Number.parseInt(String(source.roleId || 1), 10) || 1;

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(adminUsername)) {
      throw new Error('管理员账号需为4-20位字母/数字/下划线');
    }
    if (adminPassword.length < 6 || adminPassword.length > 32) {
      throw new Error('管理员密码长度需在6-32位之间');
    }
    if (!licenseKey) {
      throw new Error('安装时必须填写授权码 Key');
    }
    if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      throw new Error('管理员邮箱格式不正确');
    }
    return {
      siteName,
      siteTitle,
      siteDescription,
      siteKeywords,
      adminUsername,
      adminPassword,
      adminNickname,
      adminEmail,
      licenseKey,
      bindDomain,
      roleId,
    };
  }

  /**
   * 规范化安装期授权校验参数
   */
  normalizeLicenseCheckPayload(payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const licenseKey = String(source.licenseKey || source.key || '').trim();
    if (!licenseKey) {
      throw new Error('请先填写授权码 Key');
    }
    const licenseCenterService = this.ctx.service.uied.licenseCenter;
    const runtimeDomain = licenseCenterService.getRuntimeDomain();
    const bindDomain = licenseCenterService.normalizeDomain(
      source.bindDomain || source.runtimeDomain || runtimeDomain || ''
    );
    const appConfig = this.app.config || {};
    const projectCode = String(
      source.projectCode
      || process.env.UIED_LICENSE_PROJECT_CODE
      || appConfig.uiedLicenseProjectCode
      || 'fsuied'
    ).trim().toLowerCase();
    return {
      licenseKey,
      bindDomain,
      projectCode,
    };
  }

  /**
   * 安装期预校验授权码（仅验证，不写入本地许可证）
   */
  async checkLicenseActivation(payload = {}) {
    const { ctx } = this;
    const normalized = this.normalizeLicenseCheckPayload(payload);
    const licenseCenterService = ctx.service.uied.licenseCenter;
    const remotePayload = await licenseCenterService.fetchLicensePayloadByKey(
      normalized.licenseKey,
      normalized.bindDomain,
      normalized.projectCode
    );
    const edition = licenseCenterService.assertCommercialEdition(remotePayload.edition);
    const verifiedPayload = licenseCenterService.verifyLicensePayload(remotePayload);
    if (!verifiedPayload.isSignatureValid) {
      throw new Error('授权签名校验失败，请联系 fsuied.com 检查签发配置');
    }
    if (verifiedPayload.isExpired) {
      throw new Error('授权已过期，请在 fsuied.com 续期后重试');
    }
    const remoteStatus = String(verifiedPayload.status || 'active').trim().toLowerCase();
    if (remoteStatus !== 'active') {
      throw new Error(`授权当前状态不可用（status=${remoteStatus}），请在 fsuied.com 检查后重试`);
    }
    return {
      valid: true,
      edition,
      status: remoteStatus,
      licenseKeyMasked: this.maskLicenseKey(normalized.licenseKey),
      bindDomain: normalized.bindDomain,
      projectCode: normalized.projectCode,
      domainLimit: Math.max(1, Number.parseInt(String(verifiedPayload.domainLimit || 1), 10) || 1),
      domainWhitelist: licenseCenterService.normalizeAuthorizedDomainList(verifiedPayload.domainWhitelist),
      checkedAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * 规范化“数据库连接测试”参数
   */
  normalizeDbTestPayload(payload = {}) {
    const sequelizeConfig = this.app?.config?.sequelize || {};
    const source = payload && typeof payload === 'object' ? payload : {};
    const host = String(
      source.host
      || process.env.UIED_DB_HOST
      || sequelizeConfig.host
      || '127.0.0.1'
    ).trim();
    const port = Number.parseInt(
      String(source.port || process.env.UIED_DB_PORT || sequelizeConfig.port || 3306),
      10
    ) || 3306;
    const username = String(
      source.username
      || source.user
      || process.env.UIED_DB_USER
      || sequelizeConfig.username
      || ''
    ).trim();
    const password = String(
      source.password !== undefined
        ? source.password
        : (process.env.UIED_DB_PASSWORD || sequelizeConfig.password || '')
    );
    const database = String(
      source.database
      || process.env.UIED_DB_NAME
      || sequelizeConfig.database
      || ''
    ).trim();
    const connectTimeout = Math.max(
      1000,
      Math.min(
        30000,
        Number.parseInt(String(source.connectTimeout || 5000), 10) || 5000
      )
    );
    if (!host) throw new Error('数据库主机不能为空');
    if (!username) throw new Error('数据库用户名不能为空');
    if (!database) throw new Error('数据库名称不能为空');
    return {
      host,
      port,
      username,
      password,
      database,
      connectTimeout,
    };
  }

  /**
   * 测试数据库连接（支持用户手工输入连接参数）
   */
  async testDatabaseConnection(payload = {}) {
    const config = this.normalizeDbTestPayload(payload);
    let connection = null;
    try {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        connectTimeout: config.connectTimeout,
        charset: 'utf8mb4',
      });
      const [ versionRows ] = await connection.query('SELECT VERSION() AS version');
      const [ dbRows ] = await connection.query('SELECT DATABASE() AS dbName');
      return {
        success: true,
        message: '数据库连接成功',
        version: String(versionRows?.[0]?.version || ''),
        databaseName: String(dbRows?.[0]?.dbName || config.database),
        config: {
          host: config.host,
          port: config.port,
          username: config.username,
          database: config.database,
        },
        checkedAt: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '数据库连接失败',
        version: '',
        databaseName: config.database,
        config: {
          host: config.host,
          port: config.port,
          username: config.username,
          database: config.database,
        },
        checkedAt: Math.floor(Date.now() / 1000),
      };
    } finally {
      if (connection) {
        await connection.end().catch(() => null);
      }
    }
  }

  /**
   * 解析可用角色ID（默认优先 1）
   */
  async resolveRoleId(preferredRoleId = 1) {
    const { app } = this;
    const roleTable = this.getRoleTableName();
    const rows = await app.model.query(
      `SELECT id
       FROM \`${roleTable}\`
       WHERE is_delete = 0
         AND is_disable = 0
       ORDER BY id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    const roleIds = (Array.isArray(rows) ? rows : [])
      .map(item => Number(item?.id || 0))
      .filter(Boolean);
    if (!roleIds.length) {
      throw new Error('未找到可用管理员角色，请先初始化角色数据');
    }
    if (roleIds.includes(Number(preferredRoleId || 0))) {
      return Number(preferredRoleId || 0);
    }
    return roleIds[0];
  }

  /**
   * 创建或更新管理员账号
   */
  async upsertAdminAccount(payload = {}) {
    const { app } = this;
    const tableName = this.getAdminTableName();
    const now = Math.floor(Date.now() / 1000);
    const [ current ] = await app.model.query(
      `SELECT id
       FROM \`${tableName}\`
       WHERE username = ?
         AND is_delete = 0
       LIMIT 1`,
      {
        replacements: [ payload.adminUsername ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    const salt = this.randomString(6);
    const passwordHash = md5(`${payload.adminPassword}${salt}`);

    if (current?.id) {
      await app.model.query(
        `UPDATE \`${tableName}\`
         SET nickname = ?,
             role = ?,
             password = ?,
             salt = ?,
             is_disable = 0,
             update_time = ?
         WHERE id = ?`,
        {
          replacements: [
            payload.adminNickname,
            String(payload.roleId),
            passwordHash,
            salt,
            now,
            Number(current.id),
          ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      return {
        id: Number(current.id),
        isCreated: false,
      };
    }

    await app.model.query(
      `INSERT INTO \`${tableName}\`
       (dept_id, post_id, username, nickname, password, avatar, role, salt, sort, is_multipoint, is_disable, is_delete, last_login_ip, last_login_time, create_time, update_time, delete_time)
       VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          0,
          0,
          payload.adminUsername,
          payload.adminNickname,
          passwordHash,
          DEFAULT_ADMIN_AVATAR,
          String(payload.roleId),
          salt,
          0,
          0,
          0,
          0,
          '',
          0,
          now,
          now,
          0,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    const [ created ] = await app.model.query(
      `SELECT id
       FROM \`${tableName}\`
       WHERE username = ?
         AND is_delete = 0
       ORDER BY id DESC
       LIMIT 1`,
      {
        replacements: [ payload.adminUsername ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    return {
      id: Number(created?.id || 0),
      isCreated: true,
    };
  }

  /**
   * 初始化授权菜单并清理已废弃的商业/交付菜单分组。
   */
  async ensureCommercialTopMenus() {
    const { app } = this;
    const menuTable = this.getMenuTableName();
    const permTable = this.getPermTableName();
    const now = Math.floor(Date.now() / 1000);

    /**
     * 授权中心固定挂到“网站设置”(814)，避免出现多余一级分组。
     */
    await app.model.query(
      `INSERT INTO \`${menuTable}\`
       (id, pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params, is_cache, is_show, is_disable, create_time, update_time)
       VALUES
       (864, 814, 'C', '授权中心', 'el-icon-Key', 85, 'uied:license:info', 'license-center', 'uied/license/index', '/uied/license-center', '', 0, 1, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
         pid = VALUES(pid),
         menu_name = VALUES(menu_name),
         menu_icon = VALUES(menu_icon),
         menu_sort = VALUES(menu_sort),
         perms = VALUES(perms),
         paths = VALUES(paths),
         component = VALUES(component),
         selected = VALUES(selected),
         is_show = VALUES(is_show),
         is_disable = VALUES(is_disable),
         update_time = VALUES(update_time)`,
      {
        replacements: [ now, now ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    /**
     * 升级中心挂到“网站设置”(814)，用于服务器内安全升级与审计回溯。
     */
    await app.model.query(
      `INSERT INTO \`${menuTable}\`
       (id, pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params, is_cache, is_show, is_disable, create_time, update_time)
       VALUES
       (1203, 814, 'C', '升级中心', 'el-icon-UploadFilled', 110, 'uied:upgrade:task:list', 'upgrade-center', 'uied/upgradeCenter/index', '/system-setting/upgrade-center', '', 0, 1, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
         pid = VALUES(pid),
         menu_name = VALUES(menu_name),
         menu_icon = VALUES(menu_icon),
         menu_sort = VALUES(menu_sort),
         perms = VALUES(perms),
         paths = VALUES(paths),
         component = VALUES(component),
         selected = VALUES(selected),
         is_show = VALUES(is_show),
         is_disable = VALUES(is_disable),
         update_time = VALUES(update_time)`,
      {
        replacements: [ now, now ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    /**
     * 功能开关保留能力但默认隐藏，归档到“网站设置”(814)。
     */
    await app.model.query(
      `UPDATE \`${menuTable}\`
       SET pid = 814,
           is_show = 0,
           menu_sort = 10,
           update_time = ?
       WHERE id = 866`,
      {
        replacements: [ now ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    /**
     * 已废弃的商业/交付分组统一隐藏，避免后台出现无效菜单。
     */
    await app.model.query(
      `UPDATE \`${menuTable}\`
       SET is_show = 0,
           is_disable = 1,
           update_time = ?
       WHERE id IN (981, 982, 894, 1101, 1102)`,
      {
        replacements: [ now ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    /**
     * 给系统角色补授权（role 0/1）
     */
    const roleIds = [ 0, 1 ];
    const menuIds = [ 864, 1203 ];
    for (const roleId of roleIds) {
      for (const menuId of menuIds) {
        const [ exists ] = await app.model.query(
          `SELECT id FROM \`${permTable}\` WHERE role_id = ? AND menu_id = ? LIMIT 1`,
          {
            replacements: [ roleId, menuId ],
            type: app.Sequelize.QueryTypes.SELECT,
          }
        );
        if (exists?.id) continue;
        await app.model.query(
          `INSERT INTO \`${permTable}\` (id, role_id, menu_id) VALUES (?, ?, ?)`,
          {
            replacements: [
              this.randomString(16) + Date.now(),
              roleId,
              menuId,
            ],
            type: app.Sequelize.QueryTypes.INSERT,
          }
        );
      }
    }
  }

  /**
   * 执行安装初始化流程
   */
  async initialize(payload = {}) {
    const { ctx } = this;
    const status = await this.getStatus();
    if (status.installed) {
      throw new Error('系统已安装，如需重装请先清空管理员数据后再试');
    }

    const env = await this.checkEnvironment();
    if (!env.canInstall) {
      const failedItems = env.checks
        .filter(item => item.status === 'fail')
        .map(item => `${item.label}：${item.message}`)
        .join('；');
      throw new Error(`环境检测未通过：${failedItems}`);
    }

    const normalized = this.normalizeInstallPayload(payload);

    /**
     * 一键安装阶段先激活授权码：
     * 1. 激活失败直接终止，避免产生“已创建管理员但未授权”的半安装状态
     * 2. 激活成功后再继续站点与管理员初始化
     */
    const licenseInfo = await ctx.service.uied.licenseCenter.activateLicenseByKey({
      licenseKey: normalized.licenseKey,
      bindDomain: normalized.bindDomain,
    });

    const roleId = await this.resolveRoleId(normalized.roleId);
    const adminResult = await this.upsertAdminAccount({
      ...normalized,
      roleId,
    });

    await ctx.service.uied.setting.saveSiteInfo({
      siteName: normalized.siteName,
      siteTitle: normalized.siteTitle,
      siteDescription: normalized.siteDescription,
      siteKeywords: normalized.siteKeywords,
      logo: '/logo-3.svg',
      favicon: '/favicon.ico',
      icp: '',
      copyright: '',
      contactEmail: normalized.adminEmail || '',
      analyticsCode: '',
    });

    await this.ensureCommercialTopMenus();

    const completedAt = Math.floor(Date.now() / 1000);
    await ctx.service.uied.setting.save({
      [INSTALL_STATE_KEY]: {
        completed: true,
        completedAt,
        version: INSTALL_WIZARD_VERSION,
        adminUsername: normalized.adminUsername,
        adminEmail: normalized.adminEmail || '',
        siteName: normalized.siteName,
        licenseEdition: String(licenseInfo?.effectiveEdition || licenseInfo?.edition || ''),
        licenseStatus: String(licenseInfo?.status || ''),
        licenseKeyMasked: this.maskLicenseKey(normalized.licenseKey),
      },
    });

    if (adminResult.id > 0) {
      await ctx.service.authAdmin.cacheAdminUserByUid(adminResult.id).catch(() => null);
      await ctx.service.authAdmin.cacheRoleMenusByRoleId(roleId).catch(() => null);
    }

    return {
      installed: true,
      completedAt,
      admin: {
        id: adminResult.id,
        username: normalized.adminUsername,
        nickname: normalized.adminNickname,
        roleId,
        created: adminResult.isCreated,
      },
      site: {
        siteName: normalized.siteName,
        siteTitle: normalized.siteTitle,
      },
      license: {
        activated: true,
        edition: String(licenseInfo?.effectiveEdition || licenseInfo?.edition || ''),
        status: String(licenseInfo?.status || ''),
        licenseKey: String(licenseInfo?.licenseKey || normalized.licenseKey || ''),
      },
      menu: {
        commercialLicenseMenuId: 0,
        deliveryCenterMenuId: 0,
      },
    };
  }
}

module.exports = InstallService;
