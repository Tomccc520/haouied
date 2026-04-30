/**
 * @file service/uied/submission.js
 * @description 网站提交服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const crypto = require('crypto');
const Service = require('egg').Service;

class SubmissionService extends Service {
  /**
   * 获取投稿表字段集合（带短时缓存，兼容不同库结构）
   */
  async getSubmissionColumnSet() {
    const { app } = this;
    const cacheKey = '__uiedSubmissionColumnSet';
    const cacheTimeKey = '__uiedSubmissionColumnSetAt';
    const now = Date.now();

    if (app[cacheKey] && app[cacheTimeKey] && now - app[cacheTimeKey] < 5 * 60 * 1000) {
      return app[cacheKey];
    }

    try {
      const columns = await app.model.query('SHOW COLUMNS FROM uied_website_submission', {
        type: app.Sequelize.QueryTypes.SELECT,
      });
      const set = new Set(columns.map(item => String(item.Field || '').toLowerCase()));
      app[cacheKey] = set;
      app[cacheTimeKey] = now;
      return set;
    } catch (error) {
      this.ctx.logger.warn('[submission] 读取投稿表字段失败，使用最小字段集兜底:', error.message);
      return new Set([ 'id', 'name', 'description', 'url', 'status', 'submitter_user_id', 'submitter_name', 'submitter_email', 'submitter_ip', 'create_time', 'update_time' ]);
    }
  }

  /**
   * 兼容历史库：补齐 submitter_user_id 字段，确保登录用户可稳定关联投稿记录。
   */
  async ensureSubmitterUserIdColumn() {
    if (this._submitterUserIdColumnReady) return;
    const { app } = this;
    try {
      const columns = await app.model.query('SHOW COLUMNS FROM uied_website_submission', {
        type: app.Sequelize.QueryTypes.SELECT,
      });
      const columnSet = new Set((Array.isArray(columns) ? columns : []).map(item => String(item.Field || '').toLowerCase()));
      if (!columnSet.has('submitter_user_id')) {
        await app.model.query(
          `ALTER TABLE uied_website_submission
           ADD COLUMN submitter_user_id int unsigned NOT NULL DEFAULT 0 COMMENT '提交用户ID（登录态）' AFTER submitter_ip,
           ADD INDEX idx_submitter_user_id (submitter_user_id)`,
          { type: app.Sequelize.QueryTypes.RAW }
        );
      }
      app.__uiedSubmissionColumnSet = null;
      app.__uiedSubmissionColumnSetAt = 0;
      this._submitterUserIdColumnReady = true;
    } catch (error) {
      this.ctx.logger.warn('[submission] 补齐 submitter_user_id 字段失败，继续按邮箱兜底匹配:', error.message);
      this._submitterUserIdColumnReady = true;
    }
  }

  /**
   * 兼容历史库：补齐投稿履约字段与履约日志表，支撑付费后待履约、人工履约和追踪。
   */
  async ensureFulfillmentSchema() {
    if (this._fulfillmentSchemaReady) return;
    const { app } = this;
    try {
      const columns = await app.model.query('SHOW COLUMNS FROM uied_website_submission', {
        type: app.Sequelize.QueryTypes.SELECT,
      });
      const columnSet = new Set((Array.isArray(columns) ? columns : []).map(item => String(item.Field || '').toLowerCase()));
      const alterSqlList = [];
      if (!columnSet.has('reviewed_at')) {
        alterSqlList.push("ADD COLUMN reviewed_at int unsigned NOT NULL DEFAULT 0 COMMENT '审核时间' AFTER status");
      }
      if (!columnSet.has('reject_reason')) {
        const rejectReasonAfterColumn = columnSet.has('reviewed_at') ? 'reviewed_at' : 'status';
        alterSqlList.push(`ADD COLUMN reject_reason text COMMENT '拒绝原因' AFTER \`${rejectReasonAfterColumn}\``);
      }
      const fulfillmentAfterColumn = columnSet.has('service_meta') ? 'service_meta' : 'status';
      if (!columnSet.has('fulfillment_status')) {
        alterSqlList.push(`ADD COLUMN fulfillment_status varchar(32) NOT NULL DEFAULT 'pending_review' COMMENT '履约状态: pending_review/pending_payment/pending_fulfillment/fulfilled/rejected' AFTER \`${fulfillmentAfterColumn}\``);
      }
      if (!columnSet.has('fulfillment_note')) {
        alterSqlList.push("ADD COLUMN fulfillment_note varchar(255) DEFAULT NULL COMMENT '履约备注' AFTER fulfillment_status");
      }
      if (!columnSet.has('fulfilled_at')) {
        alterSqlList.push("ADD COLUMN fulfilled_at int unsigned NOT NULL DEFAULT 0 COMMENT '履约完成时间' AFTER fulfillment_note");
      }
      if (!columnSet.has('related_website_id')) {
        alterSqlList.push("ADD COLUMN related_website_id int unsigned NOT NULL DEFAULT 0 COMMENT '关联收录网站ID' AFTER fulfilled_at");
      }
      if (!columnSet.has('related_banner_id')) {
        alterSqlList.push("ADD COLUMN related_banner_id int unsigned NOT NULL DEFAULT 0 COMMENT '关联广告位ID' AFTER related_website_id");
      }
      if (alterSqlList.length > 0) {
        await app.model.query(
          `ALTER TABLE uied_website_submission ${alterSqlList.join(', ')}`,
          { type: app.Sequelize.QueryTypes.RAW }
        );
        app.__uiedSubmissionColumnSet = null;
        app.__uiedSubmissionColumnSetAt = 0;
      }

      await app.model.query(
        `CREATE TABLE IF NOT EXISTS uied_submission_fulfillment_log (
          id int unsigned NOT NULL AUTO_INCREMENT,
          submission_id int unsigned NOT NULL DEFAULT 0,
          order_no varchar(64) DEFAULT NULL,
          action varchar(32) NOT NULL DEFAULT '',
          from_status varchar(32) DEFAULT NULL,
          to_status varchar(32) NOT NULL DEFAULT '',
          note varchar(255) DEFAULT NULL,
          operator_id int unsigned NOT NULL DEFAULT 0,
          create_time int unsigned NOT NULL DEFAULT 0,
          PRIMARY KEY (id),
          KEY idx_submission_id (submission_id),
          KEY idx_order_no (order_no),
          KEY idx_to_status (to_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投稿服务履约日志表'`,
        { type: app.Sequelize.QueryTypes.RAW }
      );
      const reviewedAtColumn = columnSet.has('reviewed_at') ? 'reviewed_at' : 'update_time';
      await app.model.query(
        `UPDATE uied_website_submission
         SET fulfillment_status = 'fulfilled',
             fulfillment_note = COALESCE(fulfillment_note, '历史审核通过记录'),
             fulfilled_at = IF(${reviewedAtColumn} > 0, ${reviewedAtColumn}, update_time)
         WHERE status = 'approved'
           AND fulfillment_status = 'pending_review'`,
        { type: app.Sequelize.QueryTypes.UPDATE }
      );
      await app.model.query(
        `UPDATE uied_website_submission
         SET fulfillment_status = 'rejected',
             fulfillment_note = COALESCE(fulfillment_note, reject_reason)
         WHERE status = 'rejected'
           AND fulfillment_status = 'pending_review'`,
        { type: app.Sequelize.QueryTypes.UPDATE }
      );
      this._fulfillmentSchemaReady = true;
    } catch (error) {
      this.ctx.logger.warn('[submission] 补齐履约字段失败，继续使用基础审核流程:', error.message);
      this._fulfillmentSchemaReady = false;
    }
  }

  /**
   * 规范化履约状态，避免写入不可识别状态。
   */
  normalizeFulfillmentStatus(status = '') {
    const text = String(status || '').trim().toLowerCase();
    const allowSet = new Set([ 'pending_review', 'pending_payment', 'pending_fulfillment', 'fulfilled', 'rejected' ]);
    return allowSet.has(text) ? text : 'pending_review';
  }

  /**
   * 判断是否来自 /submit 免费收录入口，后端会强制剥离所有付费加购。
   */
  isFreeSubmissionEntry(data = {}) {
    const entryMode = String(data?.entryMode || data?.serviceMeta?.entryMode || '').trim().toLowerCase();
    return entryMode === 'free_submission';
  }

  /**
   * 判断是否来自 /submit/services 商业服务入口，商业入口必须承载付费基础服务或增值服务。
   */
  isCommercialServiceEntry(data = {}) {
    const entryMode = String(data?.entryMode || data?.serviceMeta?.entryMode || '').trim().toLowerCase();
    return entryMode === 'commercial_service';
  }

  /**
   * 安全解析投稿服务扩展信息。
   */
  parseServiceMeta(rawValue = null) {
    if (!rawValue) return null;
    if (typeof rawValue === 'object') return rawValue;
    try {
      const parsed = JSON.parse(String(rawValue || ''));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 写入履约日志，便于后台追踪付费服务处理过程。
   */
  async appendFulfillmentLog(submissionId, payload = {}) {
    const { app } = this;
    const id = Number(submissionId || 0);
    if (!id) return;
    try {
      await this.ensureFulfillmentSchema();
      await app.model.query(
        `INSERT INTO uied_submission_fulfillment_log
         (submission_id, order_no, action, from_status, to_status, note, operator_id, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            id,
            String(payload.orderNo || '').trim() || null,
            String(payload.action || 'update').trim().slice(0, 32),
            payload.fromStatus ? this.normalizeFulfillmentStatus(payload.fromStatus) : null,
            this.normalizeFulfillmentStatus(payload.toStatus),
            String(payload.note || '').trim().slice(0, 255) || null,
            Math.max(0, Number(payload.operatorId || 0)),
            Math.floor(Date.now() / 1000),
          ],
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );
    } catch (error) {
      this.ctx.logger.warn('[submission] 写入履约日志失败:', error.message);
    }
  }

  /**
   * 更新投稿履约状态，同时写入履约日志。
   */
  async updateSubmissionFulfillment(submissionId, data = {}) {
    const { app } = this;
    const id = Number(submissionId || 0);
    if (!id) return;
    await this.ensureFulfillmentSchema();
    const columns = await this.getSubmissionColumnSet();
    if (!columns.has('fulfillment_status')) return;
    const [ current ] = await app.model.query(
      'SELECT fulfillment_status FROM uied_website_submission WHERE id = ? LIMIT 1',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    const fromStatus = String(current?.fulfillment_status || '');
    const toStatus = this.normalizeFulfillmentStatus(data.status || fromStatus || 'pending_review');
    const now = Math.floor(Date.now() / 1000);
    const updates = [ 'fulfillment_status = ?', 'update_time = ?' ];
    const replacements = [ toStatus, now ];
    if (columns.has('fulfillment_note') && data.note !== undefined) {
      updates.push('fulfillment_note = ?');
      replacements.push(String(data.note || '').trim().slice(0, 255) || null);
    }
    if (columns.has('fulfilled_at')) {
      updates.push('fulfilled_at = ?');
      replacements.push(toStatus === 'fulfilled' ? (Number(data.fulfilledAt || 0) || now) : Number(data.fulfilledAt || 0));
    }
    if (columns.has('related_website_id') && data.relatedWebsiteId !== undefined) {
      updates.push('related_website_id = ?');
      replacements.push(Math.max(0, Number(data.relatedWebsiteId || 0)));
    }
    if (columns.has('related_banner_id') && data.relatedBannerId !== undefined) {
      updates.push('related_banner_id = ?');
      replacements.push(Math.max(0, Number(data.relatedBannerId || 0)));
    }
    replacements.push(id);
    await app.model.query(
      `UPDATE uied_website_submission SET ${updates.join(', ')} WHERE id = ?`,
      { replacements, type: app.Sequelize.QueryTypes.UPDATE }
    );
    await this.appendFulfillmentLog(id, {
      orderNo: data.orderNo,
      action: data.action || 'update',
      fromStatus,
      toStatus,
      note: data.note,
      operatorId: data.operatorId,
    });
  }

  /**
   * 获取某条投稿最近一笔支付订单，用于审核前校验支付状态。
   */
  async getLatestPayOrderBySubmissionId(submissionId) {
    const { app } = this;
    const id = Number(submissionId || 0);
    if (!id) return null;
    await this.ensurePayOrderTable();
    const [ row ] = await app.model.query(
      `SELECT order_no, submission_id, service_type, pay_channel, amount, price_snapshot, status, pay_time
       FROM uied_submission_pay_order
       WHERE submission_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!row) return null;
    return {
      orderNo: String(row.order_no || ''),
      submissionId: Number(row.submission_id || 0),
      serviceType: String(row.service_type || ''),
      payChannel: String(row.pay_channel || ''),
      amount: Number(row.amount || 0),
      priceSnapshot: (() => {
        try {
          return row.price_snapshot ? JSON.parse(row.price_snapshot) : null;
        } catch (error) {
          return null;
        }
      })(),
      status: String(row.status || ''),
      payTime: Number(row.pay_time || 0),
    };
  }

  /**
   * 标准化服务类型
   */
  normalizeServiceType(serviceType) {
    const text = String(serviceType || '').trim().toLowerCase();
    if (text === 'top_recommendation') return 'top_recommendation';
    if (text === 'banner_slot') return 'banner_slot';
    if (text === 'submission') return 'submission';
    // 兼容旧值
    if (text === 'ai_growth') return 'submission';
    if (text === 'paid_boost') return 'top_recommendation';
    return 'submission';
  }

  /**
   * 标准化增值服务附加信息
   */
  normalizeServiceMeta(serviceMeta) {
    if (!serviceMeta || typeof serviceMeta !== 'object') return null;
    const rawEntryMode = String(serviceMeta.entryMode || '').trim().toLowerCase();
    const entryMode = rawEntryMode === 'free_submission'
      ? 'free_submission'
      : (rawEntryMode === 'commercial_service' ? 'commercial_service' : '');
    const plan = String(serviceMeta.plan || '').trim();
    const budget = String(serviceMeta.budget || '').trim();
    const target = String(serviceMeta.target || '').trim();
    const contact = String(serviceMeta.contact || '').trim();
    const addons = Array.isArray(serviceMeta.addons)
      ? Array.from(new Set(serviceMeta.addons.map(item => String(item || '').trim()).filter(Boolean)))
      : [];
    const bannerPositions = Array.isArray(serviceMeta.bannerPositions)
      ? Array.from(new Set(serviceMeta.bannerPositions.map(item => String(item || '').trim()).filter(Boolean)))
      : [];
    const bannerStartTime = this.normalizeUnixTimestamp(serviceMeta.bannerStartTime || serviceMeta.bannerStartAt || 0, 0);
    let bannerEndTime = this.normalizeUnixTimestamp(serviceMeta.bannerEndTime || serviceMeta.bannerEndAt || 0, 0);
    if (bannerStartTime > 0 && bannerEndTime > 0 && bannerEndTime < bannerStartTime) {
      bannerEndTime = bannerStartTime + 24 * 60 * 60;
    }
    const hasAnyContent = Boolean(
      plan
      || budget
      || target
      || contact
      || addons.length > 0
      || bannerPositions.length > 0
      || bannerStartTime > 0
      || bannerEndTime > 0
      || entryMode
    );
    if (!hasAnyContent) return null;
    return { entryMode, plan, budget, target, contact, addons, bannerPositions, bannerStartTime, bannerEndTime };
  }

  /**
   * 当数据库未扩展 service_meta 字段时，将推广信息追加到描述文本兜底保存
   */
  buildFallbackDescription(description, serviceType, serviceMeta) {
    const baseDescription = String(description || '').trim();
    if (!serviceMeta) {
      return baseDescription;
    }
    const hasOperationContent = Boolean(
      serviceMeta.plan
      || serviceMeta.budget
      || serviceMeta.target
      || serviceMeta.contact
      || (Array.isArray(serviceMeta.addons) && serviceMeta.addons.length > 0)
      || (Array.isArray(serviceMeta.bannerPositions) && serviceMeta.bannerPositions.length > 0)
      || Number(serviceMeta.bannerStartTime || 0) > 0
      || Number(serviceMeta.bannerEndTime || 0) > 0
    );
    if (!hasOperationContent) {
      return baseDescription;
    }
    const lines = [
      '[运营需求]',
      `套餐: ${serviceMeta.plan || '-'}`,
      `预算: ${serviceMeta.budget || '-'}`,
      `目标: ${serviceMeta.target || '-'}`,
      `联系方式: ${serviceMeta.contact || '-'}`,
      `加购项: ${(Array.isArray(serviceMeta.addons) && serviceMeta.addons.length > 0) ? serviceMeta.addons.join(', ') : '-'}`,
      `Banner位: ${(Array.isArray(serviceMeta.bannerPositions) && serviceMeta.bannerPositions.length > 0) ? serviceMeta.bannerPositions.join(', ') : '-'}`,
      `Banner排期: ${this.formatTimestampRange(serviceMeta.bannerStartTime, serviceMeta.bannerEndTime)}`,
    ];
    return `${baseDescription}\n\n${lines.join('\n')}`.trim();
  }

  /**
   * 获取投稿服务配置（优先使用设置服务的规范化结果）
   */
  async getSubmissionServiceConfig() {
    const settingService = this.ctx.service.uied.setting;
    const defaults = typeof settingService?.getDefaultSubmissionServiceConfig === 'function'
      ? settingService.getDefaultSubmissionServiceConfig()
      : {};
    const stored = await settingService.get('submissionServiceConfig');
    const source = stored && typeof stored === 'object' ? stored : defaults;
    if (typeof settingService?.normalizeSubmissionServiceConfig === 'function') {
      return settingService.normalizeSubmissionServiceConfig(source);
    }
    return source || {};
  }

  /**
   * 获取全站支付配置（投稿支付复用全站统一支付中心）
   */
  async getPaymentConfig() {
    const settingService = this.ctx.service.uied.setting;
    const defaults = typeof settingService?.getDefaultPaymentConfig === 'function'
      ? settingService.getDefaultPaymentConfig()
      : {};
    const stored = await settingService.get('paymentConfig');
    const legacySubmissionConfig = await settingService.get('submissionServiceConfig');
    const source = stored && typeof stored === 'object'
      ? stored
      : (legacySubmissionConfig?.payment && typeof legacySubmissionConfig.payment === 'object'
        ? legacySubmissionConfig.payment
        : defaults);
    if (typeof settingService?.normalizePaymentConfig === 'function') {
      return settingService.normalizePaymentConfig(source);
    }
    return source || {};
  }

  /**
   * 规范化可选加购项
   */
  normalizeAddonKeys(addons = []) {
    const allowSet = new Set([ 'top_recommendation', 'banner_slot' ]);
    return Array.from(new Set(
      (Array.isArray(addons) ? addons : [])
        .map(item => String(item || '').trim())
        .filter(item => allowSet.has(item))
    ));
  }

  /**
   * 规范化基础收录模式，仅允许免费 / 付费两种。
   */
  normalizeSubmissionMode(mode = 'paid') {
    return String(mode || '').trim().toLowerCase() === 'free' ? 'free' : 'paid';
  }

  /**
   * 解析当前投稿配置下的收费明细，供直接提交与支付下单共用。
   */
  resolveSubmissionPricing(config = {}, addonKeys = []) {
    const serviceConfig = config?.submitService || {};
    const submissionMode = this.normalizeSubmissionMode(serviceConfig?.mode);
    const normalizedAddonKeys = this.normalizeAddonKeys(addonKeys);
    const enabledAddons = [
      { key: 'top_recommendation', config: config?.topRecommendAddon || {} },
      { key: 'banner_slot', config: config?.bannerAddon || {} },
    ]
      .filter(item => item.config?.enabled !== false)
      .filter(item => normalizedAddonKeys.includes(item.key));
    const basePrice = submissionMode === 'free'
      ? 0
      : Math.max(0, Number(serviceConfig?.price || 0));
    const addonPrice = enabledAddons.reduce(
      (sum, item) => sum + Math.max(0, Number(item.config?.price || 0)),
      0
    );
    return {
      submissionMode,
      serviceConfig: {
        ...serviceConfig,
        mode: submissionMode,
        price: basePrice,
        originalPrice: submissionMode === 'free'
          ? 0
          : Math.max(0, Number(serviceConfig?.originalPrice || 0)),
      },
      enabledAddons,
      amount: Number((basePrice + addonPrice).toFixed(2)),
    };
  }

  /**
   * 规范化 Unix 时间戳，兼容秒/毫秒时间戳与日期字符串。
   */
  normalizeUnixTimestamp(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) {
      return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
    }
    const parsed = Date.parse(String(value));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed / 1000);
    }
    return fallback;
  }

  /**
   * 规范化 Banner 排期时间窗；若未指定则使用“当前时间 + 7 天”默认窗。
   */
  normalizeBannerScheduleRange(serviceMeta = null) {
    const now = Math.floor(Date.now() / 1000);
    const rawStart = this.normalizeUnixTimestamp(serviceMeta?.bannerStartTime || 0, 0);
    const rawEnd = this.normalizeUnixTimestamp(serviceMeta?.bannerEndTime || 0, 0);
    const hasExplicitRange = rawStart > 0 || rawEnd > 0;
    const startTime = hasExplicitRange ? (rawStart || now) : now;
    let endTime = hasExplicitRange ? (rawEnd || (startTime + 7 * 24 * 60 * 60)) : now;
    if (endTime < startTime) {
      endTime = startTime + 24 * 60 * 60;
    }
    return {
      startTime,
      endTime,
    };
  }

  /**
   * 友好格式化时间窗，用于描述兜底文本。
   */
  formatTimestampRange(startTime = 0, endTime = 0) {
    const start = this.normalizeUnixTimestamp(startTime, 0);
    const end = this.normalizeUnixTimestamp(endTime, 0);
    if (start <= 0 && end <= 0) return '-';
    const format = ts => {
      const date = new Date(ts * 1000);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    };
    if (start > 0 && end > 0) return `${format(start)} ~ ${format(end)}`;
    if (start > 0) return `${format(start)} 起`;
    return `截至 ${format(end)}`;
  }

  /**
   * 规范化支付渠道
   */
  normalizePayChannel(payChannel) {
    const text = String(payChannel || '').trim().toLowerCase();
    if (text === 'alipay') return 'alipay';
    if (text === 'wechat') return 'wechat';
    return '';
  }

  /**
   * 统一处理 PEM 密钥（支持无头尾与单行文本）
   */
  normalizePemKey(value, type = 'PRIVATE') {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.includes('BEGIN')) return text;
    const clean = text.replace(/\s+/g, '');
    const chunks = clean.match(/.{1,64}/g) || [ clean ];
    if (type === 'PUBLIC') {
      return `-----BEGIN PUBLIC KEY-----\n${chunks.join('\n')}\n-----END PUBLIC KEY-----`;
    }
    return `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  /**
   * 生成随机字符串
   */
  randomString(length = 16) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * 当前时间格式化为支付宝要求格式
   */
  formatAlipayTimestamp(date = new Date()) {
    const pad = num => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /**
   * MD5 签名（微信 V2 使用）
   */
  md5(text = '') {
    return crypto.createHash('md5').update(String(text || ''), 'utf8').digest('hex');
  }

  /**
   * 微信 V2 签名
   */
  buildWechatSign(params = {}, apiKey = '') {
    const signString = Object.keys(params)
      .filter(key => key !== 'sign')
      .filter(key => params[key] !== undefined && params[key] !== null && String(params[key]) !== '')
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    const raw = `${signString}&key=${apiKey}`;
    return this.md5(raw).toUpperCase();
  }

  /**
   * XML 转义
   */
  escapeXml(value = '') {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 对象转微信 XML
   */
  toWechatXml(payload = {}) {
    const nodes = Object.keys(payload).map(key => `<${key}>${this.escapeXml(payload[key])}</${key}>`);
    return `<xml>${nodes.join('')}</xml>`;
  }

  /**
   * 解析微信 XML
   */
  parseWechatXml(xml = '') {
    const result = {};
    if (!xml) return result;
    const text = String(xml || '');
    text.replace(/<(\w+)><!\[CDATA\[([\s\S]*?)\]\]><\/\1>/g, (_match, key, value) => {
      result[key] = value;
      return '';
    });
    text.replace(/<(\w+)>([^<]*)<\/\1>/g, (_match, key, value) => {
      if (result[key] !== undefined) return '';
      result[key] = value;
      return '';
    });
    return result;
  }

  /**
   * 获取回调地址
   */
  buildNotifyUrl(baseUrl, path, explicitUrl = '') {
    const direct = String(explicitUrl || '').trim();
    if (direct) return direct;
    const base = String(baseUrl || '').trim().replace(/\/$/, '');
    if (!base) return '';
    const suffix = String(path || '').startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
  }

  /**
   * 判断是否为非生产环境（本地/测试环境）。
   */
  isNonProductionEnv() {
    const env = String(this.app?.config?.env || process.env.NODE_ENV || '').trim().toLowerCase();
    return env !== 'prod' && env !== 'production';
  }

  /**
   * 判断微信支付是否启用本地联调模拟模式。
   */
  isWechatMockModeEnabled(wechatConfig = {}) {
    return this.isNonProductionEnv() && wechatConfig?.mockModeEnabled === true;
  }

  /**
   * 规范化模拟支付回跳地址，仅允许站内路径或明确 URL。
   */
  normalizeWechatMockReturnPath(rawPath = '', fallbackPath = '/submit') {
    const fallback = String(fallbackPath || '/submit').trim() || '/submit';
    const text = String(rawPath || '').trim();
    if (!text) return fallback;
    if (text.startsWith('http://') || text.startsWith('https://')) return text;
    if (text.startsWith('//')) return fallback;
    return text.startsWith('/') ? text : `/${text}`;
  }

  /**
   * 构建微信模拟支付地址（用于本地联调闭环）。
   */
  buildWechatMockPayUrl(orderData = {}, wechatConfig = {}) {
    const orderNo = String(orderData?.orderNo || '').trim();
    if (!orderNo) {
      throw new Error('模拟支付缺少订单号');
    }
    const requestOrigin = String(this.ctx.get('origin') || '').trim();
    const baseOrigin = requestOrigin || 'http://127.0.0.1:3003';
    const returnPath = this.normalizeWechatMockReturnPath(
      wechatConfig?.mockReturnPath,
      '/submit'
    );
    const mockUrl = new URL('/api/submissions/pay/mock/wechat', baseOrigin);
    mockUrl.searchParams.set('orderNo', orderNo);
    mockUrl.searchParams.set('redirect', returnPath);
    return mockUrl.toString();
  }

  /**
   * 创建支付宝官方跳转地址（Page Pay）
   */
  buildAlipayPayUrl(orderData = {}, paymentConfig = {}) {
    const gateway = String(paymentConfig?.gateway || 'https://openapi.alipay.com/gateway.do').trim();
    const appId = String(paymentConfig?.appId || '').trim();
    const privateKey = this.normalizePemKey(paymentConfig?.privateKey, 'PRIVATE');
    if (!appId || !privateKey) {
      throw new Error('支付宝配置不完整，请先在后台填写 appId 与应用私钥');
    }
    const bizContent = JSON.stringify({
      out_trade_no: String(orderData.orderNo || '').trim(),
      total_amount: Number(orderData.amount || 0).toFixed(2),
      subject: String(orderData.subject || '投稿加热推广'),
      body: String(orderData.body || ''),
      product_code: 'FAST_INSTANT_TRADE_PAY',
      timeout_express: `${Number(orderData.expireMinutes || 30)}m`,
    });
    const params = {
      app_id: appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatAlipayTimestamp(new Date()),
      version: '1.0',
      biz_content: bizContent,
    };
    if (paymentConfig?.notifyUrl) params.notify_url = String(paymentConfig.notifyUrl).trim();
    if (paymentConfig?.returnUrl) params.return_url = String(paymentConfig.returnUrl).trim();
    const signContent = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent, 'utf8');
    signer.end();
    const sign = signer.sign(privateKey, 'base64');
    const urlParams = new URLSearchParams();
    Object.keys(params).forEach(key => urlParams.append(key, String(params[key])));
    urlParams.append('sign', sign);
    return `${gateway}?${urlParams.toString()}`;
  }

  /**
   * 创建微信官方支付地址（V2 unifiedorder + MWEB）
   */
  async buildWechatPayUrl(orderData = {}, paymentConfig = {}) {
    const { app } = this;
    if (this.isWechatMockModeEnabled(paymentConfig)) {
      const payUrl = this.buildWechatMockPayUrl(orderData, paymentConfig);
      return {
        payUrl,
        rawResponse: {
          mode: 'mock',
          message: 'wechat-mock-enabled',
        },
      };
    }
    const appId = String(paymentConfig?.appId || '').trim();
    const mchId = String(paymentConfig?.mchId || '').trim();
    const apiKey = String(paymentConfig?.apiKey || '').trim();
    const notifyUrl = String(paymentConfig?.notifyUrl || '').trim();
    if (!appId || !mchId || !apiKey || !notifyUrl) {
      throw new Error('微信支付配置不完整，请先在后台填写 appId/mchId/apiKey/notifyUrl');
    }
    const nonceStr = this.randomString(24);
    const payload = {
      appid: appId,
      mch_id: mchId,
      nonce_str: nonceStr,
      body: String(orderData.subject || '投稿加热推广'),
      out_trade_no: String(orderData.orderNo || '').trim(),
      total_fee: Math.max(1, Math.round(Number(orderData.amount || 0) * 100)),
      spbill_create_ip: String(orderData.clientIp || '127.0.0.1'),
      notify_url: notifyUrl,
      trade_type: 'MWEB',
      scene_info: JSON.stringify({
        h5_info: {
          type: 'Wap',
          wap_name: String(paymentConfig?.sceneName || 'UIED投稿支付').trim() || 'UIED投稿支付',
          wap_url: String(orderData.referer || this.ctx.request?.origin || 'https://hao.uied.cn'),
        },
      }),
    };
    payload.sign = this.buildWechatSign(payload, apiKey);
    const xml = this.toWechatXml(payload);
    const response = await app.curl('https://api.mch.weixin.qq.com/pay/unifiedorder', {
      method: 'POST',
      contentType: 'text/xml; charset=utf-8',
      dataType: 'text',
      data: xml,
      timeout: 15000,
    });
    const responseText = String(response?.data || '');
    const parsed = this.parseWechatXml(responseText);
    if (String(parsed.return_code || '').toUpperCase() !== 'SUCCESS') {
      throw new Error(parsed.return_msg || '微信下单失败');
    }
    if (String(parsed.result_code || '').toUpperCase() !== 'SUCCESS') {
      throw new Error(parsed.err_code_des || parsed.err_code || '微信下单失败');
    }
    const mwebUrl = String(parsed.mweb_url || '').trim();
    if (!mwebUrl) {
      throw new Error('微信下单成功但未返回支付链接');
    }
    return {
      payUrl: mwebUrl,
      rawResponse: parsed,
    };
  }

  /**
   * 确保投稿支付订单表存在
   */
  async ensurePayOrderTable() {
    if (this._payOrderTableReady) return;
    const { app } = this;
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS uied_submission_pay_order (
        id int unsigned NOT NULL AUTO_INCREMENT,
        order_no varchar(64) NOT NULL,
        submission_id int unsigned NOT NULL DEFAULT 0,
        service_type varchar(32) NOT NULL DEFAULT 'submission',
        pay_channel varchar(20) NOT NULL DEFAULT 'alipay',
        amount decimal(10,2) NOT NULL DEFAULT 0.00,
        status varchar(20) NOT NULL DEFAULT 'created',
        pay_url text,
        transaction_id varchar(100) DEFAULT NULL,
        raw_response longtext,
        pay_time int unsigned NOT NULL DEFAULT 0,
        create_time int unsigned NOT NULL DEFAULT 0,
        update_time int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_order_no (order_no),
        KEY idx_submission_id (submission_id),
        KEY idx_status (status),
        KEY idx_create_time (create_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投稿支付订单表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    await this.ensurePayOrderColumns();
    this._payOrderTableReady = true;
  }

  /**
   * 为支付订单表补齐演进字段（幂等执行）。
   */
  async ensurePayOrderColumns() {
    if (this._payOrderColumnsReady) return;
    const { app } = this;
    const columns = await app.model.query('SHOW COLUMNS FROM uied_submission_pay_order', {
      type: app.Sequelize.QueryTypes.SELECT,
    });
    const columnSet = new Set(columns.map(item => String(item.Field || '').toLowerCase()));
    const alterSqlList = [];
    if (!columnSet.has('price_snapshot')) {
      alterSqlList.push('ADD COLUMN price_snapshot longtext NULL COMMENT \'价格快照\' AFTER amount');
    }
    if (!columnSet.has('notify_retry_count')) {
      alterSqlList.push('ADD COLUMN notify_retry_count int unsigned NOT NULL DEFAULT 0 COMMENT \'补单重试次数\' AFTER raw_response');
    }
    if (!columnSet.has('last_reconcile_time')) {
      alterSqlList.push('ADD COLUMN last_reconcile_time int unsigned NOT NULL DEFAULT 0 COMMENT \'最近补单时间\' AFTER notify_retry_count');
    }
    if (!columnSet.has('reconcile_note')) {
      alterSqlList.push('ADD COLUMN reconcile_note varchar(255) DEFAULT NULL COMMENT \'补单说明\' AFTER last_reconcile_time');
    }
    if (!columnSet.has('expire_time')) {
      alterSqlList.push('ADD COLUMN expire_time int unsigned NOT NULL DEFAULT 0 COMMENT \'订单过期时间\' AFTER pay_time');
    }
    if (alterSqlList.length > 0) {
      await app.model.query(
        `ALTER TABLE uied_submission_pay_order ${alterSqlList.join(', ')}`,
        { type: app.Sequelize.QueryTypes.RAW }
      );
    }
    this._payOrderColumnsReady = true;
  }

  /**
   * 构建支付价格快照，避免后续后台改价影响已下单记录。
   */
  buildPayOrderPriceSnapshot(serviceConfig = {}, addonConfigs = [], serviceMeta = null, amount = 0) {
    return {
      currency: 'CNY',
      baseService: {
        key: 'submission',
        mode: this.normalizeSubmissionMode(serviceConfig?.mode),
        label: String(serviceConfig?.label || '付费提交收录'),
        price: Number(serviceConfig?.price || 0),
        originalPrice: Number(serviceConfig?.originalPrice || 0),
      },
      addons: (Array.isArray(addonConfigs) ? addonConfigs : []).map(item => ({
        key: String(item?.key || ''),
        label: String(item?.config?.label || item?.key || ''),
        price: Number(item?.config?.price || 0),
        originalPrice: Number(item?.config?.originalPrice || 0),
      })),
      bannerPositions: Array.isArray(serviceMeta?.bannerPositions) ? serviceMeta.bannerPositions : [],
      bannerSchedule: {
        startTime: Number(serviceMeta?.bannerStartTime || 0),
        endTime: Number(serviceMeta?.bannerEndTime || 0),
      },
      totalAmount: Number(Number(amount || 0).toFixed(2)),
      generatedAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * 从支付价格快照提取已购买且已启用的权益，避免前端伪造 service_meta 直接获得置顶/Banner。
   */
  resolvePaidAddonKeys(latestPayOrder = null, fallbackAddonKeys = []) {
    const snapshotAddons = Array.isArray(latestPayOrder?.priceSnapshot?.addons)
      ? latestPayOrder.priceSnapshot.addons
      : [];
    const sourceKeys = snapshotAddons.length > 0
      ? snapshotAddons.map(item => item?.key)
      : fallbackAddonKeys;
    return this.normalizeAddonKeys(sourceKeys);
  }

  /**
   * 校验 Banner 位排期冲突，避免同一广告位在同时间窗被重复售卖。
   */
  async checkBannerSlotAvailability(serviceMeta = null) {
    const { app, ctx } = this;
    const positions = Array.isArray(serviceMeta?.bannerPositions)
      ? Array.from(new Set(serviceMeta.bannerPositions.map(item => String(item || '').trim()).filter(Boolean)))
      : [];
    if (positions.length === 0) return { available: true, conflicts: [] };
    const bannerService = ctx.service.uied.banner;
    const aliasSet = new Set();
    positions.forEach(position => {
      const normalized = typeof bannerService?.normalizePosition === 'function'
        ? bannerService.normalizePosition(position)
        : String(position || '').trim().toLowerCase();
      const aliases = typeof bannerService?.getPositionAliases === 'function'
        ? bannerService.getPositionAliases(normalized)
        : [ normalized ];
      aliases.forEach(alias => {
        const text = String(alias || '').trim();
        if (text) aliasSet.add(text);
      });
    });
    const aliasList = Array.from(aliasSet).filter(Boolean);
    if (aliasList.length === 0) return { available: true, conflicts: [] };

    const { startTime, endTime } = this.normalizeBannerScheduleRange(serviceMeta);
    let positionSql = `position IN (${aliasList.map(() => '?').join(',')})`;
    const replacements = [ ...aliasList ];
    aliasList.forEach(() => {
      positionSql += ' OR FIND_IN_SET(?, REPLACE(position, \' \', \'\')) > 0';
    });
    replacements.push(...aliasList);

    const rows = await app.model.query(
      `SELECT id, title, position, start_time, end_time
       FROM uied_banner
       WHERE is_delete = 0
         AND is_show = 1
         AND (${positionSql})
         AND (COALESCE(NULLIF(start_time, 0), 0) <= ?)
         AND (COALESCE(NULLIF(end_time, 0), 2147483647) >= ?)
       ORDER BY sort ASC, id ASC
       LIMIT 20`,
      {
        replacements: [ ...replacements, endTime, startTime ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const conflicts = (Array.isArray(rows) ? rows : []).map(item => ({
      id: Number(item?.id || 0),
      title: String(item?.title || ''),
      position: String(item?.position || ''),
      startTime: Number(item?.start_time || 0),
      endTime: Number(item?.end_time || 0),
    }));
    return {
      available: conflicts.length === 0,
      conflicts,
      startTime,
      endTime,
    };
  }

  /**
   * 为指定投稿创建支付订单
   */
  async createPayOrder(data = {}) {
    const { app, ctx } = this;
    const serviceType = this.normalizeServiceType(data.serviceType || 'submission');
    if (this.isFreeSubmissionEntry(data)) {
      throw new Error('免费收录入口不创建支付订单，请直接提交');
    }
    const payChannel = this.normalizePayChannel(data.payChannel);
    if (!payChannel) {
      throw new Error('请选择支付渠道');
    }
    const config = await this.getSubmissionServiceConfig();
    const paymentConfig = await this.getPaymentConfig();
    if (config?.enabled === false) {
      throw new Error('投稿服务暂未开放');
    }
    const serviceConfig = config?.submitService || {};
    if (serviceConfig?.enabled === false) {
      throw new Error('当前服务暂未开启');
    }
    const requestedAddonKeys = this.normalizeAddonKeys(
      data?.serviceMeta?.addons || data?.addons || []
    );
    const pricing = this.resolveSubmissionPricing(config, requestedAddonKeys);
    const amount = pricing.amount;
    const enabledAddons = pricing.enabledAddons;
    const enabledAddonKeys = enabledAddons.map(item => item.key);
    const disabledRequestedAddons = requestedAddonKeys.filter(key => !enabledAddonKeys.includes(key));
    if (disabledRequestedAddons.length > 0) {
      throw new Error('所选增值服务暂未开启，请刷新页面后重新选择');
    }
    if (amount <= 0 && enabledAddonKeys.length === 0 && pricing.submissionMode === 'free') {
      throw new Error('收录与增值服务页至少需要选择一个增值服务；免费收录请使用 /submit');
    }
    if (amount > 0 && paymentConfig?.enabled !== true) {
      throw new Error('支付功能未开启，请联系管理员');
    }
    if (amount > 0 && payChannel === 'alipay' && !(paymentConfig?.allowAlipay && paymentConfig?.alipay?.enabled)) {
      throw new Error('支付宝支付暂未开启');
    }
    if (amount > 0 && payChannel === 'wechat' && !(paymentConfig?.allowWechat && paymentConfig?.wechat?.enabled)) {
      throw new Error('微信支付暂未开启');
    }

    const normalizedServiceMeta = this.normalizeServiceMeta({
      ...(data?.serviceMeta || {}),
      entryMode: 'commercial_service',
      plan: data?.serviceMeta?.plan || data?.promotionPlan || data?.plan || '',
      budget: data?.serviceMeta?.budget || data?.promotionBudget || data?.budget || '',
      target: data?.serviceMeta?.target || data?.promotionTarget || data?.target || '',
      contact: data?.serviceMeta?.contact || data?.promotionContact || data?.contact || '',
      addons: enabledAddonKeys,
      bannerPositions: data?.serviceMeta?.bannerPositions || data?.bannerPositions || [],
      bannerStartTime: data?.serviceMeta?.bannerStartTime || data?.bannerStartTime || 0,
      bannerEndTime: data?.serviceMeta?.bannerEndTime || data?.bannerEndTime || 0,
    });
    if (enabledAddonKeys.includes('banner_slot')) {
      if (!Array.isArray(normalizedServiceMeta?.bannerPositions) || normalizedServiceMeta.bannerPositions.length === 0) {
        throw new Error('购买 Banner 位时，请至少选择一个投放位置');
      }
      const bannerAvailability = await this.checkBannerSlotAvailability(normalizedServiceMeta);
      if (!bannerAvailability.available) {
        const conflictTitles = bannerAvailability.conflicts
          .map(item => item.title || `广告#${item.id}`)
          .filter(Boolean)
          .slice(0, 3);
        throw new Error(
          `Banner 位当前排期冲突，请更换位置或时间窗：${conflictTitles.join('、') || '已被占用'}`
        );
      }
    }

    const submitPayload = {
      ...data,
      entryMode: 'commercial_service',
      serviceType,
      serviceMeta: normalizedServiceMeta,
      _allowPaidSubmissionInsert: amount > 0,
    };
    let submissionId = 0;
    try {
      const submissionResult = await this.submit(submitPayload);
      submissionId = Number(submissionResult?.id || 0);
      if (!submissionId) {
        throw new Error('创建投稿记录失败');
      }

      await this.ensurePayOrderTable();
      const now = Math.floor(Date.now() / 1000);
      const orderNo = `SUBP${Date.now()}${this.randomString(6).toUpperCase()}`;
      const expireMinutes = Number(paymentConfig?.orderExpireMinutes || 30);
      const expireTime = now + Math.max(5, Math.min(180, expireMinutes)) * 60;
      const addonTitle = enabledAddons.map(item => String(item.config?.label || '')).filter(Boolean).join(' + ');
      const subject = addonTitle
        ? `${String(pricing.serviceConfig?.label || '付费提交收录').trim()} + ${addonTitle}`
        : (String(pricing.serviceConfig?.label || '付费提交收录').trim() || '付费提交收录');
      const body = String(data?.name || data?.url || '').trim().slice(0, 120);

      let payUrl = '';
      let rawResponse = null;
      let status = 'created';
      const priceSnapshot = this.buildPayOrderPriceSnapshot(
        pricing.serviceConfig,
        enabledAddons,
        normalizedServiceMeta,
        amount
      );
      if (amount <= 0) {
        status = 'free';
      } else if (payChannel === 'alipay') {
        const alipayConfig = {
          ...(paymentConfig?.alipay || {}),
          notifyUrl: this.buildNotifyUrl(
            paymentConfig?.notifyBaseUrl,
            '/api/submissions/pay/notify/alipay',
            paymentConfig?.alipay?.notifyUrl
          ),
        };
        payUrl = this.buildAlipayPayUrl({ orderNo, amount, subject, body, expireMinutes }, alipayConfig);
      } else if (payChannel === 'wechat') {
        const wechatConfig = {
          ...(paymentConfig?.wechat || {}),
          notifyUrl: this.buildNotifyUrl(
            paymentConfig?.notifyBaseUrl,
            '/api/submissions/pay/notify/wechat',
            paymentConfig?.wechat?.notifyUrl
          ),
        };
        const wechatResult = await this.buildWechatPayUrl({
          orderNo,
          amount,
          subject,
          body,
          clientIp: ctx.ip || ctx.request.ip || '127.0.0.1',
          referer: ctx.get('origin') || '',
        }, wechatConfig);
        payUrl = wechatResult.payUrl;
        rawResponse = wechatResult.rawResponse || null;
      }

      await app.model.query(
        `INSERT INTO uied_submission_pay_order
         (order_no, submission_id, service_type, pay_channel, amount, price_snapshot, status, pay_url, raw_response, expire_time, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            orderNo,
            submissionId,
            serviceType,
            payChannel,
            Number(amount.toFixed(2)),
            JSON.stringify(priceSnapshot),
            status,
            payUrl || null,
            rawResponse ? JSON.stringify(rawResponse) : null,
            amount > 0 ? expireTime : 0,
            now,
            now,
          ],
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );

      return {
        orderNo,
        submissionId,
        serviceType,
        payChannel,
        amount: Number(amount.toFixed(2)),
        status,
        payUrl: payUrl || '',
        expireTime: amount > 0 ? expireTime : 0,
        priceSnapshot,
        message: amount > 0 ? '支付订单创建成功' : '已提交成功（免费服务）',
      };
    } catch (error) {
      if (submissionId > 0) {
        await app.model.query(
          'DELETE FROM uied_website_submission WHERE id = ? AND status = ?',
          { replacements: [ submissionId, 'pending' ], type: app.Sequelize.QueryTypes.DELETE }
        ).catch(deleteError => {
          ctx.logger.warn('[submission] 下单失败后清理投稿失败:', deleteError.message);
        });
      }
      throw error;
    }
  }

  /**
   * 查询投稿支付订单状态
   */
  async getPayOrderStatus(orderNo, options = {}) {
    const { app } = this;
    await this.ensurePayOrderTable();
    const no = String(orderNo || '').trim();
    if (!no) {
      throw new Error('缺少订单号');
    }
    if (options.reconcileIfPending === true) {
      await this.reconcilePendingOrders({
        orderNo: no,
        limit: 1,
        source: 'status_poll',
      });
    }
    const [ row ] = await app.model.query(
      `SELECT id, order_no, submission_id, service_type, pay_channel, amount, price_snapshot, status, pay_url, transaction_id,
              raw_response, notify_retry_count, last_reconcile_time, reconcile_note, pay_time, expire_time, create_time, update_time
       FROM uied_submission_pay_order
       WHERE order_no = ?
       LIMIT 1`,
      { replacements: [ no ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!row) return null;
    return {
      id: Number(row.id || 0),
      orderNo: String(row.order_no || ''),
      submissionId: Number(row.submission_id || 0),
      serviceType: String(row.service_type || ''),
      payChannel: String(row.pay_channel || ''),
      amount: Number(row.amount || 0),
      priceSnapshot: (() => {
        try {
          return row.price_snapshot ? JSON.parse(row.price_snapshot) : null;
        } catch (error) {
          return null;
        }
      })(),
      status: String(row.status || ''),
      payUrl: String(row.pay_url || ''),
      transactionId: String(row.transaction_id || ''),
      notifyRetryCount: Number(row.notify_retry_count || 0),
      lastReconcileTime: Number(row.last_reconcile_time || 0),
      reconcileNote: String(row.reconcile_note || ''),
      payTime: Number(row.pay_time || 0),
      expireTime: Number(row.expire_time || 0),
      createTime: Number(row.create_time || 0),
      updateTime: Number(row.update_time || 0),
    };
  }

  /**
   * 更新投稿支付订单状态为已支付
   */
  async markPayOrderPaid(orderNo, transactionId = '', rawResponse = null) {
    const { app } = this;
    await this.ensurePayOrderTable();
    const no = String(orderNo || '').trim();
    if (!no) {
      throw new Error('缺少订单号');
    }
    const currentOrder = await this.getPayOrderStatus(no);
    if (!currentOrder) {
      throw new Error('订单不存在');
    }
    if (currentOrder.status === 'paid') {
      return currentOrder;
    }
    const now = Math.floor(Date.now() / 1000);
    await app.model.query(
      `UPDATE uied_submission_pay_order
       SET status = 'paid',
           transaction_id = ?,
           raw_response = ?,
           pay_time = ?,
           reconcile_note = ?,
           update_time = ?
       WHERE order_no = ?`,
      {
        replacements: [
          String(transactionId || '').trim() || null,
          rawResponse ? JSON.stringify(rawResponse) : null,
          now,
          'notify:paid',
          now,
          no,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
    if (Number(currentOrder.submissionId || 0) > 0 && Number(currentOrder.amount || 0) > 0) {
      await this.updateSubmissionFulfillment(currentOrder.submissionId, {
        status: 'pending_fulfillment',
        orderNo: no,
        action: 'pay_success',
        note: '支付成功，等待审核与履约',
      });
    }
    return await this.getPayOrderStatus(no);
  }

  /**
   * 标记订单为关闭（未支付过期或渠道返回关闭）。
   */
  async markPayOrderClosed(orderNo, note = '', rawResponse = null) {
    const { app } = this;
    await this.ensurePayOrderTable();
    const no = String(orderNo || '').trim();
    if (!no) {
      throw new Error('缺少订单号');
    }
    const currentOrder = await this.getPayOrderStatus(no);
    if (!currentOrder) {
      throw new Error('订单不存在');
    }
    if (currentOrder.status === 'paid' || currentOrder.status === 'closed') {
      return currentOrder;
    }
    const now = Math.floor(Date.now() / 1000);
    await app.model.query(
      `UPDATE uied_submission_pay_order
       SET status = 'closed',
           raw_response = ?,
           reconcile_note = ?,
           update_time = ?
       WHERE order_no = ?
         AND status <> 'paid'`,
      {
        replacements: [
          rawResponse ? JSON.stringify(rawResponse) : null,
          String(note || '').trim().slice(0, 255) || 'reconcile:closed',
          now,
          no,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
    return await this.getPayOrderStatus(no);
  }

  /**
   * 记录补单轮询元信息。
   */
  async touchPayOrderReconcile(orderNo, note = '', rawResponse = null) {
    const { app } = this;
    const no = String(orderNo || '').trim();
    if (!no) return;
    const now = Math.floor(Date.now() / 1000);
    await app.model.query(
      `UPDATE uied_submission_pay_order
       SET notify_retry_count = notify_retry_count + 1,
           last_reconcile_time = ?,
           reconcile_note = ?,
           raw_response = COALESCE(?, raw_response),
           update_time = ?
       WHERE order_no = ?`,
      {
        replacements: [
          now,
          String(note || '').trim().slice(0, 255) || 'reconcile:pending',
          rawResponse ? JSON.stringify(rawResponse) : null,
          now,
          no,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 支付宝订单查询接口，供补单轮询使用。
   */
  async queryAlipayOrder(order = null, paymentConfig = {}) {
    const { app } = this;
    const alipayConfig = paymentConfig?.alipay || {};
    const gateway = String(alipayConfig?.gateway || 'https://openapi.alipay.com/gateway.do').trim();
    const appId = String(alipayConfig?.appId || '').trim();
    const privateKey = this.normalizePemKey(alipayConfig?.privateKey, 'PRIVATE');
    if (!order?.orderNo || !appId || !privateKey) {
      return { status: 'unknown', note: 'alipay-config-missing' };
    }
    const params = {
      app_id: appId,
      method: 'alipay.trade.query',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatAlipayTimestamp(new Date()),
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: String(order.orderNo || ''),
      }),
    };
    const signContent = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent, 'utf8');
    signer.end();
    const sign = signer.sign(privateKey, 'base64');
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => queryParams.append(key, String(params[key])));
    queryParams.append('sign', sign);
    const response = await app.curl(`${gateway}?${queryParams.toString()}`, {
      method: 'GET',
      dataType: 'json',
      timeout: 12000,
    });
    const payload = response?.data || {};
    const tradeResult = payload?.alipay_trade_query_response || {};
    const code = String(tradeResult?.code || '');
    const tradeStatus = String(tradeResult?.trade_status || '').toUpperCase();
    const tradeNo = String(tradeResult?.trade_no || '').trim();
    if (code !== '10000') {
      return {
        status: 'unknown',
        note: String(tradeResult?.sub_msg || tradeResult?.msg || 'alipay-query-failed').slice(0, 255),
        rawResponse: payload,
      };
    }
    if ([ 'TRADE_SUCCESS', 'TRADE_FINISHED' ].includes(tradeStatus)) {
      return {
        status: 'paid',
        transactionId: tradeNo,
        note: 'alipay-query-paid',
        rawResponse: payload,
      };
    }
    if (tradeStatus === 'TRADE_CLOSED') {
      return {
        status: 'closed',
        note: 'alipay-query-closed',
        rawResponse: payload,
      };
    }
    return {
      status: 'pending',
      note: `alipay-query-${tradeStatus || 'waiting'}`.slice(0, 255),
      rawResponse: payload,
    };
  }

  /**
   * 微信订单查询接口，供补单轮询使用。
   */
  async queryWechatOrder(order = null, paymentConfig = {}) {
    const { app } = this;
    const wechatConfig = paymentConfig?.wechat || {};
    const appId = String(wechatConfig?.appId || '').trim();
    const mchId = String(wechatConfig?.mchId || '').trim();
    const apiKey = String(wechatConfig?.apiKey || '').trim();
    if (!order?.orderNo || !appId || !mchId || !apiKey) {
      return { status: 'unknown', note: 'wechat-config-missing' };
    }
    const payload = {
      appid: appId,
      mch_id: mchId,
      nonce_str: this.randomString(24),
      out_trade_no: String(order.orderNo || ''),
    };
    payload.sign = this.buildWechatSign(payload, apiKey);
    const xml = this.toWechatXml(payload);
    const response = await app.curl('https://api.mch.weixin.qq.com/pay/orderquery', {
      method: 'POST',
      contentType: 'text/xml; charset=utf-8',
      dataType: 'text',
      data: xml,
      timeout: 12000,
    });
    const text = String(response?.data || '');
    const parsed = this.parseWechatXml(text);
    if (String(parsed.return_code || '').toUpperCase() !== 'SUCCESS') {
      return {
        status: 'unknown',
        note: String(parsed.return_msg || 'wechat-query-failed').slice(0, 255),
        rawResponse: parsed,
      };
    }
    if (String(parsed.result_code || '').toUpperCase() !== 'SUCCESS') {
      return {
        status: 'unknown',
        note: String(parsed.err_code_des || parsed.err_code || 'wechat-query-failed').slice(0, 255),
        rawResponse: parsed,
      };
    }
    const tradeState = String(parsed.trade_state || '').toUpperCase();
    if (tradeState === 'SUCCESS') {
      return {
        status: 'paid',
        transactionId: String(parsed.transaction_id || '').trim(),
        note: 'wechat-query-paid',
        rawResponse: parsed,
      };
    }
    if ([ 'CLOSED', 'REVOKED', 'PAYERROR' ].includes(tradeState)) {
      return {
        status: 'closed',
        note: `wechat-query-${tradeState.toLowerCase()}`.slice(0, 255),
        rawResponse: parsed,
      };
    }
    return {
      status: 'pending',
      note: `wechat-query-${tradeState || 'waiting'}`.slice(0, 255),
      rawResponse: parsed,
    };
  }

  /**
   * 轮询单个待支付订单，执行补单状态修正。
   */
  async reconcileSinglePayOrder(order = null, paymentConfig = {}, source = 'manual') {
    if (!order || !order.orderNo) {
      return { orderNo: '', status: 'skip', message: '订单不存在' };
    }
    if (order.status !== 'created') {
      return { orderNo: order.orderNo, status: 'skip', message: `当前状态:${order.status}` };
    }
    const now = Math.floor(Date.now() / 1000);
    if (Number(order.lastReconcileTime || 0) > 0 && now - Number(order.lastReconcileTime || 0) < 30) {
      return { orderNo: order.orderNo, status: 'skip', message: '轮询过于频繁，已跳过' };
    }

    const expireTime = Number(order.expireTime || 0);
    if (expireTime > 0 && now > expireTime) {
      await this.markPayOrderClosed(order.orderNo, `expired:${source}`, {
        source,
        reason: 'expired',
        timestamp: now,
      });
      return { orderNo: order.orderNo, status: 'closed', message: '订单已过期关闭' };
    }

    let queryResult = { status: 'unknown', note: 'reconcile-not-run', rawResponse: null, transactionId: '' };
    if (order.payChannel === 'alipay') {
      queryResult = await this.queryAlipayOrder(order, paymentConfig);
    } else if (order.payChannel === 'wechat') {
      queryResult = await this.queryWechatOrder(order, paymentConfig);
    }

    if (queryResult.status === 'paid') {
      await this.markPayOrderPaid(order.orderNo, queryResult.transactionId, queryResult.rawResponse || {
        source,
        note: queryResult.note,
      });
      return { orderNo: order.orderNo, status: 'paid', message: '补单成功：订单已支付' };
    }
    if (queryResult.status === 'closed') {
      await this.markPayOrderClosed(order.orderNo, queryResult.note || `closed:${source}`, queryResult.rawResponse);
      return { orderNo: order.orderNo, status: 'closed', message: '补单完成：订单关闭' };
    }

    await this.touchPayOrderReconcile(order.orderNo, queryResult.note || `pending:${source}`, queryResult.rawResponse);
    return { orderNo: order.orderNo, status: 'pending', message: queryResult.note || '待支付' };
  }

  /**
   * 批量轮询待支付订单，用于定时补单与状态纠偏。
   */
  async reconcilePendingOrders(options = {}) {
    const { app } = this;
    await this.ensurePayOrderTable();
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const orderNo = String(options.orderNo || '').trim();
    const source = String(options.source || 'manual').trim() || 'manual';
    const paymentConfig = await this.getPaymentConfig();

    let rows = [];
    if (orderNo) {
      const current = await this.getPayOrderStatus(orderNo);
      rows = current ? [ current ] : [];
    } else {
      const result = await app.model.query(
        `SELECT order_no
         FROM uied_submission_pay_order
         WHERE status = 'created'
         ORDER BY id ASC
         LIMIT ?`,
        {
          replacements: [ limit ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      for (const item of result) {
        const current = await this.getPayOrderStatus(String(item?.order_no || ''));
        if (current) rows.push(current);
      }
    }

    const details = [];
    for (const item of rows) {
      try {
        const result = await this.reconcileSinglePayOrder(item, paymentConfig, source);
        details.push(result);
      } catch (error) {
        details.push({
          orderNo: item.orderNo,
          status: 'error',
          message: String(error?.message || 'reconcile-failed'),
        });
      }
    }
    return {
      total: rows.length,
      paid: details.filter(item => item.status === 'paid').length,
      closed: details.filter(item => item.status === 'closed').length,
      pending: details.filter(item => item.status === 'pending').length,
      skipped: details.filter(item => item.status === 'skip').length,
      failed: details.filter(item => item.status === 'error').length,
      details,
    };
  }

  /**
   * 构建支付宝签名待验签字符串
   */
  buildAlipaySignContent(params = {}) {
    return Object.keys(params)
      .filter(key => key !== 'sign' && key !== 'sign_type')
      .filter(key => params[key] !== undefined && params[key] !== null && String(params[key]) !== '')
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
  }

  /**
   * 支付宝回调验签
   */
  verifyAlipayNotifySign(payload = {}, alipayConfig = {}) {
    const sign = String(payload?.sign || '').trim();
    const signType = String(payload?.sign_type || 'RSA2').trim().toUpperCase();
    const publicKey = this.normalizePemKey(alipayConfig?.alipayPublicKey, 'PUBLIC');
    if (!sign || !publicKey) {
      return false;
    }
    const signContent = this.buildAlipaySignContent(payload);
    const verifyAlg = signType === 'RSA' ? 'RSA-SHA1' : 'RSA-SHA256';
    const verifier = crypto.createVerify(verifyAlg);
    verifier.update(signContent, 'utf8');
    verifier.end();
    return verifier.verify(publicKey, sign, 'base64');
  }

  /**
   * 处理支付宝异步回调
   */
  async handleAlipayNotify(payload = {}) {
    const payment = await this.getPaymentConfig();
    const alipayConfig = payment?.alipay || {};
    if (!(payment?.enabled && payment?.allowAlipay && alipayConfig?.enabled)) {
      throw new Error('支付宝支付未开启');
    }
    if (!this.verifyAlipayNotifySign(payload, alipayConfig)) {
      throw new Error('支付宝回调验签失败');
    }
    const tradeStatus = String(payload?.trade_status || '').trim().toUpperCase();
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      return {
        success: false,
        ignored: true,
        message: `忽略状态: ${tradeStatus || '-'}`,
      };
    }
    const orderNo = String(payload?.out_trade_no || '').trim();
    if (!orderNo) {
      throw new Error('缺少订单号');
    }
    const order = await this.getPayOrderStatus(orderNo);
    if (!order) {
      throw new Error('订单不存在');
    }
    if (order.status !== 'paid') {
      const notifyAmount = Number(payload?.total_amount || 0);
      if (notifyAmount > 0 && Math.abs(Number(order.amount || 0) - notifyAmount) > 0.01) {
        throw new Error('订单金额校验失败');
      }
      await this.markPayOrderPaid(orderNo, String(payload?.trade_no || '').trim(), payload);
    }
    return { success: true, orderNo };
  }

  /**
   * 构建微信回调响应 XML
   */
  buildWechatNotifyResponse(returnCode = 'SUCCESS', returnMsg = 'OK') {
    return (
      '<xml>' +
      `<return_code><![CDATA[${String(returnCode || 'SUCCESS')}]]></return_code>` +
      `<return_msg><![CDATA[${String(returnMsg || 'OK')}]]></return_msg>` +
      '</xml>'
    );
  }

  /**
   * 处理微信异步回调
   */
  async handleWechatNotify(xmlPayload = '') {
    const text = String(xmlPayload || '').trim();
    if (!text) {
      throw new Error('微信回调内容为空');
    }
    const payload = this.parseWechatXml(text);
    const payment = await this.getPaymentConfig();
    const wechatConfig = payment?.wechat || {};
    if (!(payment?.enabled && payment?.allowWechat && wechatConfig?.enabled)) {
      throw new Error('微信支付未开启');
    }
    if (String(payload?.return_code || '').toUpperCase() !== 'SUCCESS') {
      throw new Error(payload?.return_msg || '微信回调失败');
    }
    if (String(payload?.result_code || '').toUpperCase() !== 'SUCCESS') {
      throw new Error(payload?.err_code_des || payload?.err_code || '微信支付失败');
    }
    const sign = String(payload?.sign || '').trim();
    if (!sign) {
      throw new Error('微信回调缺少签名');
    }
    const expectedSign = this.buildWechatSign(payload, String(wechatConfig?.apiKey || ''));
    if (expectedSign !== sign) {
      throw new Error('微信回调验签失败');
    }
    const orderNo = String(payload?.out_trade_no || '').trim();
    if (!orderNo) {
      throw new Error('缺少订单号');
    }
    const order = await this.getPayOrderStatus(orderNo);
    if (!order) {
      throw new Error('订单不存在');
    }
    if (order.status !== 'paid') {
      const notifyAmount = Number(payload?.total_fee || 0) / 100;
      if (notifyAmount > 0 && Math.abs(Number(order.amount || 0) - notifyAmount) > 0.01) {
        throw new Error('订单金额校验失败');
      }
      await this.markPayOrderPaid(orderNo, String(payload?.transaction_id || '').trim(), payload);
    }
    return { success: true, orderNo };
  }

  /**
   * 检查 URL 是否已存在
   */
  async checkUrl(url) {
    const { app } = this;

    // 标准化 URL
    const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // 检查网站表
    const [ existingWebsite ] = await app.model.query(
      `SELECT id, name, url FROM uied_website 
       WHERE url LIKE ? AND is_delete = 0`,
      { replacements: [ `%${normalizedUrl}%` ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (existingWebsite) {
      return {
        exists: true,
        type: 'website',
        message: '该网站已被收录',
        website: existingWebsite,
      };
    }

    // 检查待审核队列
    const [ existingSubmission ] = await app.model.query(
      `SELECT id, name, url, create_time as createdAt FROM uied_website_submission 
       WHERE url LIKE ? AND status = 'pending'`,
      { replacements: [ `%${normalizedUrl}%` ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (existingSubmission) {
      return {
        exists: true,
        type: 'pending',
        message: '该网站已在审核队列中',
        submission: existingSubmission,
      };
    }

    return { exists: false };
  }

  /**
   * 提交网站
   */
  async submit(data) {
    const { app } = this;
    await this.ensureSubmitterUserIdColumn();
    await this.ensureFulfillmentSchema();
    const now = Math.floor(Date.now() / 1000);
    const serviceType = this.normalizeServiceType(data.serviceType);
    const isFreeEntry = this.isFreeSubmissionEntry(data);
    const isCommercialEntry = this.isCommercialServiceEntry(data);
    const rawServiceMeta = data.serviceMeta && typeof data.serviceMeta === 'object' ? data.serviceMeta : {};
    const serviceMeta = this.normalizeServiceMeta({
      ...rawServiceMeta,
      entryMode: isFreeEntry ? 'free_submission' : (rawServiceMeta.entryMode || data.entryMode || ''),
      addons: isFreeEntry ? [] : (rawServiceMeta.addons || data?.addons || []),
      bannerPositions: isFreeEntry ? [] : (rawServiceMeta.bannerPositions || data?.bannerPositions || []),
    });
    const addonKeys = isFreeEntry ? [] : this.normalizeAddonKeys(serviceMeta?.addons || data?.addons || []);
    const columns = await this.getSubmissionColumnSet();
    const config = serviceType === 'submission'
      ? await this.getSubmissionServiceConfig()
      : null;
    const pricing = serviceType === 'submission'
      ? this.resolveSubmissionPricing(config, addonKeys)
      : null;
    if (serviceType === 'submission' && config?.enabled === false) {
      throw new Error('投稿服务暂未开放');
    }
    if (serviceType === 'submission' && config?.submitService?.enabled === false) {
      throw new Error('当前服务暂未开启');
    }

    if (!isFreeEntry && addonKeys.includes('banner_slot')) {
      if (!Array.isArray(serviceMeta?.bannerPositions) || serviceMeta.bannerPositions.length === 0) {
        throw new Error('购买 Banner 位时，请至少选择一个投放位置');
      }
      const bannerAvailability = await this.checkBannerSlotAvailability(serviceMeta);
      if (!bannerAvailability.available) {
        const conflictTitles = bannerAvailability.conflicts
          .map(item => item.title || `广告#${item.id}`)
          .filter(Boolean)
          .slice(0, 3);
        throw new Error(
          `Banner 位当前排期冲突，请更换位置或时间窗：${conflictTitles.join('、') || '已被占用'}`
        );
      }
    }

    // 基础收录服务默认拦截重复网址；前端显式 allowDuplicate 时进入人工复核流程。
    const allowDuplicate = data.allowDuplicate === true
      || Number(data.allowDuplicate) === 1
      || String(data.allowDuplicate || '').trim().toLowerCase() === 'true';
    if (serviceType === 'submission' && !allowDuplicate) {
      const checkResult = await this.checkUrl(data.url);
      if (checkResult.exists) {
        throw new Error(checkResult.message);
      }
    }
    if (
      serviceType === 'submission'
      && pricing
      && isCommercialEntry
      && !isFreeEntry
      && addonKeys.length === 0
      && pricing.amount <= 0
      && pricing.submissionMode === 'free'
      && data._allowPaidSubmissionInsert !== true
    ) {
      throw new Error('收录与增值服务页至少需要选择一个增值服务；免费收录请使用 /submit');
    }
    if (
      serviceType === 'submission'
      && pricing
      && pricing.amount > 0
      && data._allowPaidSubmissionInsert !== true
    ) {
      throw new Error('当前投稿配置需要先支付后提交，请使用支付提交流程');
    }

    const insertPayload = {
      name: data.name,
      description: columns.has('service_meta')
        ? String(data.description || '')
        : this.buildFallbackDescription(data.description, serviceType, serviceMeta),
      url: data.url,
      submitter_name: data.submitterName || null,
      submitter_email: data.submitterEmail || null,
      submitter_ip: data.submitterIp || null,
      status: 'pending',
      create_time: now,
      update_time: now,
    };

    if (columns.has('submitter_user_id')) {
      insertPayload.submitter_user_id = Math.max(0, Number(data.submitterUserId || 0));
    }
    if (columns.has('icon_url')) insertPayload.icon_url = data.iconUrl || null;
    if (columns.has('category_id')) insertPayload.category_id = data.categoryId || null;
    if (columns.has('tags')) insertPayload.tags = data.tags || null;
    if (columns.has('service_type')) insertPayload.service_type = serviceType;
    if (columns.has('service_meta')) insertPayload.service_meta = serviceMeta ? JSON.stringify(serviceMeta) : null;
    if (columns.has('fulfillment_status')) {
      insertPayload.fulfillment_status = serviceType === 'submission' && pricing
        ? (pricing.amount > 0 || (isCommercialEntry && !isFreeEntry) ? 'pending_payment' : 'pending_review')
        : 'pending_review';
    }
    if (columns.has('fulfillment_note')) {
      insertPayload.fulfillment_note = isFreeEntry ? '免费收录提交，等待人工审核' : null;
    }

    const columnNames = Object.keys(insertPayload);
    const placeholders = columnNames.map(() => '?');
    const sql = `INSERT INTO uied_website_submission (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const replacements = columnNames.map(name => insertPayload[name]);

    const result = await app.model.query(sql, {
      replacements,
      type: app.Sequelize.QueryTypes.INSERT,
    });

    let insertId = Array.isArray(result) ? result[0] : result;
    if (Array.isArray(insertId)) {
      insertId = insertId[0];
    }

    return { id: Number(insertId) || 0, message: '提交成功，等待审核' };
  }

  /**
   * 获取提交状态
   */
  async getStatus(id) {
    const { app } = this;
    await this.ensureFulfillmentSchema();
    const columns = await this.getSubmissionColumnSet();
    const selectFields = [
      'id',
      'name',
      'url',
      'status',
      columns.has('reject_reason') ? 'reject_reason as rejectReason' : "'' as rejectReason",
      'create_time as createdAt',
      columns.has('reviewed_at') ? 'reviewed_at as reviewedAt' : '0 as reviewedAt',
    ];

    const [ submission ] = await app.model.query(
      `SELECT ${selectFields.join(', ')}
       FROM uied_website_submission WHERE id = ?`,
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    return submission || null;
  }

  /**
   * 获取提交列表（后台管理）
   */
  async list({ page = 1, pageSize = 20, status, url, serviceType }) {
    const { app } = this;
    const offset = (page - 1) * pageSize;
    await this.ensureFulfillmentSchema();
    const columns = await this.getSubmissionColumnSet();

    let whereClause = '1=1';
    const replacements = [];

    if (columns.has('is_delete')) {
      whereClause += ' AND is_delete = 0';
    }
    if (status) {
      whereClause += ' AND status = ?';
      replacements.push(status);
    }
    if (url) {
      whereClause += ' AND url LIKE ?';
      replacements.push(`%${String(url).trim()}%`);
    }
    const normalizedServiceType = this.normalizeServiceType(serviceType);
    if (serviceType && columns.has('service_type')) {
      if (
        [ 'top_recommendation', 'banner_slot' ].includes(normalizedServiceType)
        && columns.has('service_meta')
      ) {
        whereClause += ' AND service_type = ? AND service_meta LIKE ?';
        replacements.push('submission', `%"${normalizedServiceType}"%`);
      } else {
        whereClause += ' AND service_type = ?';
        replacements.push(normalizedServiceType);
      }
    }

    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_website_submission WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const submissions = await app.model.query(
      `SELECT * FROM uied_website_submission
       WHERE ${whereClause}
       ORDER BY create_time DESC
       LIMIT ? OFFSET ?`,
      { replacements: [ ...replacements, pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );
    const submissionIdList = submissions
      .map(item => Number(item?.id || 0))
      .filter(Boolean);
    const payOrderMap = new Map();
    if (submissionIdList.length > 0) {
      try {
        await this.ensurePayOrderTable();
        const orderRows = await app.model.query(
          `SELECT submission_id, order_no, pay_channel, amount, status, pay_time
           FROM uied_submission_pay_order
           WHERE submission_id IN (?)
           ORDER BY id DESC`,
          {
            replacements: [ submissionIdList ],
            type: app.Sequelize.QueryTypes.SELECT,
          }
        );
        orderRows.forEach(row => {
          const sid = Number(row?.submission_id || 0);
          if (!sid || payOrderMap.has(sid)) return;
          payOrderMap.set(sid, {
            payOrderNo: String(row?.order_no || ''),
            payChannel: String(row?.pay_channel || ''),
            payAmount: Number(row?.amount || 0),
            payStatus: String(row?.status || ''),
            payTime: Number(row?.pay_time || 0),
          });
        });
      } catch (error) {
        this.ctx.logger.warn('[submission] 读取支付订单信息失败:', error.message);
      }
    }

    return {
      lists: submissions.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        url: s.url,
        iconUrl: columns.has('icon_url') ? s.icon_url : null,
        categoryId: columns.has('category_id') ? s.category_id : null,
        tags: columns.has('tags') ? s.tags : null,
        submitterName: s.submitter_name,
        submitterEmail: s.submitter_email,
        submitterIp: s.submitter_ip,
        status: s.status,
        rejectReason: s.reject_reason,
        serviceType: columns.has('service_type')
          ? this.normalizeServiceType(s.service_type)
          : (String(s.description || '').includes('[运营需求]') ? 'submission' : 'submission'),
        serviceMeta: (() => {
          if (!columns.has('service_meta')) return null;
          const raw = s.service_meta;
          if (!raw) return null;
          return this.parseServiceMeta(raw);
        })(),
        fulfillmentStatus: columns.has('fulfillment_status')
          ? this.normalizeFulfillmentStatus(s.fulfillment_status)
          : 'pending_review',
        fulfillmentNote: columns.has('fulfillment_note') ? String(s.fulfillment_note || '') : '',
        fulfilledAt: columns.has('fulfilled_at') ? Number(s.fulfilled_at || 0) : 0,
        relatedWebsiteId: columns.has('related_website_id') ? Number(s.related_website_id || 0) : 0,
        relatedBannerId: columns.has('related_banner_id') ? Number(s.related_banner_id || 0) : 0,
        ...(payOrderMap.get(Number(s.id || 0)) || {
          payOrderNo: '',
          payChannel: '',
          payAmount: 0,
          payStatus: '',
          payTime: 0,
        }),
        createdAt: s.create_time,
        reviewedAt: s.reviewed_at,
      })),
      count: countResult.total,
      page,
      pageSize,
    };
  }

  /**
   * 获取待审核数量
   */
  async getPendingCount() {
    const { app } = this;

    const [ result ] = await app.model.query(
      "SELECT COUNT(*) as count FROM uied_website_submission WHERE status = 'pending'",
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    return result.count;
  }

  /**
   * 审核通过
   */
  async approve(id, categoryId) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    await this.ensureFulfillmentSchema();
    const columns = await this.getSubmissionColumnSet();

    // 获取提交记录
    const [ submission ] = await app.model.query(
      'SELECT * FROM uied_website_submission WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!submission) {
      throw new Error('未找到提交记录');
    }

    if (submission.status !== 'pending') {
      throw new Error('该提交已被处理');
    }

    const finalCategoryId = categoryId || submission.category_id;
    if (!finalCategoryId) {
      throw new Error('请选择分类');
    }

    const latestPayOrder = await this.getLatestPayOrderBySubmissionId(id);
    if (
      latestPayOrder
      && Number(latestPayOrder.amount || 0) > 0
      && ![ 'paid', 'free' ].includes(String(latestPayOrder.status || '').trim())
    ) {
      throw new Error('该投稿存在未支付订单，请先完成支付或手动补单后再审核通过');
    }

    const serviceMeta = this.parseServiceMeta(submission.service_meta);
    const addonKeys = this.resolvePaidAddonKeys(latestPayOrder, this.normalizeAddonKeys(serviceMeta?.addons || []));
    const isCommercialSubmission = serviceMeta?.entryMode === 'commercial_service' || String(submission.fulfillment_status || '') === 'pending_payment';
    if (isCommercialSubmission && addonKeys.length > 0 && !latestPayOrder) {
      throw new Error('该商业服务投稿缺少支付订单，请重新提交或联系技术处理');
    }
    if (
      isCommercialSubmission
      && latestPayOrder
      && Number(latestPayOrder.amount || 0) > 0
      && String(latestPayOrder.status || '').trim() !== 'paid'
    ) {
      throw new Error('该投稿订单未支付，不能审核通过');
    }
    const needTopRecommendation = addonKeys.includes('top_recommendation');
    const needBannerFulfillment = addonKeys.includes('banner_slot');

    // 创建网站
    const result = await app.model.query(
      `INSERT INTO uied_website 
       (name, description, url, icon_url, category_id, tags, is_new, is_featured, is_pinned, sort, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          submission.name,
          submission.description || '',
          submission.url,
          submission.icon_url,
          finalCategoryId,
          submission.tags || '',
          needTopRecommendation ? 1 : 0,
          needTopRecommendation ? 1 : 0,
          needTopRecommendation ? 0 : 10,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );
    let websiteId = Array.isArray(result) ? result[0] : result;
    if (Array.isArray(websiteId)) {
      websiteId = websiteId[0];
    }
    websiteId = Number(websiteId || 0);

    // 更新提交状态
    const fulfillmentStatus = needBannerFulfillment ? 'pending_fulfillment' : 'fulfilled';
    const fulfillmentNote = needBannerFulfillment
      ? '审核通过，等待 Banner 排期履约'
      : (needTopRecommendation ? '审核通过，基础收录与置顶推荐已自动履约' : '审核通过，基础收录已自动履约');
    const updates = [ "status = 'approved'", 'update_time = ?' ];
    const replacements = [ now ];
    if (columns.has('reviewed_at')) {
      updates.push('reviewed_at = ?');
      replacements.push(now);
    }
    if (columns.has('category_id')) {
      updates.push('category_id = ?');
      replacements.push(finalCategoryId);
    }
    if (columns.has('fulfillment_status')) {
      updates.push('fulfillment_status = ?');
      replacements.push(fulfillmentStatus);
    }
    if (columns.has('fulfillment_note')) {
      updates.push('fulfillment_note = ?');
      replacements.push(fulfillmentNote);
    }
    if (columns.has('fulfilled_at')) {
      updates.push('fulfilled_at = ?');
      replacements.push(fulfillmentStatus === 'fulfilled' ? now : 0);
    }
    if (columns.has('related_website_id')) {
      updates.push('related_website_id = ?');
      replacements.push(websiteId);
    }
    replacements.push(id);
    await app.model.query(
      `UPDATE uied_website_submission SET ${updates.join(', ')} WHERE id = ?`,
      { replacements, type: app.Sequelize.QueryTypes.UPDATE }
    );
    await this.appendFulfillmentLog(id, {
      orderNo: latestPayOrder?.orderNo || '',
      action: 'approve',
      fromStatus: submission.fulfillment_status || '',
      toStatus: fulfillmentStatus,
      note: fulfillmentNote,
    });

    return {
      message: needBannerFulfillment ? '审核通过，网站已添加，Banner 等待履约' : '审核通过，网站已添加并完成履约',
      websiteId,
      fulfillmentStatus,
    };
  }

  /**
   * 审核拒绝
   */
  async reject(id, reason) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    await this.ensureFulfillmentSchema();
    const columns = await this.getSubmissionColumnSet();

    // 检查提交记录
    const selectFields = [ 'status' ];
    if (columns.has('fulfillment_status')) {
      selectFields.push('fulfillment_status');
    } else {
      selectFields.push("'pending_review' AS fulfillment_status");
    }
    const [ submission ] = await app.model.query(
      `SELECT ${selectFields.join(', ')} FROM uied_website_submission WHERE id = ?`,
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!submission) {
      throw new Error('未找到提交记录');
    }

    if (submission.status !== 'pending') {
      throw new Error('该提交已被处理');
    }

    const finalReason = String(reason || '不符合收录标准').trim();
    const updates = [ "status = 'rejected'", 'update_time = ?' ];
    const replacements = [ now ];
    if (columns.has('reject_reason')) {
      updates.push('reject_reason = ?');
      replacements.push(finalReason);
    }
    if (columns.has('reviewed_at')) {
      updates.push('reviewed_at = ?');
      replacements.push(now);
    }
    if (columns.has('fulfillment_status')) {
      updates.push("fulfillment_status = 'rejected'");
    }
    if (columns.has('fulfillment_note')) {
      updates.push('fulfillment_note = ?');
      replacements.push(finalReason);
    }
    replacements.push(id);
    await app.model.query(
      `UPDATE uied_website_submission SET ${updates.join(', ')} WHERE id = ?`,
      { replacements, type: app.Sequelize.QueryTypes.UPDATE }
    );
    await this.appendFulfillmentLog(id, {
      action: 'reject',
      fromStatus: submission.fulfillment_status || '',
      toStatus: 'rejected',
      note: finalReason,
    });

    return { message: '已拒绝' };
  }

  /**
   * 人工标记服务履约完成，主要用于 Banner 排期、定制沟通等无法自动完成的加购服务。
   */
  async fulfill(id, note = '', operatorId = 0) {
    const { app } = this;
    const submissionId = Number(id || 0);
    if (!submissionId) {
      throw new Error('缺少提交ID');
    }
    await this.ensureFulfillmentSchema();
    const columns = await this.getSubmissionColumnSet();
    const selectFields = [ 'id', 'status' ];
    if (columns.has('fulfillment_status')) {
      selectFields.push('fulfillment_status');
    } else {
      selectFields.push("'pending_review' AS fulfillment_status");
    }
    const [ submission ] = await app.model.query(
      `SELECT ${selectFields.join(', ')} FROM uied_website_submission WHERE id = ? LIMIT 1`,
      { replacements: [ submissionId ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!submission) {
      throw new Error('未找到提交记录');
    }
    if (submission.status === 'rejected') {
      throw new Error('已拒绝的投稿不能标记履约');
    }
    if (submission.status !== 'approved') {
      throw new Error('请先审核通过后再标记履约');
    }
    const latestPayOrder = await this.getLatestPayOrderBySubmissionId(submissionId);
    if (
      latestPayOrder
      && Number(latestPayOrder.amount || 0) > 0
      && ![ 'paid', 'free' ].includes(String(latestPayOrder.status || '').trim())
    ) {
      throw new Error('该投稿订单未支付，不能标记履约');
    }
    const fulfillmentNote = String(note || '').trim().slice(0, 255) || '人工确认服务已履约';
    await this.updateSubmissionFulfillment(submissionId, {
      status: 'fulfilled',
      orderNo: latestPayOrder?.orderNo || '',
      action: 'manual_fulfill',
      note: fulfillmentNote,
      operatorId,
    });
    return { message: '已标记履约完成', fulfillmentStatus: 'fulfilled' };
  }

  /**
   * 删除提交记录
   */
  async del(id) {
    const { app } = this;

    await app.model.query(
      'DELETE FROM uied_website_submission WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.DELETE }
    );
  }

  /**
   * 更新提交记录
   */
  async edit(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const columns = await this.getSubmissionColumnSet();

    const updates = [];
    const values = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (columns.has('icon_url') && data.iconUrl !== undefined) { updates.push('icon_url = ?'); values.push(data.iconUrl); }
    if (columns.has('category_id') && data.categoryId !== undefined) { updates.push('category_id = ?'); values.push(data.categoryId); }
    if (columns.has('tags') && data.tags !== undefined) { updates.push('tags = ?'); values.push(data.tags); }
    if (columns.has('service_type') && data.serviceType !== undefined) {
      updates.push('service_type = ?');
      values.push(this.normalizeServiceType(data.serviceType));
    }
    if (columns.has('service_meta') && data.serviceMeta !== undefined) {
      updates.push('service_meta = ?');
      const serviceMeta = this.normalizeServiceMeta(data.serviceMeta);
      values.push(serviceMeta ? JSON.stringify(serviceMeta) : null);
    }

    if (columns.has('update_time')) {
      updates.push('update_time = ?');
      values.push(now);
    }
    if (updates.length === 0) return data;
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_website_submission SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    return data;
  }
}

module.exports = SubmissionService;
