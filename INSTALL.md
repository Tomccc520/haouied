<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-09-26
 -->

# UIED 导航系统 - 安装指南

> 完整的安装和部署指南

## 📋 环境要求

- **Node.js**: >= 20.0.0
- **npm**: >= 8.0.0
- **MySQL**: >= 5.7（推荐 8.0）
- **Docker**: 可选（用于容器化 MySQL）
- **操作系统**: Linux / macOS / Windows

---

## 🚀 快速安装

### 1. 克隆项目

```bash
git clone https://github.com/Tomccc520/haouied.git
cd haouied

# 或者使用 Gitee（国内更快）
git clone https://gitee.com/tomdac/haouied.git
cd haouied
```

### 2. 准备 MySQL 数据库

```bash
# 方案A（默认）：Docker 启动 MySQL / Redis（端口 3308 / 6380）
cp docker/.env.example .env
# 编辑 .env，为 UIED_MYSQL_ROOT_PASSWORD、UIED_MYSQL_PASSWORD、UIED_REDIS_PASSWORD 设置随机值
docker compose --env-file .env -f docker/docker-compose.mysql.yml up -d
docker ps | grep uied-mysql

# 方案B（可选）：本机 MySQL / 宝塔 MySQL（通过 UIED_DB_* 环境变量覆盖）
# 建议创建数据库 uied_nav，并保证账号具备读写权限
```

### 3. 安装依赖

```bash
# 安装后端依赖
cd server/server
npm install

# 安装管理后台依赖
cd ../admin
npm install

# 安装前端依赖
cd ../../frontend
npm install
```

### 4. 配置环境变量

#### 前端配置

```bash
cd frontend
cp .env.example .env
```

编辑 `frontend/.env` 文件：

```env
# API 地址
REACT_APP_API_URL=http://localhost:8002/api
PORT=3003
```

### 5. 初始化数据库

```bash
# 方案A（默认）：Docker MySQL（使用你在 .env 中填写的密码）
docker compose --env-file .env -f docker/docker-compose.mysql.yml exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < server/sql/install.sql
docker compose --env-file .env -f docker/docker-compose.mysql.yml exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < server/sql/uied_tables.sql

# 方案B（可选）：本机 MySQL / 宝塔 MySQL
mysql -h127.0.0.1 -P3306 -u你的数据库用户 -p 你的数据库名 < server/sql/install.sql
mysql -h127.0.0.1 -P3306 -u你的数据库用户 -p 你的数据库名 < server/sql/uied_tables.sql
```

安装向导会创建首个管理员账号，请使用你自己的强密码。项目不再提供可直接登录的默认管理员密码。

### 6. 启动服务

#### 方式一：分别启动（推荐开发环境）

```bash
# 终端 1：启动后端 (Egg.js)
npm --prefix server/server run dev

# 终端 2：启动管理后台 (Vue 3)
npm --prefix server/admin run dev

# 终端 3：启动前端 (React)
npm --prefix frontend start
```

#### 方式二：使用启动脚本

```bash
# 在项目根目录
chmod +x start.sh
./start.sh
```

### 7. 访问系统

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:3003 | 用户访问的网站 |
| 管理后台 | http://localhost:5174 | 内容管理系统 |
| 后端 API | http://localhost:8002/api | RESTful API |

---

## 🗄️ 数据库说明

### MySQL（默认）

项目支持 MySQL 5.7+（推荐 8.0）数据库，默认连接项目内 Docker MySQL。

**数据库配置**：
- 主机: `127.0.0.1`
- 端口: `3308`（本机/宝塔请改为 `3306` 并配置 UIED_DB_*）
- 数据库名: `uied_nav`
- 用户名和密码：使用 `.env` 或 `UIED_DB_*` 环境变量提供

**备份数据库**：
```bash
docker exec uied-mysql mysqldump -u uied -p uied_nav > /path/outside-repository/uied_nav_backup_$(date +%Y%m%d_%H%M%S).sql
```

**恢复数据库**：
```bash
docker exec -i uied-mysql mysql -u uied -p uied_nav < /path/outside-repository/uied_nav_backup_YYYYMMDD_HHMMSS.sql
```

---

## 🔧 常见问题

### 1. 端口被占用

如果端口被占用，可以修改：

**后端端口**：修改 `server/server/config/config.local.js` 中的端口配置

**前端端口**：修改 `frontend/.env` 中的 `PORT`

**管理后台端口**：修改 `server/admin/vite.config.ts`

### 2. MySQL 连接失败

```bash
# Docker MySQL 检查（默认）
docker ps | grep uied-mysql
docker logs uied-mysql
docker compose --env-file .env -f docker/docker-compose.mysql.yml restart

# 本机 MySQL（宝塔）检查
mysql -h127.0.0.1 -P3306 -u你的数据库用户 -p -e "SELECT VERSION();"
```

### 3. 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 4. 前端无法连接后端

检查：
1. 后端是否正常启动（http://localhost:8002/api）
2. 前端 `.env` 中的 `REACT_APP_API_URL` 是否正确
3. MySQL 数据库是否正常运行

---

## 🚀 生产环境部署

### 1. 构建前端

```bash
cd frontend
npm run build
# 构建产物在 build/ 目录
```

### 2. 构建管理后台

```bash
cd server/admin
npm run build
# 构建产物在 dist/ 目录
```

### 3. 配置生产环境

编辑 `server/server/config/config.prod.js`：

```javascript
config.sequelize = {
  dialect: 'mysql',
  host: 'your-mysql-host',
  port: 3306,
  database: 'uied_nav',
  username: 'your-username',
  password: 'your-password',
};
```

### 4. 启动生产环境

```bash
cd server/server
npm start
```

### 5. 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端
    location / {
        root /path/to/frontend/build;
        try_files $uri /index.html;
    }

    # 管理后台
    location /admin {
        root /path/to/server/admin/dist;
        try_files $uri /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📚 更多文档

- [贡献指南](CONTRIBUTING.md)
- [安全政策](SECURITY.md)
- [部署验证记录](docs/1.0.7-install-test.md)
- [常见问题](https://github.com/Tomccc520/haouied/issues)

---

## 💬 获取帮助

- **GitHub Issues**: https://github.com/Tomccc520/haouied/issues
- **Gitee Issues**: https://gitee.com/tomdac/haouied/issues
- **官网**: https://fsuied.com

---

**© 2026 UIED技术团队. All Rights Reserved.**
