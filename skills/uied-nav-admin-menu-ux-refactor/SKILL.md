---
name: uied-nav-admin-menu-ux-refactor
description: UIED-NAV 后台菜单信息架构与交互重构技能。用于 server/admin（Vue3 + Element Plus）侧栏菜单改造，包括菜单分组顺序、工作台优先、搜索可用性、展开收起逻辑、激活态视觉统一与回归清单。当用户提出“后台菜单不好用/不统一/要重构交互/菜单顺序要调整”时使用。
---

# UIED 后台菜单交互重构技能

## 目标
- 统一后台菜单的视觉与交互，避免“同是菜单，不同页面行为不一致”。
- 固定“工作台”作为一级导航首位，降低高频入口路径成本。
- 保持改造可回滚、可验收，不一次性全量冒进。

## 先读文件（最小集合）
- `server/server/app/service/authAdmin.js`（菜单树生成与排序规则）
- `server/admin/src/layout/default/components/sidebar/side.vue`
- `server/admin/src/layout/default/components/sidebar/menu.vue`
- `server/admin/src/layout/default/components/sidebar/menu-item.vue`
- `server/admin/src/styles/var.css`
- `server/admin/src/styles/dark.css`
- `server/admin/src/styles/element.scss`
- `references/menu-ux-review-checklist.md`

## 执行流程

### 1) 审计现状（先查问题再动代码）
- 扫描菜单相关实现与样式覆盖：
  - `rg -n "menu|sidebar|workbench|工作台|active|collapse" server/admin/src/layout server/admin/src/styles`
- 输出问题清单（最少包含）：
  - 信息架构：分组是否混乱、工作台是否在首位。
  - 交互：搜索是否可用、搜索后是否易定位、折叠态是否可识别。
  - 视觉：hover/active/图标/层级缩进是否统一，浅色深色是否都可用。

### 2) 先改结构，再改视觉
- 结构优先级：
  - 后端菜单树排序（工作台置顶）先改，避免前端“样式看起来对但菜单顺序仍错”。
  - 前端菜单搜索/展开/折叠行为再改。
- 视觉优先级：
  - 先落全局变量（`var.css`/`dark.css`），再落组件样式，避免页面散落魔法数。
  - 禁止在页面里新增大量十六进制颜色硬编码。

### 3) 菜单交互改造基线
- 搜索：
  - 搜索输入始终可见（非折叠态），支持清空与空态提示。
  - 搜索命中后自动展开父级节点，减少二次点击。
- 层级：
  - 一级菜单与二级菜单在缩进、图标间距、行高上有规则。
- 激活态：
  - `active` 与 `hover` 在 light/dark 下都清晰，且颜色来源于变量。
- 折叠态：
  - 折叠后图标居中、可点击区域不缩小。

### 4) 回归验证（每次改造必须执行）
- 后端：
  - 登录后菜单接口返回中，“工作台”是否第一项。
- 前端：
  - 展开态、折叠态、移动抽屉态均可正常点击。
  - 搜索关键词命中/无结果/清空三条路径可用。
  - light/dark 主题激活态可识别。
- 质量门槛：
  - 运行 `npm run type-check`（目录：`server/admin`）。
  - 若改了后端 JS，至少执行 `node --check` 对应文件。

### 5) 提交输出模板
- 《问题清单》：问题 + 影响 + 优先级。
- 《改造说明》：具体改了哪些文件、为什么这样改。
- 《回归结果》：通过项/未验证项/风险项。

## 资源
- `references/menu-ux-review-checklist.md`：菜单重构验收清单（开发完成后逐项打勾）。
