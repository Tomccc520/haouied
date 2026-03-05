/**
 * @file setupProxy.js
 * @description 代理配置文件，解决本地开发环境中的跨域问题
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 直接代理到外部网站
  app.use(
    '/api/external',
    createProxyMiddleware({
      target: 'https://www.88sheji.cn',
      changeOrigin: true,
      pathRewrite: function(path, req) {
        // 从查询参数中获取路径
        const targetPath = req.query.path || '';
        // 删除查询参数中的path
        delete req.query.path;
        return targetPath;
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.88sheji.cn/',
        'Origin': 'https://www.88sheji.cn',
        'Host': 'www.88sheji.cn'
      },
      onProxyReq: function(proxyReq, req, res) {
        console.log(`【代理请求】${req.method} ${req.url} => ${proxyReq.path}`);
      },
      onProxyRes: function(proxyRes, req, res) {
        console.log(`【代理响应】状态码: ${proxyRes.statusCode}`);
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
      onError: function(err, req, res) {
        console.error('【代理错误】', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: '代理请求失败', message: err.message }));
      }
    })
  );
  
  // WordPress API代理
  app.use(
    '/wp-json',
    createProxyMiddleware({
      target: 'https://www.uied.cn',
      changeOrigin: true,
      secure: true
    })
  );
}; 