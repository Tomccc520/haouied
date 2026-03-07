/**
 * 函数说明：解析后台接口请求配置，自动规避 /api 前缀重复拼接问题
 */
function resolveRequestConfig() {
    const rawBaseUrl = String(import.meta.env.VITE_APP_BASE_URL || '')
        .trim()
        .replace(/\/+$/g, '')
    const hasApiSuffix = /\/api$/i.test(rawBaseUrl)
    const baseUrl = rawBaseUrl ? `${rawBaseUrl}/` : '/'
    const urlPrefix = hasApiSuffix ? '' : 'api'
    return {
        baseUrl,
        urlPrefix
    }
}

const requestConfig = resolveRequestConfig()

const config = {
    terminal: 1, //终端
    title: '后台管理系统', //网站默认标题
    version: '1.3.3', //版本号
    baseUrl: requestConfig.baseUrl, //请求接口域名
    urlPrefix: requestConfig.urlPrefix, //请求默认前缀
    timeout: 10 * 1000 //请求超时时长
}

export default config
