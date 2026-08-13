#!/usr/bin/env node
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-09
 */
/**
 * @file scripts/prerender-seo.js
 * @description 前端构建后 SEO 预渲染脚本：为关键路由生成静态 HTML 首屏元信息与 sitemap
 */

'use strict'

const fs = require('fs/promises')
const fsSync = require('fs')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const BUILD_DIR = path.join(PROJECT_ROOT, 'build')
const INDEX_HTML_PATH = path.join(BUILD_DIR, 'index.html')

/**
 * 解析 .env 文本内容（简化版）。
 * @param {string} text 文件内容
 * @returns {Record<string, string>} 键值映射
 */
function parseDotenvText(text) {
  const lines = String(text || '').split(/\r?\n/)
  const output = {}
  lines.forEach(line => {
    const trimmed = String(line || '').trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const index = trimmed.indexOf('=')
    if (index <= 0) return
    const key = trimmed.slice(0, index).trim()
    if (!key) return
    let value = trimmed.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    output[key] = value
  })
  return output
}

/**
 * 预渲染脚本主动加载构建环境变量，避免 node 脚本漏读 .env.production。
 */
function loadBuildEnv() {
  const envFiles = [
    '.env.production.local',
    '.env.production',
    '.env.local',
    '.env',
  ]
  envFiles.forEach(fileName => {
    const filePath = path.join(PROJECT_ROOT, fileName)
    if (!fsSync.existsSync(filePath)) return
    try {
      const content = fsSync.readFileSync(filePath, 'utf8')
      const parsed = parseDotenvText(content)
      Object.keys(parsed).forEach(key => {
        if (process.env[key] === undefined || process.env[key] === '') {
          process.env[key] = parsed[key]
        }
      })
    } catch (error) {
      console.warn(`[seo-prerender] 加载环境文件失败 ${fileName}: ${error.message || error}`)
    }
  })
}

loadBuildEnv()

/**
 * 将输入地址规范化为 origin（协议+域名+端口）。
 * @param {unknown} rawAddress 原始地址
 * @param {string} fallback 默认值
 * @returns {string} 规范化后的 origin
 */
function normalizeOrigin(rawAddress, fallback = '') {
  const text = String(rawAddress || '').trim()
  if (!text) {
    return String(fallback || '').trim().replace(/\/+$/, '')
  }
  try {
    const url = new URL(text)
    return `${url.protocol}//${url.host}`
  } catch (_error) {
    return text
      .replace(/\/api\/?$/i, '')
      .replace(/\/+$/, '')
  }
}

/**
 * 从前端 API 地址推导站点 origin，兼容 REACT_APP_API_URL=.../api 的场景。
 * @returns {string} 推导出的 origin
 */
function deriveOriginFromFrontendApiEnv() {
  return normalizeOrigin(process.env.REACT_APP_API_URL, '')
}

const DEFAULT_SITE_ORIGIN = normalizeOrigin(
  process.env.SEO_SITE_ORIGIN,
  process.env.REACT_APP_SITE_ORIGIN || deriveOriginFromFrontendApiEnv() || 'http://127.0.0.1:3003'
) || 'http://127.0.0.1:3003'

const DEFAULT_API_ORIGIN = normalizeOrigin(
  process.env.SEO_API_ORIGIN,
  deriveOriginFromFrontendApiEnv() || 'http://127.0.0.1:8002'
) || DEFAULT_SITE_ORIGIN

/**
 * 解析布尔环境变量。
 * @param {unknown} value 原始值
 * @param {boolean} fallback 默认值
 * @returns {boolean} 解析结果
 */
function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLowerCase()
  if ([ '1', 'true', 'yes', 'y', 'on' ].includes(text)) return true
  if ([ '0', 'false', 'no', 'n', 'off' ].includes(text)) return false
  return fallback
}

/**
 * 解析正整数并限制上下限。
 * @param {unknown} value 原始值
 * @param {number} fallback 默认值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 解析结果
 */
