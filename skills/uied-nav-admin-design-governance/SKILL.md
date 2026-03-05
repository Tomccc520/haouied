---
name: uied-nav-admin-design-governance
description: UIED-NAV 后台管理设计治理技能。用于统一 server/admin（Vue + Element Plus）的页面骨架、视觉令牌、组件交互和代码样式，解决“同类页面风格不一致、可维护性差”的问题。
---

# UIED 后台设计治理技能

## 触发场景
- 你感觉后台页面“看起来都能用，但不规范、不统一”。
- 同类页面（列表/表单/详情/配置）在间距、字号、按钮位置、筛选区结构上差异大。
- 新需求持续增加，样式变更成本越来越高。

## 适用范围
- 本技能只用于当前仓库 `server/admin`（Vue + Element Plus）。
- 目标是“统一后台管理设计”，不处理官网 Nuxt 前端。

## 核心治理目标
1. 统一页面骨架：标题区、筛选区、表格区、分页区、操作区位置一致。
2. 统一视觉令牌：颜色、字号、间距、圆角优先走 CSS 变量。
3. 统一组件规则：`el-table`、`el-form`、`el-tabs`、按钮组合行为一致。
4. 统一代码风格：减少内联样式，减少页面私有“魔法数”。

## 先读文件（最小集合）
- `server/admin/src/styles/var.css`
- `server/admin/src/styles/element.scss`
- `server/admin/src/styles/index.scss`
- `server/admin/src/views/uied/setting/index.vue`
- `references/design-baseline.md`
- `references/review-checklist.md`

## 标准执行流程
1. 做一次设计审计：
   - 扫描内联样式：`rg "style=\\\"" server/admin/src/views`
   - 扫描局部硬编码颜色：`rg "#[0-9a-fA-F]{3,6}" server/admin/src/views server/admin/src/components`
2. 建立“后台基线规范”（页面骨架 + 视觉令牌 + 组件用法）。
3. 按页面类型分批改造：
   - 先高频页：设置页、列表页、编辑页。
   - 后低频页：辅助管理页、监控页。
4. 每改 1 类页面就回归一次，避免全量重构风险。
5. 发布前按检查清单逐项验收。

## 强约束
- 新页面禁止优先写内联样式，先复用全局 token 和通用 class。
- 同一类页面必须复用同一骨架（工具栏、筛选、表格、分页）。
- 样式修改优先放在 `styles` 层，不要散落在每个 `vue` 文件里。
- 若涉及新增函数，必须函数级中文注释。
- 页面文件遵循版权头规范（项目要求的文件类型必须加）。

## 产出要求（每次使用本技能）
- 输出《问题清单》：不一致点 + 影响范围 + 优先级。
- 输出《统一方案》：改哪些 token、哪些组件规则、哪些页面先改。
- 输出《分批改造计划》：每批页面与验收标准。

## 参考资料
- 设计基线：`references/design-baseline.md`
- 评审清单：`references/review-checklist.md`

