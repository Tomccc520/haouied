<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-08-24
 -->

# UIED-NAV Docker 部署入口

正式部署只需要执行：

```bash
chmod +x scripts/deploy/docker/deploy.sh
./scripts/deploy/docker/deploy.sh --domain hao.uied.cn
```

首次运行会生成 `/www/wwwroot/hao.uied.cn/shared/uied-api.env` 并停止。填写数据库配置后再次执行同一条命令。

该流程把依赖固化在 `uied-nav-api:<VERSION>` 镜像中，`docker restart uied-api` 不会执行 `npm install`。上传文件、授权文件和日志独立保存在站点 `shared` 目录中。
