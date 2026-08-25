# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-24

ARG NODE_IMAGE=node:20-bookworm-slim
FROM ${NODE_IMAGE}

WORKDIR /app

ENV NODE_ENV=production \
    EGG_SERVER_ENV=prod \
    TZ=Asia/Shanghai

ARG NPM_REGISTRY=https://registry.npmjs.org

COPY server/server/package.json server/server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --registry="${NPM_REGISTRY}" \
    && npm cache clean --force

COPY server/server/ ./
RUN cp config/config.prod.example.js config/config.prod.js \
    && mkdir -p logs licenses /data/uploads

EXPOSE 8002

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:8002/api/uied/license/public-status').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# egg-scripts 默认以前台模式运行；不要添加 --daemon，否则容器主进程会提前退出。
CMD ["node", "node_modules/egg-scripts/bin/egg-scripts.js", "start", "--title=uied-api", "--workers=1"]
