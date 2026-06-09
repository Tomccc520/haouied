# UIED-NAV 客户干净初始化 SQL

本目录用于客户源码交付后的“干净站点初始化”，不包含真实授权文件、演示用户、访问日志和客户私有数据。

推荐执行顺序：

1. 先导入基础结构：`server/sql/install.sql` 与后续补丁 SQL。
2. 再导入干净初始化数据：`server/sql/customer/starter.sql`。
3. 客户部署后把授权文件放入 `server/licenses/*.license`，或在后台授权中心按授权码激活。

示例：

```bash
mysql --default-character-set=utf8mb4 -u <user> -p <database> < server/sql/customer/starter.sql
```

注意：

- `starter.sql` 可重复执行，会按配置 key、slug、菜单 id 做幂等写入；已有配置只补空值，不覆盖客户后台已修改内容。
- `starter.sql` 默认写入 SEO 中心运营短链：`/xingliu` 跳转到星流推广链接，客户可在后台 SEO 中心继续调整。
- 老客户只想补 `/xingliu` 短链时，执行 `server/sql/patch_2026_0609_seo_xingliu_redirect.sql`；该补丁兼容 MySQL 5.6，不依赖 JSON 函数。
- 不建议把客户真实授权文件提交到源码仓库。
- 后台“导出客户包”默认会脱敏授权信息，不包含真实授权码、域名白名单和签名。
- 正式发包前建议执行 `node scripts/release-doctor.js --scan-release-archives`，深扫 `release/` 目录内 `.zip/.tgz` 是否夹带 `.license` 或已签名授权模板。
- 如果客户已有正式内容，请先备份数据库，再选择性执行。