function parsePositiveInt(value, fallback, min = 1, max = 50000) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.max(min, Math.min(max, parsed))
}

const INCLUDE_WEBSITE_DETAILS = parseBoolean(process.env.SEO_INCLUDE_WEBSITE_DETAILS, true)
const WEBSITE_LIMIT = parsePositiveInt(process.env.SEO_WEBSITE_LIMIT, 5000, 1, 50000)
const STRICT_ENV_REQUIRED = parseBoolean(process.env.SEO_STRICT_ENV, true)
const ALLOW_MANIFEST_FALLBACK = parseBoolean(process.env.SEO_ALLOW_FALLBACK_MANIFEST, false)
const FALLBACK_SITE_SEO = {
  siteName: 'UIED AI工具导航',
  siteTitle: 'UIED AI工具导航 - 精选AI工具与资源平台',
  siteDescription: 'UIED AI导航汇集全球优质AI工具与资源，帮助设计师、开发者与创作者高效发现并使用 AI 工具。',
  siteKeywords: 'UIED,UIED AI导航,AI导航,AI工具,AI工具导航,人工智能工具',
}

/**
 * 从站点信息中提取 SEO 字段并做兜底。
 * @param {any} siteInfo 站点信息对象
 * @returns {{siteName:string,siteTitle:string,siteDescription:string,siteKeywords:string}} 站点 SEO
 */
function resolveSiteSeo(siteInfo) {
  const source = siteInfo && typeof siteInfo === 'object' ? siteInfo : {}
  const siteName = String(source.siteName || source.site_name || FALLBACK_SITE_SEO.siteName).trim() || FALLBACK_SITE_SEO.siteName
  const siteTitle = String(source.siteTitle || source.site_title || siteName).trim() || siteName
  const siteDescription = String(
    source.siteDescription || source.site_description || source.description || FALLBACK_SITE_SEO.siteDescription
  ).trim() || FALLBACK_SITE_SEO.siteDescription
  const siteKeywords = String(
    source.siteKeywords || source.site_keywords || source.keywords || FALLBACK_SITE_SEO.siteKeywords
  ).trim() || FALLBACK_SITE_SEO.siteKeywords
  return { siteName, siteTitle, siteDescription, siteKeywords }
}

/**
 * 兼容接口返回包装结构（{code,data} / axios response.data / 裸对象）。
 * @param {any} payload 原始返回
 * @returns {any} 解包后的数据
 */
function unwrapData(payload) {
  if (payload && typeof payload === 'object') {
    if ('code' in payload && 'data' in payload) {
      return payload.code === 0 ? payload.data : null
    }
    if ('data' in payload && Object.keys(payload).length === 1) {
      return payload.data
    }
  }
  return payload
}

/**
 * 转义 HTML 文本内容，避免写入标签时破坏结构。
 * @param {string} value 原始文本
 * @returns {string} 转义后文本
 */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 转义正则特殊字符。
 * @param {string} text 原始文本
 * @returns {string} 转义结果
 */
function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 规范化路由路径，去除 query/hash 并统一前后斜杠。
 * @param {unknown} value 原始路径
 * @returns {string} 规范化路径
 */
function normalizeRoutePath(value) {
  const raw = String(value || '').trim()
  if (!raw) return '/'
  const purePath = raw.split('?')[0].split('#')[0].trim()
  if (!purePath || purePath === '/') return '/'
  return `/${purePath.replace(/^\/+/, '').replace(/\/+$/, '')}`
}

/**
 * 将路径转为绝对 URL。
 * @param {string} input 路径或 URL
 * @param {string} siteOrigin 站点域名
 * @returns {string} 绝对 URL
 */
