/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-05
 */
/**
 * @file service/uied/articleInteraction.js
 * @description UIED 文章点赞交互服务
 */

'use strict';

const Service = require('egg').Service;

class ArticleInteractionService extends Service {
  /**
   * 解析正整数，避免非法入参直接落库。
   * @param {unknown} value 原始值
   * @param {number} defaultValue 默认值
   * @returns {number} 规范化后的正整数
   */
  parsePositiveInt(value, defaultValue = 0) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return defaultValue;
    }
    return parsed;
  }

  /**
   * 确保 UIED 文章点赞表存在，便于新环境直接可用。
   * @returns {Promise<void>}
   */
  async ensureLikeTable() {
    const { app } = this;
    const cacheKey = '__uiedArticleLikeTableReady__';
    if (app[cacheKey] === true) return;
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_article_like\` (
        \`id\` int unsigned NOT NULL AUTO_INCREMENT,
        \`article_id\` int unsigned NOT NULL DEFAULT 0,
        \`user_id\` int unsigned NOT NULL DEFAULT 0,
        \`is_delete\` tinyint unsigned NOT NULL DEFAULT 0,
        \`create_time\` int unsigned NOT NULL DEFAULT 0,
        \`update_time\` int unsigned NOT NULL DEFAULT 0,
        \`delete_time\` int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_article_user\` (\`article_id\`, \`user_id\`),
        KEY \`idx_article_delete\` (\`article_id\`, \`is_delete\`),
        KEY \`idx_user_delete\` (\`user_id\`, \`is_delete\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='UIED文章点赞表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    app[cacheKey] = true;
  }

  /**
   * 校验文章是否为可公开访问的 UIED 文章。
   * @param {number} articleId 文章ID
   * @returns {Promise<{id:number,title:string}>} 文章基础信息
   */
  async ensurePublicArticle(articleId) {
    const { app } = this;
    const normalizedArticleId = this.parsePositiveInt(articleId, 0);
    if (!normalizedArticleId) {
      throw new Error('文章ID不能为空');
    }
    const [ row ] = await app.model.query(
      `SELECT id, title
       FROM uied_article
       WHERE id = ?
         AND is_delete = 0
         AND status = 'published'
       LIMIT 1`,
      {
        replacements: [ normalizedArticleId ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!row?.id) {
      throw new Error('文章不存在或未发布');
    }
    return {
      id: this.parsePositiveInt(row.id, 0),
      title: String(row.title || ''),
    };
  }

  /**
   * 读取当前前台登录用户ID，复用现有登录态解析逻辑。
   * @param {boolean} required 是否强制要求登录
   * @returns {Promise<number>} 用户ID，未登录时返回 0
   */
  async getFrontendUserId(required = false) {
    return await this.ctx.service.article.getFrontendUserId(required);
  }

  /**
   * 读取文章点赞汇总与当前用户点赞状态。
   * @param {number} articleId 文章ID
   * @returns {Promise<{articleId:number, likeCount:number, isLike:boolean}>}
   */
  async getLikeSummary(articleId) {
    const { app } = this;
    const article = await this.ensurePublicArticle(articleId);
    await this.ensureLikeTable();
    const currentUserId = await this.getFrontendUserId(false);
    const [ aggregate ] = await app.model.query(
      `SELECT COUNT(1) AS likeCount
       FROM uied_article_like
       WHERE article_id = ?
         AND is_delete = 0`,
      {
        replacements: [ article.id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    let isLike = false;
    if (currentUserId > 0) {
      const [ self ] = await app.model.query(
        `SELECT id
         FROM uied_article_like
         WHERE article_id = ?
           AND user_id = ?
           AND is_delete = 0
         LIMIT 1`,
        {
          replacements: [ article.id, currentUserId ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      isLike = Boolean(self?.id);
    }
    return {
      articleId: article.id,
      likeCount: Number(aggregate?.likeCount || 0),
      isLike,
    };
  }

  /**
   * 切换当前登录用户的文章点赞状态，并返回最新汇总。
   * @param {number} articleId 文章ID
   * @returns {Promise<{articleId:number, liked:boolean, isLike:boolean, likeCount:number}>}
   */
  async toggleLike(articleId) {
    const { app } = this;
    const article = await this.ensurePublicArticle(articleId);
    await this.ensureLikeTable();
    const currentUserId = await this.getFrontendUserId(true);
    const now = Math.floor(Date.now() / 1000);
    const [ current ] = await app.model.query(
      `SELECT id, is_delete
       FROM uied_article_like
       WHERE article_id = ?
         AND user_id = ?
       LIMIT 1`,
      {
        replacements: [ article.id, currentUserId ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    let liked = true;
    if (current?.id) {
      const nextDelete = Number(current.is_delete || 0) === 1 ? 0 : 1;
      await app.model.query(
        `UPDATE uied_article_like
         SET is_delete = ?, update_time = ?, delete_time = ?
         WHERE id = ?`,
        {
          replacements: [
            nextDelete,
            now,
            nextDelete === 1 ? now : 0,
            this.parsePositiveInt(current.id, 0),
          ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      liked = nextDelete === 0;
    } else {
      await app.model.query(
        `INSERT INTO uied_article_like
         (article_id, user_id, is_delete, create_time, update_time, delete_time)
         VALUES (?, ?, 0, ?, ?, 0)`,
        {
          replacements: [ article.id, currentUserId, now, now ],
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );
      liked = true;
    }

    const summary = await this.getLikeSummary(article.id);
    return {
      articleId: article.id,
      liked,
      isLike: liked,
      likeCount: summary.likeCount,
    };
  }
}

module.exports = ArticleInteractionService;
