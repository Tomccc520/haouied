<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-09-26
 -->

# 安全政策

## 报告安全问题

不要在公开 Issue 中发布可利用的漏洞、访问令牌、授权文件或生产数据。请先通过 [UIED 官网](https://fsuied.com/) 联系维护团队，描述受影响版本、复现步骤和影响范围。

## 部署安全要求

- 首次安装必须自行设置管理员密码，禁止沿用示例密码。
- 生产环境必须使用独立数据库账号、强随机 Cookie 密钥和 HTTPS。
- `UIED_REQUIRE_PAID_LICENSE_ACTIVATION=false` 是开源默认模式；只有明确需要商业授权门禁时才设为 `true`。
- `UIED_ENABLE_LOCAL_LICENSE_SIGN` 在普通部署中必须保持 `false`，不要把签发端密钥放入客户或公开仓库。
- 上传目录、日志、备份和运行时导出文件应放在源码目录之外，并设置最小权限。
