#!/usr/bin/env bash
# @copyright Tomda (https://www.tomda.top)
# @copyright UIED技术团队 (https://fsuied.com)
# @author UIED技术团队
# @createDate 2026-08-24

set -Eeuo pipefail

ORIGIN="${1:-}"

# 输出 SEO 验证失败信息并停止。
fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

# 输出 SEO 验证通过信息。
pass() {
  echo "[PASS] $1"
}

# 请求公开地址并保存响应头和正文。
fetch_url() {
  local path="$1"
  local output_prefix="$2"
  curl -fsSL --max-time 30 -D "${output_prefix}.headers" \
    "$ORIGIN$path" -o "${output_prefix}.body"
}

# 执行生产 SEO 链路验证。
main() {
  local temp_dir status_code
  [[ "$ORIGIN" =~ ^https?://[^/]+$ ]] || fail "用法: $0 https://你的域名"
  temp_dir="$(mktemp -d)"
  trap 'rm -rf "$temp_dir"' EXIT

  fetch_url '/robots.txt' "$temp_dir/robots"
  grep -qi '^content-type:.*text/plain' "$temp_dir/robots.headers" || fail 'robots.txt Content-Type 不是 text/plain'
  grep -q 'Sitemap:' "$temp_dir/robots.body" || fail 'robots.txt 缺少 Sitemap 声明'
  grep -Eq '^Disallow: /(admin|api)$' "$temp_dir/robots.body" || fail 'robots.txt 未禁止后台或 API 路径'
  grep -Eq '^Sitemap: https?://.+/sitemap\.xml$' "$temp_dir/robots.body" || fail 'robots.txt 的 Sitemap 地址不是绝对 URL'
  pass 'robots.txt 动态响应正常'

  fetch_url '/sitemap.xml' "$temp_dir/sitemap"
  grep -qi '^content-type:.*\(xml\|text/plain\)' "$temp_dir/sitemap.headers" || fail 'sitemap.xml Content-Type 不是 XML'
  grep -q '<urlset' "$temp_dir/sitemap.body" || fail 'sitemap.xml 缺少 urlset'
  pass '基础 Sitemap 正常'

  fetch_url '/sitemap-advanced.xml' "$temp_dir/advanced"
  grep -qi '^content-type:.*xml' "$temp_dir/advanced.headers" || fail '进阶 Sitemap Content-Type 不是 XML'
  grep -q '<sitemapindex' "$temp_dir/advanced.body" || fail '进阶 Sitemap 被 SPA 或静态 HTML 接管'
  pass '进阶 Sitemap 正常'

  fetch_url '/llms.txt' "$temp_dir/llms"
  grep -qi '^content-type:.*text/plain' "$temp_dir/llms.headers" || fail 'llms.txt Content-Type 不是 text/plain'
  grep -q 'Tomccc520/haouied' "$temp_dir/llms.body" || fail 'llms.txt 缺少当前开源主仓链接'
  pass 'llms.txt 机器可读入口正常'

  fetch_url '/' "$temp_dir/home"
  grep -qi '<link[^>]*rel="canonical"' "$temp_dir/home.body" || fail '首页缺少 canonical'
  grep -Eq 'href="/(website|article|category|tag|mcp)/' "$temp_dir/home.body" || fail '首页预渲染 HTML 缺少可抓取业务内链'
  pass '首页 canonical 与预渲染内链正常'

  status_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$ORIGIN/website/999999999")"
  [[ "$status_code" == '404' ]] || fail "未知详情页应返回 404，当前为 $status_code"
  pass '未知详情页真实 404 正常'

  echo '[OK] 生产 SEO 基础链路验证通过'
}

main "$@"
