<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-09-26
 -->

# 数据目录说明

本目录只保留可审计的迁移脚本。生产数据库备份、管理员账号、操作日志、上传素材、导出数据和第三方 API 密钥不进入开源仓库。

全新部署请使用 `server/sql/install.sql` 与 `server/sql/uied_tables.sql`；已有站点升级请执行对应版本的 `server/sql/patch_*.sql`。如需导入自有数据，请通过 `UIED_IMPORT_DATA_PATH` 指定部署环境之外的脱敏 JSON 文件，并确认数据拥有再分发权限。
