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

- `starter.sql` 可重复执行，会按配置 key、slug、菜单 id 做幂等写入。
- 不建议把客户真实授权文件提交到源码仓库。
- 如果客户已有正式内容，请先备份数据库，再选择性执行。
