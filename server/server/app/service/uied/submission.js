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
      return new Set([ 'id', 'name', 'description', 'url', 'status', 'submitter_name', 'submitter_email', 'submitter_ip', 'create_time', 'update_time' ]);
    }
  }

  /**
   * 标准化服务类型
   */
  normalizeServiceType(serviceType) {
    return String(serviceType || '').trim().toLowerCase() === 'paid_boost' ? 'paid_boost' : 'ai_growth';
  }

  /**
   * 标准化推广元信息
   */
  normalizeServiceMeta(serviceMeta) {
    if (!serviceMeta || typeof serviceMeta !== 'object') return null;
    const plan = String(serviceMeta.plan || '').trim();
    const budget = String(serviceMeta.budget || '').trim();
    const target = String(serviceMeta.target || '').trim();
    const contact = String(serviceMeta.contact || '').trim();
    const normalized = { plan, budget, target, contact };
    return Object.values(normalized).some(Boolean) ? normalized : null;
  }

  /**
   * 当数据库未扩展 service_meta 字段时，将推广信息追加到描述文本兜底保存
   */
  buildFallbackDescription(description, serviceType, serviceMeta) {
    const baseDescription = String(description || '').trim();
    if (serviceType !== 'paid_boost' || !serviceMeta) {
      return baseDescription;
    }
    const lines = [
      '[推广需求]',
      `套餐: ${serviceMeta.plan || '-'}`,
      `预算: ${serviceMeta.budget || '-'}`,
      `目标: ${serviceMeta.target || '-'}`,
      `联系方式: ${serviceMeta.contact || '-'}`,
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
        service_type varchar(32) NOT NULL DEFAULT 'paid_boost',
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
    this._payOrderTableReady = true;
  }

  /**
   * 为指定投稿创建支付订单
   */
  async createPayOrder(data = {}) {
    const { app, ctx } = this;
    const serviceType = this.normalizeServiceType(data.serviceType || 'paid_boost');
    const payChannel = this.normalizePayChannel(data.payChannel);
    if (!payChannel) {
      throw new Error('请选择支付渠道');
    }
    const config = await this.getSubmissionServiceConfig();
    if (config?.enabled === false) {
      throw new Error('投稿服务暂未开放');
    }
    const serviceConfig = serviceType === 'paid_boost'
      ? (config?.paidBoostService || {})
      : (config?.aiGrowthService || {});
    if (serviceConfig?.enabled === false) {
      throw new Error('当前服务暂未开启');
    }
    const amount = Math.max(0, Number(serviceConfig?.price || 0));
    const paymentConfig = config?.payment || {};
    if (amount > 0 && paymentConfig?.enabled !== true) {
      throw new Error('支付功能未开启，请联系管理员');
    }
    if (amount > 0 && payChannel === 'alipay' && !(paymentConfig?.allowAlipay && paymentConfig?.alipay?.enabled)) {
      throw new Error('支付宝支付暂未开启');
    }
    if (amount > 0 && payChannel === 'wechat' && !(paymentConfig?.allowWechat && paymentConfig?.wechat?.enabled)) {
      throw new Error('微信支付暂未开启');
    }

    const submitPayload = {
      ...data,
      serviceType,
      serviceMeta: this.normalizeServiceMeta({
        ...(data?.serviceMeta || {}),
        plan: data?.serviceMeta?.plan || data?.promotionPlan || data?.plan || '',
        budget: data?.serviceMeta?.budget || data?.promotionBudget || data?.budget || '',
        target: data?.serviceMeta?.target || data?.promotionTarget || data?.target || '',
        contact: data?.serviceMeta?.contact || data?.promotionContact || data?.contact || '',
      }),
    };
    const submissionResult = await this.submit(submitPayload);
    const submissionId = Number(submissionResult?.id || 0);
    if (!submissionId) {
      throw new Error('创建投稿记录失败');
    }

    await this.ensurePayOrderTable();
    const now = Math.floor(Date.now() / 1000);
    const orderNo = `SUBP${Date.now()}${this.randomString(6).toUpperCase()}`;
    const expireMinutes = Number(paymentConfig?.orderExpireMinutes || 30);
    const subject = String(serviceConfig?.label || '投稿推广服务').trim() || '投稿推广服务';
    const body = String(data?.name || data?.url || '').trim().slice(0, 120);

    let payUrl = '';
    let rawResponse = null;
    let status = 'created';
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
       (order_no, submission_id, service_type, pay_channel, amount, status, pay_url, raw_response, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          orderNo,
          submissionId,
          serviceType,
          payChannel,
          Number(amount.toFixed(2)),
          status,
          payUrl || null,
          rawResponse ? JSON.stringify(rawResponse) : null,
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
      message: amount > 0 ? '支付订单创建成功' : '已提交成功（免费服务）',
    };
  }

  /**
   * 查询投稿支付订单状态
   */
  async getPayOrderStatus(orderNo) {
    const { app } = this;
    await this.ensurePayOrderTable();
    const no = String(orderNo || '').trim();
    if (!no) {
      throw new Error('缺少订单号');
    }
    const [ row ] = await app.model.query(
      `SELECT id, order_no, submission_id, service_type, pay_channel, amount, status, pay_url, transaction_id, pay_time, create_time, update_time
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
      status: String(row.status || ''),
      payUrl: String(row.pay_url || ''),
      transactionId: String(row.transaction_id || ''),
      payTime: Number(row.pay_time || 0),
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
    const now = Math.floor(Date.now() / 1000);
    await app.model.query(
      `UPDATE uied_submission_pay_order
       SET status = 'paid',
           transaction_id = ?,
           raw_response = ?,
           pay_time = ?,
           update_time = ?
       WHERE order_no = ?`,
      {
        replacements: [
          String(transactionId || '').trim() || null,
          rawResponse ? JSON.stringify(rawResponse) : null,
          now,
          now,
          no,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
    return await this.getPayOrderStatus(no);
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
    const config = await this.getSubmissionServiceConfig();
    const payment = config?.payment || {};
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
      `<xml>` +
      `<return_code><![CDATA[${String(returnCode || 'SUCCESS')}]]></return_code>` +
      `<return_msg><![CDATA[${String(returnMsg || 'OK')}]]></return_msg>` +
      `</xml>`
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
    const config = await this.getSubmissionServiceConfig();
    const payment = config?.payment || {};
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
    const now = Math.floor(Date.now() / 1000);
    const serviceType = this.normalizeServiceType(data.serviceType);
    const serviceMeta = this.normalizeServiceMeta(data.serviceMeta);
    const columns = await this.getSubmissionColumnSet();

    // 收录服务才做重复拦截；付费加热允许对已收录站点继续提交推广诉求
    if (serviceType !== 'paid_boost') {
      const checkResult = await this.checkUrl(data.url);
      if (checkResult.exists) {
        throw new Error(checkResult.message);
      }
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

    if (columns.has('icon_url')) insertPayload.icon_url = data.iconUrl || null;
    if (columns.has('category_id')) insertPayload.category_id = data.categoryId || null;
    if (columns.has('tags')) insertPayload.tags = data.tags || null;
    if (columns.has('service_type')) insertPayload.service_type = serviceType;
    if (columns.has('service_meta')) insertPayload.service_meta = serviceMeta ? JSON.stringify(serviceMeta) : null;

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

    const [ submission ] = await app.model.query(
      `SELECT id, name, url, status, reject_reason as rejectReason, 
              create_time as createdAt, reviewed_at as reviewedAt
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
      whereClause += ' AND service_type = ?';
      replacements.push(normalizedServiceType);
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
          : (String(s.description || '').includes('[推广需求]') ? 'paid_boost' : 'ai_growth'),
        serviceMeta: (() => {
          if (!columns.has('service_meta')) return null;
          const raw = s.service_meta;
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch (error) {
            return null;
          }
        })(),
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

    // 创建网站
    await app.model.query(
      `INSERT INTO uied_website 
       (name, description, url, icon_url, category_id, tags, is_new, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      {
        replacements: [
          submission.name,
          submission.description || '',
          submission.url,
          submission.icon_url,
          finalCategoryId,
          submission.tags || '',
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    // 更新提交状态
    await app.model.query(
      "UPDATE uied_website_submission SET status = 'approved', reviewed_at = ?, update_time = ? WHERE id = ?",
      { replacements: [ now, now, id ], type: app.Sequelize.QueryTypes.UPDATE }
    );

    return { message: '审核通过，网站已添加' };
  }

  /**
   * 审核拒绝
   */
  async reject(id, reason) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    // 检查提交记录
    const [ submission ] = await app.model.query(
      'SELECT status FROM uied_website_submission WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!submission) {
      throw new Error('未找到提交记录');
    }

    if (submission.status !== 'pending') {
      throw new Error('该提交已被处理');
    }

    await app.model.query(
      "UPDATE uied_website_submission SET status = 'rejected', reject_reason = ?, reviewed_at = ?, update_time = ? WHERE id = ?",
      { replacements: [ reason || '不符合收录标准', now, now, id ], type: app.Sequelize.QueryTypes.UPDATE }
    );

    return { message: '已拒绝' };
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
