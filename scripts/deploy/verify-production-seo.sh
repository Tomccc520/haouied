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

# 验证不存在的详情路由返回真实 404，并携带独立的错误页 SEO 信息。
check_missing_seo_page() {
  local path="$1"
  local label="$2"
  local output_prefix="$3"
  local status_code
  status_code="$(curl -sS --max-time 20 -D "${output_prefix}.headers" -o "${output_prefix}.body" -w '%{http_code}' "$ORIGIN$path")" \
    || fail "$label 请求失败"
  [[ "$status_code" == '404' ]] || fail "$label 应返回 404，当前为 $status_code"
  grep -q '<title>页面不存在 - UIED AI工具导航</title>' "${output_prefix}.body" \
    || fail "$label 缺少 404 标题"
  grep -Eq '<meta[^>]+name="robots"[^>]+content="noindex,nofollow"' "${output_prefix}.body" \
    || fail "$label 未设置 noindex,nofollow"
  if grep -qi 'rel="canonical"' "${output_prefix}.body"; then
    fail "$label 不应携带 canonical"
  fi
  grep -q '<h1[^>]*>页面不存在' "${output_prefix}.body" \
    || fail "$label 缺少 404 h1"
  pass "$label 真实 404 与 SEO 信息正常"
}

# 校验 AI 导航首页与 AI 学习平台详情使用同一批公开站点，避免数量不一致。
check_ai_category_count_consistency() {
  local full_file="$1"
  local category_file="$2"
  node - "$full_file" "$category_file" <<'NODE'
const fs = require('fs');

const fullPayload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))?.data || {};
const categoryPayload = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))?.data || {};
const aiCategory = (Array.isArray(fullPayload.categories) ? fullPayload.categories : [])
  .find((item) => String(item?.id || '') === '21' || String(item?.slug || '') === 'ai-xuexi');
const homeCount = Array.isArray(aiCategory?.websites) ? aiCategory.websites.length : -1;
const detailCount = Array.isArray(categoryPayload.websites) ? categoryPayload.websites.length : -1;

if (homeCount < 0 || detailCount < 0) {
  console.error('AI 学习平台接口缺少 websites 数组');
  process.exit(1);
}
if (homeCount !== detailCount) {
  console.error(`AI 学习平台数量不一致：首页 ${homeCount} 条，分类详情 ${detailCount} 条`);
  process.exit(1);
}
console.log(`AI 学习平台数量一致：${homeCount} 条`);
NODE
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

  check_missing_seo_page '/website/999999999' '网站详情错误页' "$temp_dir/website-missing"
  check_missing_seo_page '/article/not-found-qa' '文章详情错误页' "$temp_dir/article-missing"
  check_missing_seo_page '/category/not-found-qa' '分类详情错误页' "$temp_dir/category-missing"

  fetch_url '/api/pages/ai/full' "$temp_dir/ai-full"
  fetch_url '/api/categories/ai-xuexi' "$temp_dir/ai-learning-category"
  check_ai_category_count_consistency "$temp_dir/ai-full.body" "$temp_dir/ai-learning-category.body"
  pass 'AI 学习平台首页与分类详情数量正常'

  echo '[OK] 生产 SEO 基础链路验证通过'
}

main "$@"
