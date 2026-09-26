<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-09-26
 -->

# UIED 导航系统

> 一个开源、可自托管的 AI 与设计资源导航平台，包含 React 用户端、Vue 管理台和 Egg.js API。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Tomccc520/haouied.svg?style=social)](https://github.com/Tomccc520/haouied/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/Tomccc520/haouied.svg?style=social)](https://github.com/Tomccc520/haouied/network/members)
[![在线体验](https://img.shields.io/badge/demo-hao.uied.cn-1677ff)](https://hao.uied.cn/?utm_source=github&utm_medium=readme&utm_campaign=open_source)

**在线体验：** [hao.uied.cn](https://hao.uied.cn/?utm_source=readme&utm_medium=repository&utm_campaign=open_source) · **GitHub：** [Tomccc520/haouied](https://github.com/Tomccc520/haouied) · **Gitee：** [tomdac/haouied](https://gitee.com/tomdac/haouied)

## 项目简介

UIED 导航系统聚合 AI 写作、绘画、视频、办公、设计、编程工具，以及 UI、字体、图标、配色和 3D 资源。项目采用单仓结构，前后端代码与管理后台一起维护，适合个人站长、团队内部知识导航和二次开发。

旧的 [uied-nav-frontend](https://github.com/Tomccc520/uied-nav-frontend) 和 [Gitee 前端仓库](https://gitee.com/tomdac/uied-nav-frontend) 保留作历史参考；当前完整项目以 `haouied` 为唯一开发主线。旧仓库会保留迁移提示，搜索访问可顺着链接回到本仓。

## 核心能力

- 分类、标签、页面和网址的增删改查，以及批量导入导出
- AI 与设计资源导航、搜索建议、搜索历史和多维筛选
- 热门推荐、榜单、Banner、文章与投稿等运营模块
- Favicon 自动获取、SEO 配置、预渲染、Sitemap 与 robots
- 用户、角色、权限、操作日志和后台数据统计
- Docker / 宝塔部署，安装向导支持开源免授权模式
- 网站点击次数与按日点击统计，可在后台复盘站内流量

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 用户前端 | React 19、TypeScript、React Router 7、React Query、Zustand |
| 管理后台 | Vue 3、TypeScript、Vite、Element Plus |
| API 服务 | Egg.js、Sequelize、MySQL、Redis |
| 部署 | Node.js 20、Docker、Nginx / 宝塔 |

## 快速开始

### 环境要求

- Node.js >= 20（前端、管理后台和 API 使用同一 Node 主版本）
- npm >= 8
- MySQL 5.7+（推荐 8.0）
- Redis 6+（开发环境可使用 Docker）

### 克隆与安装

```bash
git clone https://github.com/Tomccc520/haouied.git
cd haouied

npm --prefix server/server install
npm --prefix server/admin install
npm --prefix frontend install
```

### 配置环境变量

```bash
cp frontend/.env.example frontend/.env
cp docker/uied-api.env.example docker/uied-api.env
cp server/server/config/config.local.example.js server/server/config/config.local.js
```

请按部署方式填写数据库、Redis、站点域名和 Cookie 签名密钥。RSA 加密/签名接口使用 `UIED_RSA_PUBLIC_KEY` 与 `UIED_RSA_PRIVATE_KEY` 注入，仓库不提供共享私钥。生产环境必须设置独立随机的 `UIED_APP_KEYS`，并保持密钥文件在源码目录之外。

### 初始化数据库

全新环境使用以下结构脚本：

```bash
mysql -h127.0.0.1 -P3306 -u你的数据库用户 -p 你的数据库名 < server/sql/install.sql
mysql -h127.0.0.1 -P3306 -u你的数据库用户 -p 你的数据库名 < server/sql/uied_tables.sql
```

`server/sql/install.sql` 可能包含初始化表的清理语句，只能用于全新数据库。已有站点升级请按版本执行 `server/sql/patch_*.sql`，不要导入生产数据库快照。

### 启动服务

```bash
# API 服务：http://localhost:8002
npm --prefix server/server run dev

# 管理后台：http://localhost:5174
npm --prefix server/admin run dev

# 用户前端：http://localhost:3003
npm --prefix frontend start
```

安装向导会创建首个管理员账号。示例账号只用于本地演示，首次登录后必须立即修改密码；生产环境不要复用文档、镜像或历史备份中的凭据。

## 开源与商业边界

本仓库默认使用 Free 开源模式：`UIED_REQUIRE_PAID_LICENSE_ACTIVATION=false`，不要求授权码即可完成安装，并开放自托管所需的完整功能。许可证中心、Pro / Enterprise 能力矩阵和授权门禁仍保留为可选的商业集成；商业部署可显式设置 `UIED_REQUIRE_PAID_LICENSE_ACTIVATION=true`。仓库不包含生产数据库、上传素材、授权文件或第三方服务密钥。

MIT 许可证只覆盖 UIED 自有代码。依赖包、第三方图标/字体、抓取的站点内容和用户上传素材分别受其原始许可证或权利人约束，部署前请自行确认再分发权限。

## 文档

- [安装与部署入口](INSTALL.md)
- [安装与部署验证记录](docs/1.0.7-install-test.md)
- [贡献指南](CONTRIBUTING.md)
- [安全政策](SECURITY.md)
- [机器可读项目说明](llms.txt)

## 流量与仓库运营

站内网址点击会写入 `uied_website.click_count` 与 `uied_website_click_daily`，热门推荐和榜单按这些数据排序。仓库访问量属于 GitHub / Gitee 平台统计，需在对应仓库的 Insights 或管理后台查看；README 中的 Demo 链接使用 UTM 参数区分 GitHub、Gitee 和普通文档来源。

为了让开源流量回到当前主线，请在 GitHub 与 Gitee 仓库设置中同步以下信息：

- Description：`开源、可自托管的 AI 与设计资源导航系统（React + Vue + Egg.js）`
- Topics / 标签：`ai-tools`、`design-resources`、`navigation`、`react`、`typescript`、`vue`、`eggjs`、`uied`
- Homepage：`https://hao.uied.cn/`
- GitHub 与 Gitee 的 README、About、站内页脚互相链接到 `haouied`

## 贡献与安全

请先阅读 [贡献指南](CONTRIBUTING.md)。发现安全问题时不要公开提交 Issue，按 [安全政策](SECURITY.md) 联系维护团队，并删除日志、令牌、授权文件和数据库导出中的敏感信息后再提供复现材料。

## 许可证

本项目采用 [MIT License](LICENSE)。

---

**© 2026 UIED 技术团队 · [官网](https://fsuied.com/) · [在线体验](https://hao.uied.cn/)**
