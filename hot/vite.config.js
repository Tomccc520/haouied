import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/favorites': {
        target: 'https://www.88sheji.cn/favorites',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/favorites/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': 'https://www.88sheji.cn/',
          'Origin': 'https://www.88sheji.cn'
        }
      },
    }
  },
}); 