<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-09-26
 -->

# 贡献指南

感谢参与 UIED 导航系统。项目是一个前后端一体的开源网址导航系统，欢迎提交问题、文档改进和代码贡献。

## 开发流程

1. Fork 仓库并从 `main` 创建功能分支。
2. 修改前先创建 Issue，说明问题、复现步骤或功能目标。
3. 不要提交 `.env`、授权文件、数据库备份、运行时导出文件、上传文件和构建临时目录。
4. 提交前运行与改动相关的检查：

```bash
cd server/server && npm run test:unit
cd ../../server/admin && npm run type-check
cd ../../frontend && npm run build:plain
```

5. 使用清晰的提交信息，例如 `feat: add ...`、`fix: correct ...`、`docs: update ...`。
6. Pull Request 中写明改动范围、测试命令和可能的数据库变更。

## 目录约定

- `frontend/`：React 官网前端。
- `server/admin/`：Vue 管理后台源码。
- `server/server/`：Egg.js API 服务。
- `server/sql/`：安装 SQL 与可重复执行的增量补丁。
- `scripts/`：发布预检、打包和部署脚本。

## 数据和配置

仓库只接受脱敏的示例配置。生产数据库、授权中心密钥、上传素材和客户导出数据必须放在仓库外，通过环境变量或持久化目录注入。