function toAbsoluteUrl(input, siteOrigin) {
  const raw = String(input || '').trim()
  if (!raw) return siteOrigin
  if (/^https?:\/\//i.test(raw)) return raw
  const normalizedPath = normalizeRoutePath(raw)
  return `${siteOrigin}${normalizedPath}`
}

/**
 * 将富文本转换为可安全写入首屏兜底内容的纯文本。
 * @param {unknown} value 富文本或普通文本
 * @param {number} limit 最大字符数
 * @returns {string} 清洗后的纯文本
 */
function stripHtmlToText(value, limit = 6000) {
  const text = String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim()
  return text.slice(0, Math.max(200, limit)).trim()
}

/**
 * 将时间戳转换为 JSON-LD 使用的 ISO 时间。
 * @param {unknown} value Unix 秒级时间戳
 * @returns {string|undefined} ISO 时间或空值
 */
function toIsoDate(value) {
  const timestamp = Number.parseInt(String(value || ''), 10)
  if (!Number.isInteger(timestamp) || timestamp <= 0) return undefined
  const date = new Date(timestamp * 1000)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * 生成详情页首屏静态兜底内容，确保禁用脚本或爬虫首访仍能读到正文摘要。
 * @param {object} route 路由 SEO 数据
 * @returns {string} HTML 片段
 */
function buildPrerenderFallback(route) {
  const bodyText = stripHtmlToText(route.bodyContent, 6000)
  const imageHtml = route.image
    ? `<figure><img src="${escapeHtml(route.image)}" alt="${escapeHtml(route.title)}" width="1200" height="630" loading="eager" /><figcaption>${escapeHtml(route.title)}</figcaption></figure>`
    : ''
  const dateHtml = route.datePublished && toIsoDate(route.datePublished)
    ? `<time datetime="${escapeHtml(toIsoDate(route.datePublished))}">${escapeHtml(toIsoDate(route.datePublished).slice(0, 10))}</time>`
    : ''
  const bodyHtml = bodyText
    ? `<p>${escapeHtml(bodyText).replace(/\n/g, '<br />')}</p>`
    : `<p>${escapeHtml(route.description)}</p>`
  return `<main id="seo-prerender-content"><h1>${escapeHtml(route.title)}</h1>${imageHtml}<p>${escapeHtml(route.description)}</p>${dateHtml}${bodyHtml}</main>`
}

/**
 * 写入当前路由的 JSON-LD 结构化数据。
 * @param {string} html 原始 HTML
 * @param {object} route 路由 SEO 数据
 * @param {object} siteSeo 站点 SEO
 * @returns {string} 写入后的 HTML
 */
function upsertRouteJsonLd(html, route, siteSeo) {
  const canonicalUrl = route.canonicalUrl
  const graph = [{
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: route.title,
    description: route.description,
    isPartOf: { '@id': `${siteSeo.url}#website` },
    inLanguage: 'zh-CN',
  }]
  if (route.seoType === 'Article') {
    graph.push({
      '@type': 'Article',
      '@id': `${canonicalUrl}#article`,
      headline: route.title,
      description: route.description,
      url: canonicalUrl,
      ...(route.image ? { image: [ route.image ] } : {}),
      ...(toIsoDate(route.datePublished) ? { datePublished: toIsoDate(route.datePublished) } : {}),
      ...(toIsoDate(route.updatedAt) ? { dateModified: toIsoDate(route.updatedAt) } : {}),
      author: route.author ? { '@type': 'Person', name: route.author } : { '@type': 'Organization', name: siteSeo.siteName },
      publisher: { '@type': 'Organization', name: siteSeo.siteName, url: siteSeo.url },
      ...(route.category ? { articleSection: route.category } : {}),
      inLanguage: 'zh-CN',
    })
  } else if (route.seoType === 'SoftwareApplication') {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${canonicalUrl}#application`,
      name: route.title,
      description: route.description,
      url: canonicalUrl,
      ...(route.image ? { image: route.image } : {}),
      applicationCategory: 'WebApplication',
      operatingSystem: 'Web',
      inLanguage: 'zh-CN',
    })
  }
  const node = `<script id="seo-route-jsonld" type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)}\n</script>`
  const pattern = /<script[^>]*id=["']seo-route-jsonld["'][^>]*>[\s\S]*?<\/script>/i
  return pattern.test(html) ? html.replace(pattern, node) : html.replace(/<\/head>/i, `    ${node}\n</head>`)
}

/**
 * 替换或新增 <title>。
 * @param {string} html 原始 HTML
 * @param {string} title 标题
 * @returns {string} 新 HTML
 */
function upsertTitle(html, title) {
  const node = `<title>${escapeHtml(title)}</title>`
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, node)
  }
  return html.replace(/<head>/i, `<head>\n    ${node}`)
}

