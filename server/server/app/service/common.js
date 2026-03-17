'use strict';

const Service = require('egg').Service;
const { version, publicUrl } = require('../extend/config');
const util = require('../util/urlUtil');

class CommonService extends Service {
  /**
   * 获取当天起始时间戳（秒）
   * @param {number} offsetDays 相对天数偏移，0=今天，-1=昨天
   * @return {number}
   */
  getDayStartUnix(offsetDays = 0) {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(offsetDays || 0), 0, 0, 0, 0);
    return Math.floor(dayStart.getTime() / 1000);
  }

  /**
   * 生成最近 N 天日期标签（yyyy-MM-dd）
   * @param {number} days 天数
   * @return {string[]}
   */
  buildRecentDateLabels(days = 15) {
    const safeDays = Math.max(1, Number(days || 15));
    const rows = [];
    for (let i = safeDays - 1; i >= 0; i--) {
      const current = new Date();
      current.setDate(current.getDate() - i);
      rows.push(current.toISOString().slice(0, 10));
    }
    return rows;
  }

  /**
   * 安全转整数，避免 SQL 结果为 null/字符串时前端展示异常。
   * @param {unknown} value 原始值
   * @return {number}
   */
  toSafeInt(value) {
    const parsed = Number.parseInt(String(value ?? 0), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * 安全执行统计 SQL，表缺失或字段差异时返回默认零值，避免工作台接口整体失败。
   * @param {string} sql SQL 语句
   * @param {any[]} replacements 绑定参数
   * @return {Promise<{total:number,todayCount:number}>}
   */
  async safeQueryOverviewRow(sql, replacements = []) {
    try {
      const rows = await this.app.model.query(sql, {
        replacements,
        type: this.app.Sequelize.QueryTypes.SELECT,
      });
      const row = (Array.isArray(rows) && rows[0]) || {};
      return {
        total: this.toSafeInt(row.total),
        todayCount: this.toSafeInt(row.todayCount),
      };
    } catch (error) {
      this.ctx.logger.warn('[common.getConsole] 工作台统计查询失败，已降级: %s', error?.message || error);
      return { total: 0, todayCount: 0 };
    }
  }

  /**
   * 聚合工作台核心统计（网站/文章/评论/后台登录）
   * @return {Promise<object>}
   */
  async getWorkbenchOverviewStats() {
    const startOfToday = this.getDayStartUnix(0);
    const [ websiteStats, articleStats, websiteCommentStats, articleCommentStats, loginStats ] = await Promise.all([
      this.safeQueryOverviewRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) AS todayCount
         FROM uied_website
         WHERE is_delete = 0`,
        [ startOfToday ]
      ),
      this.safeQueryOverviewRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) AS todayCount
         FROM uied_article
         WHERE is_delete = 0`,
        [ startOfToday ]
      ),
      this.safeQueryOverviewRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) AS todayCount
         FROM uied_website_comment
         WHERE is_delete = 0`,
        [ startOfToday ]
      ),
      this.safeQueryOverviewRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) AS todayCount
         FROM uied_article_comment
         WHERE is_delete = 0`,
        [ startOfToday ]
      ),
      this.safeQueryOverviewRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) AS todayCount
         FROM la_system_log_login
         WHERE status = 1`,
        [ startOfToday ]
      ),
    ]);

    return {
      websiteToday: this.toSafeInt(websiteStats.todayCount),
      websiteTotal: this.toSafeInt(websiteStats.total),
      articleToday: this.toSafeInt(articleStats.todayCount),
      articleTotal: this.toSafeInt(articleStats.total),
      commentToday: this.toSafeInt(websiteCommentStats.todayCount) + this.toSafeInt(articleCommentStats.todayCount),
      commentTotal: this.toSafeInt(websiteCommentStats.total) + this.toSafeInt(articleCommentStats.total),
      adminLoginToday: this.toSafeInt(loginStats.todayCount),
      adminLoginTotal: this.toSafeInt(loginStats.total),
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };
  }

  /**
   * 获取最近 N 天后台登录趋势（用于工作台折线图）
   * @param {number} days 统计天数
   * @return {Promise<{date:string[], list:number[]}>}
   */
  async getWorkbenchVisitorTrend(days = 15) {
    const safeDays = Math.max(1, Number(days || 15));
    const labels = this.buildRecentDateLabels(safeDays);
    const startUnix = this.getDayStartUnix(-(safeDays - 1));
    const { QueryTypes } = this.app.Sequelize;

    let rows = [];
    try {
      rows = await this.app.model.query(
        `SELECT DATE_FORMAT(FROM_UNIXTIME(create_time), '%Y-%m-%d') AS statDate,
                COUNT(*) AS total
         FROM la_system_log_login
         WHERE status = 1
           AND create_time >= ?
         GROUP BY statDate
         ORDER BY statDate ASC`,
        { replacements: [ startUnix ], type: QueryTypes.SELECT }
      );
    } catch (error) {
      this.ctx.logger.warn('[common.getConsole] 登录趋势统计失败，已降级: %s', error?.message || error);
      rows = [];
    }

    const statMap = new Map();
    (Array.isArray(rows) ? rows : []).forEach(item => {
      statMap.set(String(item.statDate || ''), this.toSafeInt(item.total));
    });

    return {
      date: labels,
      list: labels.map(label => this.toSafeInt(statMap.get(label) || 0)),
    };
  }

  /**
   * 获取控制台工作台数据
   * @return {Promise<object>}
   */
  async getConsole() {
    try {
      // 版本信息
      const name = await this.getVal('website', 'name', 'UIED 导航管理系统');
      const versionInfo = {
        name,
        version,
        website: 'www.tomda.top',
        based: 'Vue3.x、Element Plus、Egg.js、MySQL',
        channel: {
          website: 'https://www.tomda.top',
          docs: 'https://fsuied.com',
        },
      };

      /**
       * 工作台数据全部改为实时统计，避免继续展示历史演示数据。
       */
      const overview = await this.getWorkbenchOverviewStats();
      const visitor = await this.getWorkbenchVisitorTrend(15);
      const today = {
        time: overview.updatedAt,
        // 保持字段兼容：后台页面仍读取 todayVisits/todaySales/todayOrder/todayUsers
        todayVisits: overview.websiteToday,
        totalVisits: overview.websiteTotal,
        todaySales: overview.articleToday,
        totalSales: overview.articleTotal,
        todayOrder: overview.commentToday,
        totalOrder: overview.commentTotal,
        todayUsers: overview.adminLoginToday,
        totalUsers: overview.adminLoginTotal,
      };

      return {
        version: versionInfo,
        today,
        visitor,
      };
    } catch (err) {
      throw new Error(`IndexService.console error: ${err}`);
    }
  }

  /**
   * 获取后台站点配置
   * @return {Promise<object>}
   */
  async getConfig() {
    try {
      const website = await this.get('website');
      const copyrightStr = await this.getVal('website', 'copyright', '');
      let copyright = [];
      if (copyrightStr) {
        copyright = JSON.parse(copyrightStr);
      }
      return {
        webName: website.name,
        webLogo: util.toAbsoluteUrl(website.logo),
        webFavicon: util.toAbsoluteUrl(website.favicon),
        webBackdrop: util.toAbsoluteUrl(website.backdrop),
        ossDomain: publicUrl,
        copyright,
      };
    } catch (err) {
      throw new Error(`IndexService.config error: ${err}`);
    }
  }

  /**
   * 获取指定配置值（支持默认值）
   * @param {string} cnfType
   * @param {string} name
   * @param {any} defaultVal
   * @return {Promise<any>}
   */
  async getVal(cnfType, name, defaultVal) {
    try {
      const config = await this.get(cnfType, name);
      let data = config[name];
      if (!data) {
        data = defaultVal;
      }
      return data;
    } catch (err) {
      throw new Error(`ConfigUtilService.getVal error: ${err}`);
    }
  }

  /**
   * 获取指定配置并解析为对象
   * @param {string} cnfType
   * @param {string} name
   * @return {Promise<object>}
   */
  async getMap(cnfType, name) {
    try {
      const val = await this.getVal(cnfType, name, '');
      if (val === '') {
        return {};
      }
      const data = JSON.parse(val);
      return data;
    } catch (err) {
      throw new Error(`ConfigUtilService.getMap error: ${err}`);
    }
  }

  /**
   * 查询配置项
   * @param {string} cnfType
   * @param {string} name
   * @return {Promise<object>}
   */
  async get(cnfType, name) {
    const { ctx } = this;
    try {
      const object = {
        type: cnfType,
        ...(name && { name }),
      };
      const configs = await ctx.model.SystemConfig.findAll({
        where: object,
      });
      const data = {};
      for (const config of configs) {
        data[config.name] = config.value;
      }
      return data;
    } catch (err) {
      throw new Error(`ConfigUtilService.get error: ${err}`);
    }
  }

  /**
   * 保存单个配置项
   * @param {string} cnfType
   * @param {string} name
   * @param {string} val
   * @return {Promise<void>}
   */
  async set(cnfType, name, val) {
    const { ctx } = this;
    const { SystemConfig } = ctx.model;

    try {
      let config = await SystemConfig.findOne({
        where: { type: cnfType, name },
      });

      if (!config) {
        config = await SystemConfig.create({ type: cnfType, name });
      }

      await config.update({ value: val });

      ctx.status = 200;
    } catch (err) {
      throw new Error('Internal server error');
    }
  }
}


module.exports = CommonService;
