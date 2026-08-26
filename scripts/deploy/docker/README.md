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

脚本会自动识别当前环境：

- 已有 `uied-api` 且后端已挂载到宿主机：自动原地安全升级，复用现有配置、依赖和容器，不拉基础镜像、不执行 `npm install`。
- 全新环境：生成 `/www/wwwroot/hao.uied.cn/shared/uied-api.env`，填写后构建标准 Docker 镜像。
- 已有容器但明确需要重建：在命令后增加 `--rebuild`。

原地升级会备份前台、后台和后端源码，并保护 `node_modules`、数据库配置、授权、日志和上传目录。若检测到生产依赖变化会在修改线上文件前停止，不会静默安装依赖。
