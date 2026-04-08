'use strict';

const Service = require('egg').Service;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const util = require('../util');
const urlUtil = require('../util/urlUtil');
const path = require('path');
const { reqAdminIdKey, superAdminId } = require('../extend/config');
const fs = require('fs');
// 异步二进制 写入流
const awaitWriteStream = require('await-stream-ready').write;
// 管道读入一个虫洞。
const sendToWormhole = require('stream-wormhole');
const mkdirp = require('mkdirp');
const dayjs = require('dayjs');
const crypto = require('crypto');
const Jimp = require('jimp');

class AlbumService extends Service {
  async cateList(listReq) {
    const { ctx } = this;

    const { type, name } = listReq;

    const where = {
      isDelete: 0,
    };

    if (type > 0) {
      where.type = type;
    }

    if (name) {
      where.name = { [Op.like]: `%${name}%` };
    }

    const cates = await ctx.model.AlbumCate.findAll({
      where,
      order: [[ 'id', 'DESC' ]],
    });

    const cateResps = cates.map(cate => {
      const cateResp = cate;
      return cateResp;
    });

    const mapList = util.listToTree(
      util.structsToMaps(cateResps),
      'id',
      'pid',
      'children'
    );

    return mapList;
  }

  async cateAdd(addReq) {
    const { ctx } = this;
    try {
      const dateTime = Math.floor(Date.now() / 1000);
      const timeObject = {
        createTime: dateTime,
        updateTime: dateTime,
      };
      const cate = new ctx.model.AlbumCate();

      Object.assign(cate, addReq, timeObject);

      await cate.save();
    } catch (err) {
      throw new Error('CateAdd Create err');
    }
  }

  async cateRename(id, name) {
    const { ctx } = this;
    try {
      const cate = await ctx.model.AlbumCate.findOne({
        where: {
          id,
          isDelete: 0,
        },
      });

      if (!cate) {
        throw new Error('分类已不存在！');
      }

      cate.name = name;

      await cate.save();
    } catch (err) {
      throw new Error('CateRename Save err');
    }
  }

  async cateDel(id) {
    const { ctx } = this;
    try {
      const cate = await ctx.model.AlbumCate.findOne({
        where: {
          id,
          isDelete: 0,
        },
      });

      if (!cate) {
        throw new Error('分类已不存在！');
      }

      const albumCount = await ctx.model.Album.count({
        where: {
          cid: id,
          isDelete: 0,
        },
      });

      if (albumCount > 0) {
        throw new Error('当前分类正被使用中，不能删除！');
      }

      cate.isDelete = 1;
      cate.deleteTime = Math.floor(Date.now() / 1000);

      await cate.save();
    } catch (err) {
      throw new Error('CateDel Save err');
    }
  }

