#!/bin/bash

# 测试站点设置公开接口与后台配置接口是否正常工作
# 使用方法:
#   ./scripts/test_setting_api.sh
#   ADMIN_TOKEN=xxxx ./scripts/test_setting_api.sh

echo "🧪 测试站点设置 API"
echo "===================="
echo ""

# 后端 API 地址
API_URL="http://localhost:8002"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 公开接口请求函数
test_public_api() {
    local endpoint=$1
    local description=$2
    
    echo -n "测试: $description ... "
    
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ 成功${NC}"
        echo "  响应: $(echo $body | jq -r '.message // .code // "OK"' 2>/dev/null || echo $body | head -c 100)"
        return 0
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        echo "  响应: $body"
        return 1
    fi
}

# 后台接口请求函数
test_admin_api() {
    local endpoint=$1
    local description=$2

    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "测试: $description ... ${YELLOW}⚠ 跳过（未提供 ADMIN_TOKEN）${NC}"
        return 0
    fi

    echo -n "测试: $description ... "

    response=$(curl -s -w "\n%{http_code}" -H "token: $ADMIN_TOKEN" "$API_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ 成功${NC}"
        echo "  响应: $(echo "$body" | jq -r '.message // .code // "OK"' 2>/dev/null || echo "$body" | head -c 100)"
        return 0
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        echo "  响应: $body"
        return 1
    fi
}

# 检查后端是否运行
echo "1️⃣ 检查后端服务..."
if curl -s "$API_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务正在运行${NC}"
else
    echo -e "${RED}✗ 后端服务未运行${NC}"
    echo "请先启动后端服务: cd server/server && npm run dev"
    exit 1
fi
echo ""

# 测试公开设置 API
echo "2️⃣ 测试公开接口..."
test_public_api "/api/settings/public" "获取公开设置"
echo ""

# 测试站点信息 API
echo "3️⃣ 测试站点公开信息..."
test_public_api "/api/site-info" "获取站点信息"
test_public_api "/api/seo/public-config" "获取公开 SEO 配置"
echo ""

# 测试后台单个配置 API
echo "4️⃣ 测试后台配置接口..."
test_admin_api "/api/uied/setting/siteInfo" "后台获取站点信息"
test_admin_api "/api/uied/setting/get?key=appearanceConfig" "后台获取外观配置"
test_admin_api "/api/uied/setting/get?key=homepageConfig" "后台获取首页配置"
test_admin_api "/api/uied/setting/get?key=pageGlobalConfig" "后台获取页面配置"
echo ""

# 显示详细数据
echo "5️⃣ 查看公开设置详细数据..."
echo "===================="
curl -s "$API_URL/api/settings/public" | jq '{
  siteTitle: .data.siteInfo.siteTitle,
  fontFamily: .data.appearance.fontFamily,
  primaryColor: .data.appearance.primaryColor
}' 2>/dev/null || curl -s "$API_URL/api/settings/public"
echo ""
echo "===================="
echo ""

echo "✅ 测试完成！"
echo ""
echo "💡 提示:"
echo "  - 公开接口默认可直接验证前台配置链路"
echo "  - 后台接口需要传入 ADMIN_TOKEN，否则会被跳过"
echo "  - 如果公开接口正常但页面无变化，优先检查前端是否真正消费了对应配置"
echo ""
echo "📚 查看实施指南: docs/前端对接实施指南.md"