/**
 * 替换或新增 meta 标签（name/property）。
 * @param {string} html 原始 HTML
 * @param {'name'|'property'} attr 属性名
 * @param {string} key 属性值
 * @param {string} content content 值
 * @returns {string} 新 HTML
 */
function upsertMetaTag(html, attr, key, content) {
  const safeKey = escapeRegExp(key)
  const node = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`
  const oppositeAttr = attr === 'name' ? 'property' : 'name'
  const legacyPattern = new RegExp(`<meta[^>]*${oppositeAttr}=["']${safeKey}["'][^>]*>`, 'ig')
  const cleanedHtml = html.replace(legacyPattern, '')
  const pattern = new RegExp(`<meta[^>]*${attr}=["']${safeKey}["'][^>]*>`, 'i')
  if (pattern.test(cleanedHtml)) {
    return cleanedHtml.replace(pattern, node)
  }
  return cleanedHtml.replace(/<\/head>/i, `    ${node}\n</head>`)
}

/**
 * 替换或新增 canonical 链接。
 * @param {string} html 原始 HTML
 * @param {string} canonicalUrl canonical URL
 * @returns {string} 新 HTML
 */
function upsertCanonical(html, canonicalUrl) {
  const node = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  const pattern = /<link[^>]*rel=["']canonical["'][^>]*>/i
  if (pattern.test(html)) {
    return html.replace(pattern, node)
  }
  return html.replace(/<\/head>/i, `    ${node}\n</head>`)
}

/**
 * 更新 JSON-LD 站点结构化数据（若存在 WebSite 节点）。
 * @param {string} html 原始 HTML
 * @param {{siteName:string,siteDescription:string,url:string}} seo 站点 SEO
 * @returns {string} 新 HTML
 */
function upsertWebsiteJsonLd(html, seo) {
  const pattern = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i
  const match = html.match(pattern)
  if (!match) return html

  try {
    const json = JSON.parse(match[1])
    if (json && typeof json === 'object' && String(json['@type'] || '').toLowerCase() === 'website') {
      let siteOrigin = String(seo.url || '').trim()
      try {
        const parsedOrigin = new URL(siteOrigin)
        siteOrigin = `${parsedOrigin.protocol}//${parsedOrigin.host}`
      } catch (_error) {
        siteOrigin = siteOrigin.replace(/\/+$/, '')
      }
      json.name = seo.siteName
      json.description = seo.siteDescription
      json.url = seo.url
      if (json.potentialAction && typeof json.potentialAction === 'object') {
        json.potentialAction.target = `${siteOrigin || seo.url}/search?q={search_term_string}`
      }
      if (json.publisher && typeof json.publisher === 'object' && siteOrigin) {
        json.publisher.url = siteOrigin
      }
      const node = `<script type="application/ld+json">\n${JSON.stringify(json, null, 2)}\n</script>`
      return html.replace(pattern, node)
    }
  } catch (error) {
    return html
  }

  return html
}

/**
 * 将路由 SEO 信息应用到 HTML 模板。
 * @param {string} html 原始模板
 * @param {object} route 路由 SEO
 * @param {object} siteSeo 站点 SEO
 * @returns {string} 渲染后的 HTML
 */
function renderSeoHtml(html, route, siteSeo) {
  let output = html
  output = upsertTitle(output, route.title)
  output = upsertMetaTag(output, 'name', 'description', route.description)
  output = upsertMetaTag(output, 'name', 'keywords', route.keywords)
  output = upsertMetaTag(output, 'name', 'robots', route.noindex ? 'noindex,nofollow' : 'index,follow')
  output = upsertMetaTag(output, 'property', 'og:type', route.seoType === 'Article' ? 'article' : 'website')
  output = upsertMetaTag(output, 'property', 'og:title', route.title)
  output = upsertMetaTag(output, 'property', 'og:description', route.description)
  output = upsertMetaTag(output, 'property', 'og:url', route.canonicalUrl)
  output = upsertMetaTag(output, 'property', 'og:site_name', siteSeo.siteName)
  if (route.image) {
    output = upsertMetaTag(output, 'property', 'og:image', route.image)
    output = upsertMetaTag(output, 'name', 'twitter:image', route.image)
  }
  output = upsertMetaTag(output, 'name', 'twitter:card', 'summary_large_image')
  output = upsertMetaTag(output, 'name', 'twitter:title', route.title)
  output = upsertMetaTag(output, 'name', 'twitter:description', route.description)
  output = upsertMetaTag(output, 'name', 'twitter:url', route.canonicalUrl)
  output = upsertCanonical(output, route.canonicalUrl)
  output = upsertWebsiteJsonLd(output, {
    siteName: siteSeo.siteName,
    siteDescription: siteSeo.siteDescription,
    url: route.canonicalUrl,
  })
  output = upsertRouteJsonLd(output, route, { ...siteSeo, url: siteSeo.url || route.canonicalUrl })
  output = output.replace(/<div id=["']root["']><\/div>/i, `<div id="root">${buildPrerenderFallback(route)}</div>`)
  return output
}

/**
 * 规范化清单中的路由对象。
 * @param {object} item 清单路由
 * @param {object} siteSeo 站点 SEO
 * @param {string} siteOrigin 站点域名
 * @returns {object|null} 规范化结果
 */
function normalizeRouteMeta(item, siteSeo, siteOrigin) {
  if (!item || typeof item !== 'object') return null
  const pathName = normalizeRoutePath(item.path)
  if (!pathName) return null
  const canonicalPath = normalizeRoutePath(item.canonicalPath || pathName)
  const title = String(item.title || siteSeo.siteTitle || siteSeo.siteName).trim() || siteSeo.siteTitle
  const description = String(item.description || siteSeo.siteDescription || '').trim() || siteSeo.siteDescription
  const keywords = String(item.keywords || siteSeo.siteKeywords || '').trim() || siteSeo.siteKeywords
  const canonicalUrl = toAbsoluteUrl(canonicalPath, siteOrigin)
  const updatedAt = Number.parseInt(String(item.updatedAt || Date.now() / 1000), 10)
  return {
    path: pathName,
    canonicalPath,
    canonicalUrl,
    title,
    description,
    keywords,
    noindex: item.noindex === true,
    updatedAt: Number.isInteger(updatedAt) && updatedAt > 0 ? updatedAt : Math.floor(Date.now() / 1000),
    seoType: String(item.seoType || 'WebPage').trim() || 'WebPage',
    image: item.image ? toAbsoluteUrl(item.image, siteOrigin) : '',
    bodyContent: String(item.bodyContent || '').trim(),
    author: String(item.author || '').trim(),
    category: String(item.category || '').trim(),
    datePublished: Number.parseInt(String(item.datePublished || 0), 10) || 0,
    breadcrumbs: Array.isArray(item.breadcrumbs) ? item.breadcrumbs.map(crumb => ({
      name: String(crumb?.name || '').trim(),
      url: toAbsoluteUrl(crumb?.url || '/', siteOrigin),
    })).filter(crumb => crumb.name) : [],
  }
}

/**
 * 将路由路径映射到 build 目录下的目标 HTML 文件。
 * @param {string} routePath 路由路径
 * @returns {string} 输出文件路径
 */
function resolveOutputFilePath(routePath) {
  const normalized = normalizeRoutePath(routePath)
  if (normalized === '/') return INDEX_HTML_PATH
  const segments = normalized
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map(segment => {
      const safe = segment.replace(/[\\/]/g, '-')
      return safe === '.' || safe === '..' ? '_' : safe
    })
  return path.join(BUILD_DIR, ...segments, 'index.html')
}

/**
 * 请求 JSON 数据。
 * @param {string} url 请求地址
 * @returns {Promise<any>} JSON 数据
 */
async function fetchJson(url) {
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }
  return response.json()
}

/**
 * 拉取站点 SEO 信息（site-info）。
 * @param {string} apiOrigin API 域名
 * @returns {Promise<{siteName:string,siteTitle:string,siteDescription:string,siteKeywords:string}>} 站点 SEO
 */
async function fetchSiteSeo(apiOrigin) {
  const requestUrl = `${apiOrigin}/api/site-info`
  const payload = await fetchJson(requestUrl)
  const data = unwrapData(payload) || {}
  return resolveSiteSeo(data)
}

/**
 * 拉取后端 SEO 清单；默认失败即中断，必要时可通过环境变量开启降级。
 * @param {string} apiOrigin API 域名
 * @param {string} siteOrigin 站点域名
 * @returns {Promise<{siteSeo: object, routes: object[]}>} 清单结果
 */
async function loadSeoManifest(apiOrigin, siteOrigin) {
  const requestUrl = `${apiOrigin}/api/seo/prerender-manifest?includeWebsiteDetails=${INCLUDE_WEBSITE_DETAILS ? '1' : '0'}&websiteLimit=${WEBSITE_LIMIT}&siteOrigin=${encodeURIComponent(siteOrigin)}`

  try {
    const payload = await fetchJson(requestUrl)
    const data = unwrapData(payload) || {}
    const siteInfo = data.siteInfo && typeof data.siteInfo === 'object' ? data.siteInfo : {}
    const routes = Array.isArray(data.routes) ? data.routes : []
    const siteSeo = resolveSiteSeo(siteInfo)
    const normalizedRoutes = routes.filter(item => item && typeof item === 'object')
    if (normalizedRoutes.length > 0) {
      return { siteSeo, routes: normalizedRoutes }
    }

    if (!ALLOW_MANIFEST_FALLBACK) {
      throw new Error('清单为空：请检查 /api/seo/prerender-manifest 返回数据，或设置 SEO_ALLOW_FALLBACK_MANIFEST=1 允许降级')
    }
    console.warn('[seo-prerender] 清单为空，已按 SEO_ALLOW_FALLBACK_MANIFEST=1 降级为 site-info 首页 SEO')
    return { siteSeo, routes }
  } catch (error) {
    if (!ALLOW_MANIFEST_FALLBACK) {
      throw new Error(`[seo-prerender] 拉取清单失败：${error.message || error}`)
    }
    console.warn(`[seo-prerender] 拉取清单失败，按 SEO_ALLOW_FALLBACK_MANIFEST=1 尝试 site-info：${error.message || error}`)
    try {
      const siteSeo = await fetchSiteSeo(apiOrigin)
      return {
        siteSeo,
        routes: [
          {
            path: '/',
            title: siteSeo.siteTitle,
            description: siteSeo.siteDescription,
            keywords: siteSeo.siteKeywords,
          },
        ],
      }
    } catch (siteError) {
      console.warn(`[seo-prerender] site-info 也失败，按 SEO_ALLOW_FALLBACK_MANIFEST=1 降级为默认首页：${siteError.message || siteError}`)
      return {
        siteSeo: { ...FALLBACK_SITE_SEO },
        routes: [
          {
            path: '/',
            title: FALLBACK_SITE_SEO.siteTitle,
            description: FALLBACK_SITE_SEO.siteDescription,
            keywords: FALLBACK_SITE_SEO.siteKeywords,
          },
        ],
      }
    }
  }
}

/**
 * 生成 sitemap XML。
 * @param {string} siteOrigin 站点域名
 * @param {Array<object>} routes 路由列表
 * @returns {string} sitemap XML 内容
 */
function buildSitemapXml(siteOrigin, routes) {
  const unique = new Map()
  routes.forEach(route => {
    if (!route || route.noindex) return
    const canonicalUrl = toAbsoluteUrl(route.canonicalPath || route.path, siteOrigin)
    if (!canonicalUrl) return
    const lastmodDate = new Date((route.updatedAt || Math.floor(Date.now() / 1000)) * 1000)
      .toISOString()
      .slice(0, 10)
    unique.set(canonicalUrl, {
      loc: canonicalUrl,
      lastmod: lastmodDate,
    })
  })

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
  unique.forEach(item => {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeHtml(item.loc)}</loc>`)
    lines.push(`    <lastmod>${item.lastmod}</lastmod>`)
    lines.push('  </url>')
  })
  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

/**
 * 执行预渲染流程。
 */
async function run() {
  if (STRICT_ENV_REQUIRED) {
    if (!/^https?:\/\//i.test(DEFAULT_SITE_ORIGIN) || !/^https?:\/\//i.test(DEFAULT_API_ORIGIN)) {
      throw new Error('SEO 预渲染地址必须是 http(s) 绝对地址，请检查 SEO_SITE_ORIGIN / SEO_API_ORIGIN 配置')
    }
  }
  const indexHtml = await fs.readFile(INDEX_HTML_PATH, 'utf8')
  console.log(`[seo-prerender] siteOrigin=${DEFAULT_SITE_ORIGIN}`)
  console.log(`[seo-prerender] apiOrigin=${DEFAULT_API_ORIGIN}`)
  console.log(`[seo-prerender] strictEnv=${STRICT_ENV_REQUIRED ? 'on' : 'off'}, allowFallback=${ALLOW_MANIFEST_FALLBACK ? 'on' : 'off'}`)
  const { siteSeo, routes } = await loadSeoManifest(DEFAULT_API_ORIGIN, DEFAULT_SITE_ORIGIN)

  const normalizedRoutes = []
  const routeMap = new Map()

  routes.forEach(item => {
    const normalized = normalizeRouteMeta(item, siteSeo, DEFAULT_SITE_ORIGIN)
    if (!normalized) return
    routeMap.set(normalized.path, normalized)
  })

  if (!routeMap.has('/')) {
    routeMap.set('/', normalizeRouteMeta({ path: '/', title: siteSeo.siteTitle, description: siteSeo.siteDescription, keywords: siteSeo.siteKeywords }, siteSeo, DEFAULT_SITE_ORIGIN))
  }

  routeMap.forEach(route => {
    if (route) normalizedRoutes.push(route)
  })

  let renderedCount = 0
  for (const route of normalizedRoutes) {
    const html = renderSeoHtml(indexHtml, route, { ...siteSeo, url: DEFAULT_SITE_ORIGIN })
    const outputFilePath = resolveOutputFilePath(route.path)
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true })
    await fs.writeFile(outputFilePath, html, 'utf8')
    renderedCount += 1
  }

  const sitemapXml = buildSitemapXml(DEFAULT_SITE_ORIGIN, normalizedRoutes)
  await fs.writeFile(path.join(BUILD_DIR, 'sitemap.xml'), sitemapXml, 'utf8')

  console.log(`[seo-prerender] 完成：${renderedCount} 个路由已写入静态 SEO HTML`)
  console.log(`[seo-prerender] sitemap.xml 已更新，siteOrigin=${DEFAULT_SITE_ORIGIN}`)
}

run().catch(error => {
  console.error('[seo-prerender] 执行失败:', error)
  process.exit(1)
})