  /**
   * 将输入值规范化为指定长度内的字符串。
   * @param {any} value - 原始值
   * @param {number} maxLength - 最大长度
   * @return {string}
   */
  normalizeText(value, maxLength = 255) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.slice(0, Math.max(1, Number(maxLength || 255)));
  }

  /**
   * 统一元数据入参，避免脏值入库。
   * @param {Record<string, any>} payload - 原始元数据
   * @return {{alt:string,title:string,caption:string,description:string,mimeType:string,width:number,height:number}}
   */
  normalizeAlbumMetaPayload(payload = {}) {
    const width = Math.max(0, Number.parseInt(String(payload.width || 0), 10) || 0);
    const height = Math.max(0, Number.parseInt(String(payload.height || 0), 10) || 0);
    return {
      alt: this.normalizeText(payload.alt, 255),
      title: this.normalizeText(payload.title, 255),
      caption: this.normalizeText(payload.caption, 255),
      description: this.normalizeText(payload.description, 4000),
      mimeType: this.normalizeText(payload.mimeType, 100),
      width,
      height,
    };
  }

  /**
   * 获取素材中心图片压缩默认配置。
   * @return {{enabled:boolean,applyOnLocalUpload:boolean,applyOnRemoteTransfer:boolean,remoteNamePattern:string,minSizeKb:number,maxWidth:number,maxHeight:number,jpegQuality:number,pngCompressionLevel:number}}
   */
  getDefaultMaterialUploadConfig() {
    return {
      enabled: false,
      applyOnLocalUpload: true,
      applyOnRemoteTransfer: true,
      minSizeKb: 200,
      maxWidth: 2560,
      maxHeight: 2560,
      jpegQuality: 82,
      pngCompressionLevel: 9,
      remoteNamePattern: '%random%-%date%',
    };
  }

  /**
   * 规范化素材中心图片压缩配置，避免异常值导致上传失败。
   * @param {Record<string, any>} config - 原始配置
   * @return {{enabled:boolean,applyOnLocalUpload:boolean,applyOnRemoteTransfer:boolean,remoteNamePattern:string,minSizeKb:number,maxWidth:number,maxHeight:number,jpegQuality:number,pngCompressionLevel:number}}
   */
  normalizeMaterialUploadConfig(config = {}) {
    const defaults = this.getDefaultMaterialUploadConfig();
    const source = config && typeof config === 'object' ? config : {};
    const clampInt = (value, min, max, fallback) => {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    };
    return {
      enabled: source.enabled === true,
      applyOnLocalUpload: source.applyOnLocalUpload !== false,
      applyOnRemoteTransfer: source.applyOnRemoteTransfer !== false,
      minSizeKb: clampInt(source.minSizeKb, 0, 51200, defaults.minSizeKb),
      maxWidth: clampInt(source.maxWidth, 0, 8192, defaults.maxWidth),
      maxHeight: clampInt(source.maxHeight, 0, 8192, defaults.maxHeight),
      jpegQuality: clampInt(source.jpegQuality, 40, 100, defaults.jpegQuality),
      pngCompressionLevel: clampInt(source.pngCompressionLevel, 0, 9, defaults.pngCompressionLevel),
      remoteNamePattern: String(source.remoteNamePattern || defaults.remoteNamePattern)
        .trim()
        .slice(0, 120) || defaults.remoteNamePattern,
    };
  }

  /**
   * 读取素材中心图片压缩配置（后台可配置）。
   * @return {Promise<{enabled:boolean,applyOnLocalUpload:boolean,applyOnRemoteTransfer:boolean,remoteNamePattern:string,minSizeKb:number,maxWidth:number,maxHeight:number,jpegQuality:number,pngCompressionLevel:number}>}
   */
  async getMaterialUploadConfig() {
    const { ctx } = this;
    try {
      const raw = await ctx.service.uied.setting.get('materialUploadConfig');
      return this.normalizeMaterialUploadConfig(raw || {});
    } catch (error) {
      ctx.logger.warn(`[album.getMaterialUploadConfig] 读取配置失败，使用默认值: ${error?.message || error}`);
      return this.getDefaultMaterialUploadConfig();
    }
  }

  /**
   * 按扩展名推断 MIME，便于元数据和压缩结果回写。
   * @param {string} ext - 文件扩展名
   * @return {string}
   */
  resolveMimeTypeByExt(ext = '') {
    const normalizedExt = String(ext || '').replace(/^\./, '').trim().toLowerCase();
    const map = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      tiff: 'image/tiff',
      tif: 'image/tiff',
    };
    return map[normalizedExt] || '';
  }

  /**
   * 规范化图片扩展名，避免空值或不受支持后缀造成落盘失败。
   * @param {string} ext - 原始扩展名
   * @return {string}
   */
  normalizeImageExt(ext = '') {
    const normalized = String(ext || '').replace(/^\./, '').trim().toLowerCase();
    if (!normalized) return 'jpg';
    return normalized === 'jpeg' ? 'jpg' : normalized;
  }

  /**
   * 判断是否为可入库的本地图片后缀。
   * @param {string} ext - 文件扩展名
   * @return {boolean}
   */
  isLocalImageExt(ext = '') {
    const normalized = this.normalizeImageExt(ext);
    return [ 'jpg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tif', 'tiff' ].includes(normalized);
  }

  /**
   * 扫描本地 public 目录并同步到素材库（默认 /public/uploads，用于历史文件补录后再压缩）。
   * @param {{cid?:number,limit?:number,restoreDeleted?:boolean,scanRoot?:string}} payload - 同步参数
   * @return {Promise<{totalFiles:number,scanned:number,imported:number,restored:number,deletedMatched:number,existed:number,skipped:number,importedIds:number[],restoredIds:number[]}>}
   */
  async syncLocalUploads(payload = {}) {
    const { ctx } = this;
    const cid = Math.max(0, Number.parseInt(String(payload.cid || 0), 10) || 0);
    const limit = Math.min(20000, Math.max(1, Number.parseInt(String(payload.limit || 5000), 10) || 5000));
    const restoreDeleted = payload.restoreDeleted === true;
    const scanRoot = String(payload.scanRoot || 'uploads').trim().toLowerCase();
    const aid = Number(ctx.session?.[reqAdminIdKey] || 0);
    if (!aid) {
      throw new Error('登录状态已失效，请重新登录后再试');
    }

    const publicRoot = path.join(this.config.baseDir, 'app', 'public');
    const scanBasePaths = [];
    if (scanRoot === 'public') {
      scanBasePaths.push(publicRoot);
    } else {
      [ 'image', 'video', 'file' ].forEach(dirName => {
        const candidatePath = path.join(publicRoot, 'uploads', dirName);
        if (fs.existsSync(candidatePath)) {
          scanBasePaths.push(candidatePath);
        }
      });
    }

    if (!scanBasePaths.length) {
      return {
        totalFiles: 0,
        scanned: 0,
        imported: 0,
        restored: 0,
        deletedMatched: 0,
        existed: 0,
        skipped: 0,
        importedIds: [],
        restoredIds: [],
      };
    }

    const walkFiles = [];
    const walkSingleBase = basePath => {
      const dirStack = [ basePath ];
      while (dirStack.length > 0) {
        const currentDir = dirStack.pop();
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        entries.forEach(entry => {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            dirStack.push(fullPath);
            return;
          }
          if (!entry.isFile()) return;
          walkFiles.push(fullPath);
        });
      }
    };
    scanBasePaths.forEach(walkSingleBase);

    const uriLike = scanRoot === 'public' ? '/public/%' : '/public/uploads/%';
    const existingRows = await ctx.model.Album.findAll({
      where: {
        uri: {
          [Op.like]: uriLike,
        },
      },
      attributes: [ 'id', 'uri', 'isDelete' ],
      limit: 50000,
    });
    const activeUriSet = new Set();
    const deletedRowMap = new Map();
    existingRows.forEach(row => {
      const data = row.toJSON ? row.toJSON() : row;
      const uri = String(data.uri || '').trim();
      if (!uri) return;
      if (Number(data.isDelete || 0) === 0) {
        activeUriSet.add(uri);
        return;
      }
      const history = deletedRowMap.get(uri) || [];
      history.push({
        id: Number(data.id || 0),
      });
      deletedRowMap.set(uri, history);
    });

    const now = Math.floor(Date.now() / 1000);
    const insertRows = [];
    const restoreRows = [];
    let existed = 0;
    let skipped = 0;
    let scanned = 0;
    let deletedMatched = 0;

    for (let i = 0; i < walkFiles.length; i += 1) {
      if (insertRows.length >= limit) break;
      const absolutePath = walkFiles[i];
      const fileName = path.basename(absolutePath);
      if (!fileName || fileName.startsWith('.')) {
        skipped += 1;
        continue;
      }
      const ext = this.normalizeImageExt(path.extname(fileName).replace('.', ''));
      if (!this.isLocalImageExt(ext)) {
        skipped += 1;
        continue;
      }

      const relativeInPublicRoot = path.relative(publicRoot, absolutePath).replace(/\\/g, '/');
      if (!relativeInPublicRoot || relativeInPublicRoot.startsWith('..')) {
        skipped += 1;
        continue;
      }
      const uri = `/public/${relativeInPublicRoot}`;
      scanned += 1;
      if (activeUriSet.has(uri)) {
        existed += 1;
        continue;
      }
      if (deletedRowMap.has(uri)) {
        if (restoreDeleted) {
          const candidates = deletedRowMap.get(uri) || [];
          const recovered = candidates.find(item => Number(item.id || 0) > 0);
          if (recovered) {
            restoreRows.push({
              id: Number(recovered.id || 0),
              aid,
              cid,
              updateTime: now,
              deleteTime: 0,
              isDelete: 0,
            });
            activeUriSet.add(uri);
            deletedRowMap.delete(uri);
            continue;
          }
        }
        deletedMatched += 1;
        continue;
      }
      const stats = fs.statSync(absolutePath);
      insertRows.push({
        aid,
        cid,
        type: 10,
        name: fileName,
        uri,
        ext,
        size: Number(stats.size || 0),
        isDelete: 0,
        createTime: now,
        updateTime: now,
        deleteTime: 0,
      });
      activeUriSet.add(uri);
    }

    const restoredIds = [];
    for (let i = 0; i < restoreRows.length; i += 1) {
      const item = restoreRows[i];
      await ctx.model.Album.update(
        {
          aid: item.aid,
          cid: item.cid,
          isDelete: 0,
          updateTime: item.updateTime,
          deleteTime: 0,
        },
        {
          where: { id: item.id },
        }
      );
      restoredIds.push(item.id);
    }

    let importedIds = [];
    if (insertRows.length) {
      const createdRows = await ctx.model.Album.bulkCreate(insertRows);
      importedIds = createdRows.map(row => Number(row.id || 0)).filter(id => id > 0);
    }

    return {
      totalFiles: walkFiles.length,
      scanned,
      imported: insertRows.length,
      restored: restoredIds.length,
      deletedMatched,
      existed,
      skipped,
      importedIds,
      restoredIds,
    };
  }

  /**
   * 规范化文件名主体（不含扩展名），过滤非法字符避免落盘失败。
   * @param {string} name - 原始文件名主体
   * @return {string}
   */
  sanitizeFileNameBase(name = '') {
    const text = String(name || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/\.+/g, '.')
      .replace(/^-+|-+$/g, '')
      .trim();
    return text.slice(0, 120);
  }

  /**
   * 依据远程附件命名模板生成文件名主体（不含扩展名）。
   * 支持占位符：%filename%/%date%/%year%/%month%/%day%/%time%/%timestamp%/%md5%/%random%
   * @param {string} pattern - 模板字符串
   * @param {string} originalFileName - 原始文件名（可带扩展名）
   * @param {Buffer} fileBuffer - 文件内容（用于 md5）
   * @return {string}
   */
  buildRemoteFileNameBase(pattern = '', originalFileName = '', fileBuffer = Buffer.from('')) {
    const now = dayjs();
    const rawName = String(originalFileName || '').trim();
    const parsedName = path.parse(rawName || 'remote');
    const originalBase = this.sanitizeFileNameBase(parsedName.name || '');
    const safeBase = originalBase || `remote_${now.format('YYYYMMDD_HHmmss')}`;
    const md5Value = crypto.createHash('md5')
      .update(Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer || ''))
      .digest('hex');
    const tokenMap = {
      filename: safeBase,
      date: now.format('YYYYMMDD'),
      year: now.format('YYYY'),
      month: now.format('MM'),
      day: now.format('DD'),
      time: now.format('HHmmss'),
      timestamp: String(Math.floor(Date.now() / 1000)),
      md5: md5Value,
      random: Math.random().toString(36).slice(2, 10),
    };
    const template = String(pattern || '').trim() || '%random%-%date%';
    const replaced = template.replace(/%([a-zA-Z_]+)%/g, (match, tokenName) => {
      const key = String(tokenName || '').trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(tokenMap, key) ? tokenMap[key] : '';
    });
    const normalized = this.sanitizeFileNameBase(replaced);
    return normalized || safeBase;
  }

  /**
   * 判断是否为可压缩的静态位图格式。
   * @param {string} ext - 扩展名
   * @return {boolean}
   */
  isCompressibleImageExt(ext = '') {
    const normalizedExt = this.normalizeImageExt(ext);
    return [ 'jpg', 'png', 'webp', 'bmp' ].includes(normalizedExt);
  }

  /**
   * 按配置计算压缩后目标尺寸，保证宽高不超过上限。
   * @param {number} width - 原始宽度
   * @param {number} height - 原始高度
   * @param {number} maxWidth - 最大宽度
   * @param {number} maxHeight - 最大高度
   * @return {{width:number,height:number,resized:boolean}}
   */
  calcResizeTarget(width, height, maxWidth, maxHeight) {
    const safeWidth = Math.max(1, Number.parseInt(String(width || 0), 10) || 1);
    const safeHeight = Math.max(1, Number.parseInt(String(height || 0), 10) || 1);
    const limitWidth = Math.max(0, Number.parseInt(String(maxWidth || 0), 10) || 0);
    const limitHeight = Math.max(0, Number.parseInt(String(maxHeight || 0), 10) || 0);
    let ratio = 1;
    if (limitWidth > 0 && safeWidth > limitWidth) {
      ratio = Math.min(ratio, limitWidth / safeWidth);
    }
    if (limitHeight > 0 && safeHeight > limitHeight) {
      ratio = Math.min(ratio, limitHeight / safeHeight);
    }
    if (ratio >= 1) {
      return {
        width: safeWidth,
        height: safeHeight,
        resized: false,
      };
    }
    return {
      width: Math.max(1, Math.round(safeWidth * ratio)),
      height: Math.max(1, Math.round(safeHeight * ratio)),
      resized: true,
    };
  }

  /**
   * 读取上传流到 Buffer，供图片压缩逻辑复用。
   * @param {import('stream').Readable} stream - 上传文件流
   * @return {Promise<Buffer>}
   */
  async readStreamToBuffer(stream) {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.once('end', () => resolve(Buffer.concat(chunks)));
      stream.once('error', reject);
    });
  }

  /**
   * 将 Buffer 落盘到上传目录并返回标准文件信息。
   * @param {Buffer} fileBuffer - 文件内容
   * @param {string} originalFileName - 原始文件名
   * @param {number} type - 素材类型（10 图片 / 20 视频）
   * @param {string} extOverride - 指定扩展名
   * @param {string} fileNameBase - 指定落盘文件名主体（不含扩展名）
   * @return {Promise<{url:string,fileName:string,ext:string,sizeBytes:number}>}
   */
  async writeBufferToUploadDir(
    fileBuffer,
    originalFileName,
    type = 10,
    extOverride = '',
    fileNameBase = ''
  ) {
    const pathDir = type === 10 ? '/public/uploads/image/' : '/public/uploads/video/';
    const targetDir = pathDir + dayjs().format('YYYY-MM-DD');
    const dir = path.join(this.config.baseDir, 'app', targetDir);
    await mkdirp.sync(dir);
    const resolvedExt = this.normalizeImageExt(
      extOverride || path.extname(String(originalFileName || '')).replace('.', '')
    );
    const normalizedBase = this.sanitizeFileNameBase(fileNameBase || '');
    let filename = normalizedBase
      ? `${normalizedBase}.${resolvedExt}`
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${resolvedExt}`;
    let relativeUrl = `${targetDir}/${filename}`;
    let targetPath = path.join(this.config.baseDir, 'app', relativeUrl);
    if (normalizedBase) {
      let counter = 1;
      while (fs.existsSync(targetPath)) {
        filename = `${normalizedBase}_${counter}.${resolvedExt}`;
        relativeUrl = `${targetDir}/${filename}`;
        targetPath = path.join(this.config.baseDir, 'app', relativeUrl);
        counter += 1;
      }
    }
    fs.writeFileSync(targetPath, fileBuffer);
    return {
      url: relativeUrl,
      fileName: String(originalFileName || filename),
      ext: resolvedExt,
      sizeBytes: Number(fileBuffer?.length || 0),
    };
  }

  /**
   * 使用 Jimp 对图片进行压缩与缩放，失败时返回跳过原因而不抛异常。
   * @param {Buffer} fileBuffer - 原始文件内容
   * @param {string} ext - 文件扩展名
   * @param {{enabled:boolean,applyOnLocalUpload:boolean,applyOnRemoteTransfer:boolean,remoteNamePattern:string,minSizeKb:number,maxWidth:number,maxHeight:number,jpegQuality:number,pngCompressionLevel:number}} config - 压缩配置
   * @return {Promise<{applied:boolean,reason:string,buffer:Buffer,ext:string,mimeType:string,width:number,height:number,originalBytes:number,finalBytes:number,savedBytes:number,savedPercent:number,resized:boolean}>}
   */
  async optimizeImageBuffer(fileBuffer, ext, config) {
    const safeBuffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer || '');
    const normalizedExt = this.normalizeImageExt(ext);
    const originalBytes = Number(safeBuffer.length || 0);
    const baseResult = {
      applied: false,
      reason: '',
      buffer: safeBuffer,
      ext: normalizedExt,
      mimeType: this.resolveMimeTypeByExt(normalizedExt),
      width: 0,
      height: 0,
      originalBytes,
      finalBytes: originalBytes,
      savedBytes: 0,
      savedPercent: 0,
      resized: false,
    };
    const normalizedConfig = this.normalizeMaterialUploadConfig(config || {});
    if (!normalizedConfig.enabled) {
      return { ...baseResult, reason: '未开启压缩' };
    }
    if (!originalBytes) {
      return { ...baseResult, reason: '文件内容为空' };
    }
    if (!this.isCompressibleImageExt(normalizedExt)) {
      return { ...baseResult, reason: '该格式不支持压缩' };
    }
    if (normalizedConfig.minSizeKb > 0 && originalBytes < normalizedConfig.minSizeKb * 1024) {
      return { ...baseResult, reason: '文件体积小于最小压缩阈值' };
    }

    try {
      const image = await Jimp.read(safeBuffer);
      const width = Number(image.bitmap?.width || 0);
      const height = Number(image.bitmap?.height || 0);
      if (width <= 0 || height <= 0) {
        return { ...baseResult, reason: '无法读取图片尺寸' };
      }
      const resizeTarget = this.calcResizeTarget(
        width,
        height,
        normalizedConfig.maxWidth,
        normalizedConfig.maxHeight
      );
      if (resizeTarget.resized) {
        image.resize(resizeTarget.width, resizeTarget.height, Jimp.RESIZE_BILINEAR);
      }

      let outputMime = Jimp.MIME_JPEG;
      if (normalizedExt === 'png') outputMime = Jimp.MIME_PNG;
      if (normalizedExt === 'webp' && Jimp.MIME_WEBP) outputMime = Jimp.MIME_WEBP;
      if (normalizedExt === 'bmp') outputMime = Jimp.MIME_BMP;

      if (outputMime === Jimp.MIME_JPEG) {
        image.quality(normalizedConfig.jpegQuality);
      }
      if (outputMime === Jimp.MIME_PNG && typeof image.deflateLevel === 'function') {
        image.deflateLevel(normalizedConfig.pngCompressionLevel);
      }

      const nextBuffer = await image.getBufferAsync(outputMime);
      const finalBytes = Number(nextBuffer.length || 0);
      const keptOriginal = !resizeTarget.resized && finalBytes >= originalBytes;
      const appliedBuffer = keptOriginal ? safeBuffer : nextBuffer;
      const appliedBytes = Number(appliedBuffer.length || 0);
      const savedBytes = Math.max(0, originalBytes - appliedBytes);
      const savedPercent = originalBytes > 0
        ? Number(((savedBytes / originalBytes) * 100).toFixed(2))
        : 0;

      return {
        applied: !keptOriginal || resizeTarget.resized,
        reason: keptOriginal ? '压缩后体积未下降，已保留原图' : '',
        buffer: appliedBuffer,
        ext: normalizedExt,
        mimeType: outputMime || this.resolveMimeTypeByExt(normalizedExt),
        width: resizeTarget.width,
        height: resizeTarget.height,
        originalBytes,
        finalBytes: appliedBytes,
        savedBytes,
        savedPercent,
        resized: resizeTarget.resized,
      };
    } catch (error) {
      return {
        ...baseResult,
        reason: `压缩失败：${error?.message || '未知错误'}`,
      };
    }
  }

  /**
   * 回写素材技术元数据（MIME/宽高），不覆盖人工编辑文案。
   * @param {number} albumId - 素材 ID
   * @param {{mimeType?:string,width?:number,height?:number}} payload - 技术元数据
   * @return {Promise<void>}
   */
  async saveAlbumSystemMeta(albumId, payload = {}) {
    const { ctx } = this;
    const id = Number(albumId || 0);
    if (!id) return;
    const now = Math.floor(Date.now() / 1000);
    const patch = {
      mimeType: this.normalizeText(payload.mimeType, 100),
      width: Math.max(0, Number.parseInt(String(payload.width || 0), 10) || 0),
      height: Math.max(0, Number.parseInt(String(payload.height || 0), 10) || 0),
    };
    try {
      const existed = await ctx.model.AlbumMeta.findOne({ where: { albumId: id } });
      if (!existed) {
        await ctx.model.AlbumMeta.create({
          albumId: id,
          alt: '',
          title: '',
          caption: '',
          description: '',
          ...patch,
          createTime: now,
          updateTime: now,
        });
        return;
      }
      await ctx.model.AlbumMeta.update(
        {
          mimeType: patch.mimeType || existed.mimeType || '',
          width: patch.width || existed.width || 0,
          height: patch.height || existed.height || 0,
          updateTime: now,
        },
        {
          where: { albumId: id },
        }
      );
    } catch (error) {
      if (this.isAlbumMetaTableMissing(error)) {
        return;
      }
      ctx.logger.warn(`[album.saveAlbumSystemMeta] 回写元数据失败: ${error?.message || error}`);
    }
  }

  /**
   * 判断错误是否为“元数据表不存在”，用于兼容未打补丁环境。
   * @param {Error} err - 异常对象
   * @return {boolean}
   */
  isAlbumMetaTableMissing(err) {
    const message = String(err?.message || '').toLowerCase();
    return (
      message.includes('la_album_meta')
      && (message.includes("doesn't exist") || message.includes('unknown table'))
    );
  }

  /**
   * 读取素材元数据映射（按素材 ID 建立 Map）。
   * @param {Array<number>} albumIds - 素材 ID 列表
   * @return {Promise<Map<number, Record<string, any>>>}
   */
  async getAlbumMetaMap(albumIds = []) {
    const { ctx } = this;
    const idList = Array.from(
      new Set(
        (Array.isArray(albumIds) ? albumIds : [])
          .map(item => Number(item || 0))
          .filter(id => Number.isInteger(id) && id > 0)
      )
    );
    const metaMap = new Map();
    if (!idList.length) return metaMap;
    try {
      const rows = await ctx.model.AlbumMeta.findAll({
        where: {
          albumId: idList,
        },
      });
      rows.forEach(row => {
        const data = row.toJSON ? row.toJSON() : row;
        metaMap.set(Number(data.albumId || 0), data);
      });
    } catch (err) {
      if (!this.isAlbumMetaTableMissing(err)) {
        throw err;
      }
      ctx.logger.warn('[album.getAlbumMetaMap] la_album_meta 不存在，已降级为无元数据模式');
    }
    return metaMap;
  }

  /**
   * 生成素材 URL 的候选匹配值（相对/绝对/api 前缀），用于引用检测。
   * @param {string} uri - 素材地址
   * @return {Array<string>}
   */
  buildUriCandidates(uri = '') {
    const raw = String(uri || '').trim();
    if (!raw) return [];
    const set = new Set();
    const append = value => {
      const text = String(value || '').trim();
      if (!text) return;
      set.add(text);
    };
    append(raw);
    const relative = urlUtil.toRelativeUrl(raw);
    append(relative);
    append(urlUtil.toAbsoluteUrl(relative || raw));
    if (String(relative || '').startsWith('/public/uploads/')) {
      append(String(relative).replace('/public/uploads/', '/api/uploads/'));
    }
    if (String(relative || '').startsWith('/api/uploads/')) {
      append(String(relative).replace('/api/uploads/', '/public/uploads/'));
    }
    return Array.from(set);
  }

  /**
   * 转义 SQL LIKE 关键字符，避免误匹配。
   * @param {string} keyword - 关键字
   * @return {string}
   */
  escapeLikeKeyword(keyword = '') {
    return String(keyword || '').replace(/[\\%_]/g, '\\$&');
  }

  /**
   * 批量查询素材是否被文章/网址引用。
   * @param {Array<Record<string, any>>} albums - 待删除素材列表
   * @return {Promise<Array<{scope:string,id:number,title:string}>>}
   */
  async collectAlbumUsages(albums = []) {
    const { ctx } = this;
    const uriKeywords = Array.from(
      new Set(
        (Array.isArray(albums) ? albums : [])
          .flatMap(item => this.buildUriCandidates(item?.uri || ''))
          .filter(Boolean)
      )
    );
    if (!uriKeywords.length) return [];

    const usages = [];
    const pushUsage = (scope, id, title) => {
      usages.push({
        scope,
        id: Number(id || 0),
        title: String(title || '').trim() || `${scope}#${id}`,
      });
    };
    const keywordLikes = uriKeywords.map(uri => `%${this.escapeLikeKeyword(uri)}%`);

    // 旧文章表引用检测
    try {
      const articleRows = await ctx.model.Article.findAll({
        where: {
          is_delete: 0,
          [Op.or]: [
            { image: { [Op.in]: uriKeywords } },
            ...keywordLikes.map(likeValue => ({ content: { [Op.like]: likeValue } })),
          ],
        },
        attributes: [ 'id', 'title' ],
        limit: 100,
      });
      articleRows.forEach(row => {
        const data = row.toJSON ? row.toJSON() : row;
        pushUsage('文章', data.id, data.title || `文章#${data.id}`);
      });
    } catch (err) {
      ctx.logger.warn(`[album.collectAlbumUsages] la_article 检测失败: ${err?.message || err}`);
    }

    // 新文章表引用检测
    try {
      const uiedArticleModel = ctx.model.Uied && ctx.model.Uied.Article;
      if (uiedArticleModel) {
        const rows = await uiedArticleModel.findAll({
          where: {
            is_delete: 0,
            [Op.or]: [
              { cover_image: { [Op.in]: uriKeywords } },
              ...keywordLikes.map(likeValue => ({ content: { [Op.like]: likeValue } })),
            ],
          },
          attributes: [ 'id', 'title' ],
          limit: 100,
        });
        rows.forEach(row => {
          const data = row.toJSON ? row.toJSON() : row;
          pushUsage('站内文章', data.id, data.title || `站内文章#${data.id}`);
        });
      }
    } catch (err) {
      ctx.logger.warn(`[album.collectAlbumUsages] uied_article 检测失败: ${err?.message || err}`);
    }

    // 网址表引用检测
    try {
      const websiteModel = ctx.model.Uied && ctx.model.Uied.Website;
      if (websiteModel) {
        const rows = await websiteModel.findAll({
          where: {
            is_delete: 0,
            [Op.or]: [
              { thumbnail: { [Op.in]: uriKeywords } },
              { icon_url: { [Op.in]: uriKeywords } },
              ...keywordLikes.map(likeValue => ({ screenshots: { [Op.like]: likeValue } })),
              ...keywordLikes.map(likeValue => ({ detail_content: { [Op.like]: likeValue } })),
            ],
          },
          attributes: [ 'id', 'name' ],
          limit: 100,
        });
        rows.forEach(row => {
          const data = row.toJSON ? row.toJSON() : row;
          pushUsage('网址', data.id, data.name || `网址#${data.id}`);
        });
      }
    } catch (err) {
      ctx.logger.warn(`[album.collectAlbumUsages] uied_website 检测失败: ${err?.message || err}`);
    }

    const dedupeMap = new Map();
    usages.forEach(item => {
      const key = `${item.scope}:${item.id}`;
      if (!dedupeMap.has(key)) {
        dedupeMap.set(key, item);
      }
    });
    return Array.from(dedupeMap.values());
  }

  /**
   * 规范化素材 ID 列表，兼容单值/数组/字符串。
   * @param {number|string|Array<number|string>} ids - 原始 ID 输入
   * @return {Array<number>}
   */
  normalizeAlbumIdList(ids) {
    return Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ ids ])
          .map(item => Number(item || 0))
          .filter(id => Number.isInteger(id) && id > 0)
      )
    );
  }

  /**
   * 查询单个素材引用明细（文章/网址）。
   * @param {number|string} id - 素材 ID
   * @return {Promise<{albumId:number,count:number,items:Array<{scope:string,id:number,title:string}>}>}
   */
  async albumUsageDetail(id) {
    const { ctx } = this;
    const albumId = Number(id || 0);
    if (!albumId) {
      throw new Error('素材ID不能为空');
    }
    const album = await ctx.model.Album.findOne({
      where: {
        id: albumId,
        isDelete: 0,
      },
    });
    if (!album) {
      throw new Error('素材不存在或已删除');
    }
    const items = await this.collectAlbumUsages([ album ]);
    return {
      albumId,
      count: items.length,
      items,
    };
  }

  /**
   * 将素材 URI 解析为服务端真实文件路径（仅允许 uploads 目录，防止越界访问）。
   * @param {string} uri - 素材地址
   * @return {{relativeUri:string,absolutePath:string,safe:boolean}}
   */
  resolveLocalUploadPath(uri = '') {
    const relativeUri = urlUtil.toRelativeUrl(String(uri || '').trim());
    if (!relativeUri) {
      return { relativeUri: '', absolutePath: '', safe: false };
    }
    const normalizedRelative = path.posix.normalize(relativeUri.replace(/\\/g, '/'));
    if (!normalizedRelative.startsWith('/public/uploads/')) {
      return { relativeUri: normalizedRelative, absolutePath: '', safe: false };
    }
    const absolutePath = path.join(this.config.baseDir, 'app', normalizedRelative);
    const uploadsRoot = path.join(this.config.baseDir, 'app', 'public', 'uploads');
    const safe = absolutePath.startsWith(uploadsRoot + path.sep) || absolutePath === uploadsRoot;
    return {
      relativeUri: normalizedRelative,
      absolutePath,
      safe,
    };
  }

  /**
   * 对指定素材执行重压缩，支持单图与批量（用于后台素材中心运营）。
   * @param {number|Array<number>} ids - 素材 ID 或 ID 数组
   * @return {Promise<{total:number,success:Array<Record<string, any>>,skipped:Array<Record<string, any>>,failed:Array<Record<string, any>>,missing:Array<number>}>}
   */
  async albumRecompress(ids = []) {
    const { ctx } = this;
    const idList = this.normalizeAlbumIdList(ids);
    if (!idList.length) {
      throw new Error('请选择需要压缩的素材');
    }
    const rows = await ctx.model.Album.findAll({
      where: {
        id: idList,
        isDelete: 0,
        type: 10,
      },
      order: [[ 'id', 'DESC' ]],
    });
    const rowMap = new Map();
    rows.forEach(item => {
      const data = item.toJSON ? item.toJSON() : item;
      rowMap.set(Number(data.id || 0), data);
    });

    const result = {
      total: idList.length,
      success: [],
      skipped: [],
      failed: [],
      missing: idList.filter(id => !rowMap.has(id)),
    };
    const config = {
      ...await this.getMaterialUploadConfig(),
      enabled: true,
    };
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < idList.length; i += 1) {
      const albumId = idList[i];
      const album = rowMap.get(albumId);
      if (!album) continue;
      const pathInfo = this.resolveLocalUploadPath(album.uri);
      if (!pathInfo.safe || !pathInfo.absolutePath) {
        result.skipped.push({
          id: albumId,
          name: album.name || `素材#${albumId}`,
          reason: '仅支持 uploads 目录内素材',
        });
        continue;
      }
      if (!fs.existsSync(pathInfo.absolutePath)) {
        result.failed.push({
          id: albumId,
          name: album.name || `素材#${albumId}`,
          reason: '源文件不存在',
        });
        continue;
      }

      try {
        const originalBuffer = fs.readFileSync(pathInfo.absolutePath);
        const ext = this.normalizeImageExt(
          album.ext || path.extname(pathInfo.absolutePath).replace('.', '')
        );
        const compressResult = await this.optimizeImageBuffer(originalBuffer, ext, config);
        if (!compressResult.applied) {
          result.skipped.push({
            id: albumId,
            name: album.name || `素材#${albumId}`,
            reason: compressResult.reason || '未触发压缩',
            beforeBytes: compressResult.originalBytes,
            afterBytes: compressResult.finalBytes,
          });
          await this.saveAlbumSystemMeta(albumId, {
            mimeType: compressResult.mimeType || this.resolveMimeTypeByExt(ext),
            width: compressResult.width,
            height: compressResult.height,
          });
          continue;
        }

        fs.writeFileSync(pathInfo.absolutePath, compressResult.buffer);
        await ctx.model.Album.update(
          {
            size: Number(compressResult.finalBytes || compressResult.buffer.length || 0),
            ext: ext,
            updateTime: now,
          },
          {
            where: { id: albumId },
          }
        );
        await this.saveAlbumSystemMeta(albumId, {
          mimeType: compressResult.mimeType || this.resolveMimeTypeByExt(ext),
          width: compressResult.width,
          height: compressResult.height,
        });

        result.success.push({
          id: albumId,
          name: album.name || `素材#${albumId}`,
          beforeBytes: compressResult.originalBytes,
          afterBytes: compressResult.finalBytes,
          savedBytes: compressResult.savedBytes,
          savedPercent: compressResult.savedPercent,
          width: compressResult.width,
          height: compressResult.height,
          resized: compressResult.resized,
        });
      } catch (error) {
        result.failed.push({
          id: albumId,
          name: album.name || `素材#${albumId}`,
          reason: error?.message || '压缩失败',
        });
      }
    }

    return result;
  }

  async albumList(listReq) {
    const { ctx } = this;

    const { cid, name, type, pageSize, pageNo } = listReq;

    // 统一分页入参，避免 pageNo/pageSize 为空时导致 NaN 分页
    const limit = Math.max(1, Number.parseInt(String(pageSize || 20), 10) || 20);
    const safePageNo = Math.max(1, Number.parseInt(String(pageNo || 1), 10) || 1);
    const offset = limit * (safePageNo - 1);
    const currentAdminId = Number(ctx.session?.[reqAdminIdKey] || 0);
    const canViewAll = currentAdminId === Number(superAdminId || 1);
    const canViewUploader = canViewAll;

    const where = {
      isDelete: 0,
    };

    if (cid > 0) {
      where.cid = cid;
    }

    if (name) {
      where.name = { [Op.like]: `%${name}%` };
    }

    if (type > 0) {
      where.type = type;
    }

    const count = await ctx.model.Album.count({ where });

    const albums = await ctx.model.Album.findAll({
      where,
      limit,
      offset,
      order: [[ 'id', 'DESC' ]],
    });

    const albumResps = albums.map(album => {
      const albumResp = album.toJSON ? album.toJSON() : album;
      return albumResp;
    });

    const engine = 'local';

    for (let i = 0; i < albumResps.length; i++) {
      if (engine === 'local') {
        albumResps[i].path = albums[i].uri;
      } else {
        // TODO: 其他 engine
      }
      const sizeBytes = Number(albums[i].size || 0);
      const extName = String(albums[i].ext || '').trim().toLowerCase();
      const uriValue = String(albums[i].uri || '').trim();
      const fallbackExt = path.extname(uriValue).replace('.', '').toLowerCase();
      albumResps[i].uri = urlUtil.toAbsoluteUrl(uriValue);
      albumResps[i].sizeBytes = sizeBytes;
      albumResps[i].size = util.getFmtSize(sizeBytes);
      albumResps[i].fileType = extName || fallbackExt || '';
    }

    // 合并素材元数据（兼容未执行补丁场景）
    const metaMap = await this.getAlbumMetaMap(albumResps.map(item => Number(item.id || 0)));
    albumResps.forEach(item => {
      const albumId = Number(item.id || 0);
      const meta = metaMap.get(albumId) || {};
      item.alt = this.normalizeText(meta.alt, 255);
      item.title = this.normalizeText(meta.title, 255);
      item.caption = this.normalizeText(meta.caption, 255);
      item.description = this.normalizeText(meta.description, 4000);
      item.mimeType = this.normalizeText(meta.mimeType, 100);
      const width = Number(meta.width || 0);
      const height = Number(meta.height || 0);
      if (width > 0) item.width = width;
      if (height > 0) item.height = height;
    });

    // 超级管理员模式下补充上传者昵称，便于素材中心参数面板展示
    if (canViewUploader) {
      const aidList = Array.from(
        new Set(
          albumResps
            .map(item => Number(item.aid || 0))
            .filter(id => Number.isInteger(id) && id > 0)
        )
      );
      if (aidList.length) {
        const adminRows = await ctx.model.SystemAuthAdmin.findAll({
          where: {
            id: aidList,
            isDelete: 0,
          },
          attributes: [ 'id', 'nickname', 'username' ],
        });
        const uploaderMap = new Map(
          adminRows.map(row => {
            const data = row.toJSON ? row.toJSON() : row;
            const nickname = String(data.nickname || '').trim();
            const username = String(data.username || '').trim();
            return [ Number(data.id || 0), nickname || username || '-' ];
          })
        );
        albumResps.forEach(item => {
          const aid = Number(item.aid || 0);
          if (aid > 0) {
            item.uploaderName = uploaderMap.get(aid) || `管理员#${aid}`;
          } else {
            item.uploaderName = '-';
          }
        });
      }
    }

    return {
      pageNo: safePageNo,
      pageSize: limit,
      count,
      lists: albumResps,
      canViewAll,
      canViewUploader,
    };
  }

  async albumRename(id, name) {
    const { ctx } = this;
    try {
      const album = await ctx.model.Album.findOne({
        where: {
          id,
          isDelete: 0,
        },
      });

      if (!album) {
        throw new Error('文件丢失！');
      }

      album.name = name;

      await album.save();
    } catch (err) {
      throw new Error('AlbumRename Save err');
    }
  }

  /**
   * 保存素材元数据（用于媒体详情面板编辑）。
   * @param {Record<string, any>} payload - 元数据内容
   * @return {Promise<void>}
   */
  async albumMetaUpdate(payload = {}) {
    const { ctx } = this;
    const albumId = Number(payload.id || 0);
    if (!albumId) {
      throw new Error('素材ID不能为空');
    }
    const album = await ctx.model.Album.findOne({
      where: {
        id: albumId,
        isDelete: 0,
      },
    });
    if (!album) {
      throw new Error('素材不存在或已删除');
    }

    const metaPayload = this.normalizeAlbumMetaPayload(payload);
    const now = Math.floor(Date.now() / 1000);

    try {
      const existed = await ctx.model.AlbumMeta.findOne({
        where: { albumId },
      });
      if (!existed) {
        await ctx.model.AlbumMeta.create({
          albumId,
          ...metaPayload,
          createTime: now,
          updateTime: now,
        });
        return;
      }
      await ctx.model.AlbumMeta.update(
        {
          ...metaPayload,
          updateTime: now,
        },
        {
          where: { albumId },
        }
      );
    } catch (err) {
      if (this.isAlbumMetaTableMissing(err)) {
        throw new Error('请先执行升级补丁：la_album_meta（素材元数据表）');
      }
      throw err;
    }
  }

  async albumMove(ids, cid) {
    const { ctx } = this;
    try {
      const albums = await ctx.model.Album.findAll({
        where: {
          id: ids,
          isDelete: 0,
        },
      });

      if (albums.length === 0) {
        throw new Error('文件丢失！');
      }

      if (cid > 0) {
        const cate = await ctx.model.AlbumCate.findOne({
          where: {
            id: cid,
            isDelete: 0,
          },
        });

        if (!cate) {
          throw new Error('类目已不存在！');
        }
      }

      await ctx.model.Album.update(
        { cid },
        {
          where: {
            id: ids,
          },
        }
      );
    } catch (err) {
      throw new Error('AlbumMove UpdateColumn err');
    }

  }

  async albumAdd(addReq) {
    const { ctx } = this;
    try {
      const alb = await ctx.model.Album.create(addReq);

      return alb.id;
    } catch (err) {
      throw new Error('AlbumAdd Create err');
    }
  }

  async albumDel(ids) {
    const { ctx } = this;
    try {
      const idList = Array.from(
        new Set(
          (Array.isArray(ids) ? ids : [ ids ])
            .map(item => Number(item || 0))
            .filter(id => Number.isInteger(id) && id > 0)
        )
      );
      if (!idList.length) {
        throw new Error('请选择需要删除的素材');
      }
      const albums = await ctx.model.Album.findAll({
        where: {
          id: idList,
          isDelete: 0,
        },
      });

      if (albums.length === 0) {
        throw new Error('文件丢失！');
      }

      const usages = await this.collectAlbumUsages(albums);
      if (usages.length) {
        const preview = usages
          .slice(0, 4)
          .map(item => `${item.scope}《${item.title}》`)
          .join('、');
        const suffix = usages.length > 4 ? ` 等${usages.length}处` : '';
        throw new Error(`素材已被引用，无法删除：${preview}${suffix}`);
      }

      await ctx.model.Album.update(
        {
          isDelete: 1,
          deleteTime: Math.floor(Date.now() / 1000),
        },
        {
          where: {
            id: idList,
          },
        }
      );

      try {
        await ctx.model.AlbumMeta.destroy({
          where: {
            albumId: idList,
          },
        });
      } catch (err) {
        if (!this.isAlbumMetaTableMissing(err)) {
          ctx.logger.warn(`[album.albumDel] 清理素材元数据失败: ${err?.message || err}`);
        }
      }
    } catch (err) {
      if (err && err.message) {
        throw err;
      }
      throw new Error('AlbumDel UpdateColumn err');
    }
  }

  async uploadFile(cid, stream, type = 10) {
    const { ctx } = this;
    try {
      const uploaded = await this.handleUploadFile(stream, type);
      const { url, fileName } = uploaded;
      const aid = ctx.session[reqAdminIdKey];
      const fileSizeInBytes = Number(uploaded.sizeBytes || 0) > 0
        ? Number(uploaded.sizeBytes)
        : fs.statSync(path.join(this.config.baseDir, 'app', url)).size;
      const ext = this.normalizeImageExt(
        uploaded.ext || path.extname(url).replace('.', '')
      );
      const now = Math.floor(Date.now() / 1000);

      const addReq = {
        aid,
        cid,
        type,
        uri: url,
        name: fileName,
        ext,
        size: fileSizeInBytes,
        createTime: now,
        updateTime: now,
      };

      const albumId = await this.albumAdd(addReq);
      if (type === 10) {
        await this.saveAlbumSystemMeta(albumId, {
          mimeType: uploaded.mimeType || this.resolveMimeTypeByExt(ext),
          width: uploaded.width,
          height: uploaded.height,
        });
      }

      const res = {
        id: albumId,
        path: urlUtil.toAbsoluteUrl(url),
        compression: uploaded.compression || null,
      };

      return res;

    } catch (err) {
      throw new Error('uploadImage UpdateColumn err');
    }
  }

  async handleUploadFile(stream, type = 10) {
    if (type === 10) {
      const compressConfig = await this.getMaterialUploadConfig();
      if (compressConfig.enabled && compressConfig.applyOnLocalUpload) {
        try {
          const sourceBuffer = await this.readStreamToBuffer(stream);
          const sourceExt = this.normalizeImageExt(
            path.extname(String(stream.filename || '')).replace('.', '')
          );
          const compressResult = await this.optimizeImageBuffer(sourceBuffer, sourceExt, compressConfig);
          const writeResult = await this.writeBufferToUploadDir(
            compressResult.buffer,
            stream.filename,
            type,
            compressResult.ext || sourceExt
          );
          return {
            ...writeResult,
            mimeType: compressResult.mimeType || this.resolveMimeTypeByExt(writeResult.ext),
            width: compressResult.width,
            height: compressResult.height,
            compression: {
              enabled: true,
              applied: compressResult.applied,
              reason: compressResult.reason,
              beforeBytes: compressResult.originalBytes,
              afterBytes: compressResult.finalBytes,
              savedBytes: compressResult.savedBytes,
              savedPercent: compressResult.savedPercent,
              resized: compressResult.resized,
            },
          };
        } catch (error) {
          await sendToWormhole(stream);
          throw new Error(`图片压缩上传失败: ${error?.message || error}`);
        }
      }
    }

    const pathDir = type === 10 ? '/public/uploads/image/' : '/public/uploads/video/';
    const targetDir = pathDir + dayjs().format('YYYY-MM-DD');
    const dir = path.join(this.config.baseDir, 'app', targetDir);
    await mkdirp.sync(dir);
    const filename = Date.now() + path.extname(stream.filename).toLocaleLowerCase();
    const target = path.join('app', targetDir, filename);
    const writeStream = fs.createWriteStream(target);
    try {
      await awaitWriteStream(stream.pipe(writeStream));
    } catch (err) {
      await sendToWormhole(stream);
      throw new Error(err);
    }
    const stats = fs.statSync(path.join(this.config.baseDir, target));
    const ext = this.normalizeImageExt(path.extname(filename).replace('.', ''));
    return {
      url: `${targetDir}/${filename}`,
      fileName: stream.filename,
      ext,
      sizeBytes: Number(stats.size || 0),
      mimeType: this.resolveMimeTypeByExt(ext),
      width: 0,
      height: 0,
      compression: {
        enabled: false,
        applied: false,
        reason: '未开启压缩',
      },
    };
  }

  /**
   * 规范化远程地址（兼容 //cdn.xx.jpg）
   */
  normalizeRemoteUrl(rawUrl = '') {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (value.startsWith('//')) return `https:${value}`;
    return value;
  }

  /**
   * 规范化域名白名单（支持数组/逗号文本/换行文本）
   * @param {Array<string>|string} input - 原始域名配置
   * @param {Array<string>} fallback - 默认值
   * @return {Array<string>}
   */
  normalizeInsecureDomainList(input, fallback = []) {
    const source = Array.isArray(input)
      ? input
      : String(input || '').split(/[\n,;\s]+/);
    const list = source
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean)
      .map(item => item.replace(/^https?:\/\//, ''))
      .map(item => item.replace(/\/+$/, ''))
      .filter(item => /^[a-z0-9.-]+$/.test(item));
    const merged = list.length
      ? list
      : (Array.isArray(fallback) ? fallback.map(item => String(item || '').trim().toLowerCase()).filter(Boolean) : []);
    return Array.from(new Set(merged));
  }

  /**
   * 判断错误是否为证书链相关错误
   * @param {Error} error - 捕获到的错误对象
   * @return {boolean}
   */
  isTlsIssuerError(error) {
    const message = String(error && error.message ? error.message : '').toLowerCase();
    const code = String(error && error.code ? error.code : '').toUpperCase();
    return (
      message.includes('unable to get local issuer certificate')
      || message.includes('self-signed certificate')
      || message.includes('unable to verify the first certificate')
      || code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
      || code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
      || code === 'SELF_SIGNED_CERT_IN_CHAIN'
      || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    );
  }

  /**
   * 判断域名是否命中证书容错白名单（支持子域名）
   * @param {string} host - 当前请求域名
   * @param {Array<string>} whitelist - 白名单
   * @return {boolean}
   */
  matchInsecureTlsHost(host = '', whitelist = []) {
    const normalizedHost = String(host || '').trim().toLowerCase();
    if (!normalizedHost) return false;
    const domains = Array.isArray(whitelist) ? whitelist : [];
    return domains.some(domain => {
      const normalizedDomain = String(domain || '').trim().toLowerCase();
      if (!normalizedDomain) return false;
      return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
    });
  }

  /**
   * 读取“远程抓取/图片转存”证书容错配置
   * 优先级：环境变量 > AI 助手导入配置 > 后端静态配置
   * @return {Promise<{allowInsecureTls:boolean,insecureDomains:Array<string>,maxBytes:number}>}
   */
  async getRemoteImageTransferConfig() {
    const { ctx } = this;
    const fileConfig = this.config.remoteImageTransfer || {};
    let allowInsecureTls = Boolean(fileConfig.allowInsecureTls);
    let insecureDomains = this.normalizeInsecureDomainList(fileConfig.insecureDomains, []);
    let maxBytes = Number(fileConfig.maxBytes || 10 * 1024 * 1024);

    try {
      const importConfig = await ctx.service.uied.aiConfig.getImportConfig();
      const networkConfig = importConfig?.network || importConfig?.remoteImageTransfer || {};
      if (Object.prototype.hasOwnProperty.call(networkConfig, 'allowInsecureTls')) {
        allowInsecureTls = Boolean(networkConfig.allowInsecureTls);
      }
      insecureDomains = this.normalizeInsecureDomainList(
        networkConfig.insecureDomains,
        insecureDomains
      );
    } catch (error) {
      ctx.logger.warn(`[album.getRemoteImageTransferConfig] 读取 AI 导入网络配置失败: ${error?.message || error}`);
    }

    if (process.env.UIED_REMOTE_ALLOW_INSECURE_TLS !== undefined) {
      const raw = String(process.env.UIED_REMOTE_ALLOW_INSECURE_TLS || '').trim().toLowerCase();
      allowInsecureTls = raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
    }
    if (process.env.UIED_REMOTE_INSECURE_DOMAINS) {
      insecureDomains = this.normalizeInsecureDomainList(
        process.env.UIED_REMOTE_INSECURE_DOMAINS,
        insecureDomains
      );
    }
    if (process.env.UIED_REMOTE_MAX_BYTES) {
      const envMaxBytes = Number(process.env.UIED_REMOTE_MAX_BYTES || 0);
      if (Number.isFinite(envMaxBytes) && envMaxBytes > 0) {
        maxBytes = envMaxBytes;
      }
    }
    if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
      maxBytes = 10 * 1024 * 1024;
    }

    return {
      allowInsecureTls,
      insecureDomains,
      maxBytes,
    };
  }

  /**
   * 判断是否为图片链接
   */
  isImageContentType(contentType = '') {
    return /^image\//i.test(String(contentType || '').trim());
  }

  /**
   * 判断是否为本地素材地址
   */
  isLocalMaterialUrl(url = '') {
    const value = String(url || '').trim();
    if (!value) return true;
    if (value.startsWith('/public/uploads/')) return true;
    if (value.startsWith('/api/uploads/')) return true;
    if (/^https?:\/\//i.test(value) && value.includes('/public/uploads/')) return true;
    if (/^https?:\/\//i.test(value) && value.includes('/api/uploads/')) return true;
    return false;
  }

  /**
   * 根据 content-type 与 url 推断图片后缀
   */
  resolveImageExt(contentType = '', url = '') {
    const type = String(contentType || '').toLowerCase();
    const map = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
    };
    if (map[type]) return map[type];
    const ext = path.extname(String(url || '')).replace('.', '').toLowerCase();
    if (ext && [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico' ].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
    return 'jpg';
  }

  /**
   * 下载远程图片为 Buffer
   */
  async fetchRemoteImageBuffer(remoteUrl, options = {}) {
    const { ctx } = this;
    const requestUrl = this.normalizeRemoteUrl(remoteUrl);
    if (!requestUrl || !/^https?:\/\//i.test(requestUrl)) {
      throw new Error('仅支持 http/https 图片地址');
    }

    const transferConfig = options.transferConfig || await this.getRemoteImageTransferConfig();
    const allowInsecureTlsForCurrentHost = () => {
      try {
        const parsed = new URL(requestUrl);
        const host = String(parsed.hostname || '').trim().toLowerCase();
        const allow = Boolean(transferConfig.allowInsecureTls);
        const whitelist = Array.isArray(transferConfig.insecureDomains) ? transferConfig.insecureDomains : [];
        return allow && this.matchInsecureTlsHost(host, whitelist);
      } catch (error) {
        return false;
      }
    };

    /**
     * 执行单次远程图片下载请求
     * @param {boolean} rejectUnauthorized - 是否严格校验证书
     */
    const curlOnce = async (rejectUnauthorized = true) => {
      return await ctx.curl(requestUrl, {
        method: 'GET',
        timeout: 20000,
        followRedirect: true,
        maxRedirects: 3,
        rejectUnauthorized,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UIED-Nav/1.0; +https://fsuied.com)',
          Accept: 'image/*,*/*;q=0.8',
        },
      });
    };

    let response = null;
    let lastError = null;
    try {
      response = await curlOnce(true);
    } catch (error) {
      lastError = error;
    }
    if (lastError && this.isTlsIssuerError(lastError) && allowInsecureTlsForCurrentHost()) {
      ctx.logger.warn(`album.fetchRemoteImageBuffer retry insecure tls: url=${requestUrl}`);
      try {
        response = await curlOnce(false);
        lastError = null;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      throw lastError;
    }
    if (Number(response.status || 0) >= 400) {
      throw new Error(`下载失败(${response.status})`);
    }
    const contentType = String(response.headers?.['content-type'] || '').split(';')[0].trim();
    if (contentType && !this.isImageContentType(contentType)) {
      throw new Error(`目标不是图片(${contentType})`);
    }
    const buffer = Buffer.isBuffer(response.data)
      ? response.data
      : Buffer.from(response.data || '');
    if (!buffer.length) {
      throw new Error('远程图片内容为空');
    }
    const maxBytes = Number(transferConfig.maxBytes || 10 * 1024 * 1024);
    if (buffer.length > maxBytes) {
      throw new Error(`图片过大，超过限制(${Math.ceil(maxBytes / 1024 / 1024)}MB)`);
    }
    return {
      buffer,
      contentType,
      finalUrl: requestUrl,
    };
  }

  /**
   * 将远程图片保存到本地素材库
   */
  async saveRemoteImageToAlbum(remoteUrl, cid = 0, options = {}) {
    const { ctx } = this;
    const { buffer, contentType, finalUrl } = await this.fetchRemoteImageBuffer(remoteUrl, options);
    const sourceExt = this.resolveImageExt(contentType, finalUrl);
    const safeDecode = value => {
      try {
        return decodeURIComponent(String(value || ''));
      } catch (error) {
        return String(value || '');
      }
    };
    const parsedRemoteName = (() => {
      try {
        const targetUrl = new URL(String(finalUrl || ''));
        return safeDecode(path.basename(targetUrl.pathname || '') || '').trim();
      } catch (error) {
        return safeDecode(path.basename(String(finalUrl || '').split('?')[0] || '') || '').trim();
      }
    })();
    const fallbackOriginalName = parsedRemoteName || `remote_${Date.now()}.${sourceExt}`;
    const compressConfig = this.normalizeMaterialUploadConfig(
      options.compressConfig || await this.getMaterialUploadConfig()
    );
    const compressEnabled = compressConfig.enabled && compressConfig.applyOnRemoteTransfer;
    const compressResult = await this.optimizeImageBuffer(buffer, sourceExt, {
      ...compressConfig,
      enabled: compressEnabled,
    });
    const remoteFileNameBase = this.buildRemoteFileNameBase(
      compressConfig.remoteNamePattern,
      fallbackOriginalName,
      compressResult.buffer
    );
    const writeResult = await this.writeBufferToUploadDir(
      compressResult.buffer,
      fallbackOriginalName,
      10,
      compressResult.ext || sourceExt,
      remoteFileNameBase
    );

    const aid = Number(ctx.session[reqAdminIdKey] || 0);
    const now = Math.floor(Date.now() / 1000);
    const addReq = {
      aid,
      cid: Number(cid || 0),
      type: 10,
      uri: writeResult.url,
      name: fallbackOriginalName || writeResult.fileName,
      ext: writeResult.ext,
      size: writeResult.sizeBytes,
      createTime: now,
      updateTime: now,
    };
    const albumId = await this.albumAdd(addReq);
    await this.saveAlbumSystemMeta(albumId, {
      mimeType: compressResult.mimeType || this.resolveMimeTypeByExt(writeResult.ext),
      width: compressResult.width,
      height: compressResult.height,
    });
    return {
      id: albumId,
      from: String(remoteUrl || ''),
      to: urlUtil.toAbsoluteUrl(writeResult.url),
      uri: writeResult.url,
      ext: writeResult.ext,
      size: writeResult.sizeBytes,
      compression: {
        enabled: compressEnabled,
        applied: compressResult.applied,
        reason: compressResult.reason,
        beforeBytes: compressResult.originalBytes,
        afterBytes: compressResult.finalBytes,
        savedBytes: compressResult.savedBytes,
        savedPercent: compressResult.savedPercent,
        resized: compressResult.resized,
      },
    };
  }

  /**
   * 批量转存远程图片
   */
  async transferRemoteImages(urls = [], cid = 0) {
    const candidates = Array.from(
      new Set(
        (Array.isArray(urls) ? urls : [])
          .map(url => this.normalizeRemoteUrl(url))
          .filter(url => /^https?:\/\//i.test(String(url || '').trim()))
          .filter(url => !this.isLocalMaterialUrl(url))
      )
    );

    const maps = [];
    const failed = [];
    const transferConfig = await this.getRemoteImageTransferConfig();
    const compressConfig = await this.getMaterialUploadConfig();
    for (let i = 0; i < candidates.length; i += 1) {
      const remoteUrl = candidates[i];
      try {
        const item = await this.saveRemoteImageToAlbum(remoteUrl, cid, { transferConfig, compressConfig });
        maps.push({
          from: item.from,
          to: item.to,
          id: item.id,
          uri: item.uri,
          compression: item.compression || null,
        });
      } catch (error) {
        failed.push({
          url: remoteUrl,
          reason: error.message || '转存失败',
        });
      }
    }

    return {
      count: maps.length,
      total: candidates.length,
      maps,
      failed,
    };
  }

  /**
   * 从正文中提取外链图片 URL
   */
  extractRemoteImageUrlsFromHtml(contentHtml = '') {
    const html = String(contentHtml || '');
    if (!html) return [];
    const tags = html.match(/<img\b[^>]*>/gi) || [];
    const urls = [];
    tags.forEach(tag => {
      const readAttr = name => {
        const re = new RegExp(`\\b${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, 'i');
        const matched = String(tag || '').match(re);
        return String(matched?.[1] || matched?.[2] || matched?.[3] || '').replace(/&amp;/g, '&').trim();
      };
      const src = readAttr('src') || readAttr('data-src') || readAttr('data-original');
      if (!src) return;
      const normalized = this.normalizeRemoteUrl(src);
      if (!/^https?:\/\//i.test(normalized)) return;
      if (this.isLocalMaterialUrl(normalized)) return;
      urls.push(normalized);
    });
    return Array.from(new Set(urls));
  }

  /**
   * 在正文中替换图片 URL（兼容 &amp; 场景）
   */
  replaceImageUrlsInHtml(contentHtml = '', maps = []) {
    let html = String(contentHtml || '');
    const list = Array.isArray(maps) ? maps : [];
    list.forEach(item => {
      const from = String(item?.from || '').trim();
      const to = String(item?.to || '').trim();
      if (!from || !to) return;
      const fromEscaped = from.replace(/&/g, '&amp;');
      html = html.split(from).join(to);
      html = html.split(fromEscaped).join(to);
    });
    return html;
  }

  /**
   * 一键转存正文外链图片并返回替换后的正文
   */
  async transferEditorContentImages(contentHtml = '', cid = 0) {
    const html = String(contentHtml || '');
    if (!html.trim()) {
      return {
        contentHtml: html,
        count: 0,
        total: 0,
        maps: [],
        failed: [],
      };
    }
    const urls = this.extractRemoteImageUrlsFromHtml(html);
    if (!urls.length) {
      return {
        contentHtml: html,
        count: 0,
        total: 0,
        maps: [],
        failed: [],
      };
    }
    const transferResult = await this.transferRemoteImages(urls, cid);
    const nextHtml = this.replaceImageUrlsInHtml(html, transferResult.maps);
    return {
      contentHtml: nextHtml,
      count: Number(transferResult.count || 0),
      total: Number(transferResult.total || 0),
      maps: transferResult.maps || [],
      failed: transferResult.failed || [],
    };
  }
}


module.exports = AlbumService;
