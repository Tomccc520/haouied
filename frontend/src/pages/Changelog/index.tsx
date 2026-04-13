/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-26
 */
/**
 * @file Changelog/index.tsx
 * @description 更新记录页面 - 展示网站功能更新历史
 */

import React, { useState, useEffect } from 'react';
import SEO from '../../components/SEO';
import api from '../../services/api';
import { fetchGitHubChangelog, type ChangelogRelease } from '../../services/changelogService';
import { unwrapApiResponse } from '../../utils/apiResponse';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import './index.css';

// 图标组件
const GitHubIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const GiteeIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
  </svg>
);

const CSDNIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 1024 1024" fill="currentColor">
    <path d="M0 0h1024v1024H0z" fill="#FF6633" />
    <path d="M698.9824 42.3936c-158.8736-32.5632-289.536 31.2832-324.9152 48.5888-94.72 46.2848-147.712 108.288-174.4896 140.288-25.9584 31.0272-82.7392 105.9328-108.288 215.8592-21.6576 93.1328-10.752 167.7824-6.0416 194.2528 11.4688 64.3072 33.28 186.88 150.4256 275.2 132.5056 99.8912 293.4784 85.5552 342.9888 80.9472 107.264-10.0352 289.4848-57.2928 300.8512-145.7152 5.1712-39.936-24.4224-89.4464-66.2016-102.5024-65.6384-20.5312-108.3392 63.5392-228.6592 80.9472-8.5504 1.2288-126.5664 16.6912-216.6272-48.5888-105.8816-76.6976-98.9696-211.3024-96.256-264.3968 1.536-30.5664 5.5808-93.5424 48.128-161.8944 14.7968-23.7568 60.3136-94.5664 156.4672-134.912 25.2928-10.5984 76.8512-31.5904 144.4352-26.9824 70.0416 4.7616 120.9856 34.5088 144.4352 48.5888 75.8272 45.4144 86.528 90.0608 120.3712 86.3232 35.8912-3.9424 69.9904-59.2896 66.2016-107.9296-7.424-93.7984-155.5968-158.1056-252.8256-178.0736z" fill="#FFFFFF" />
  </svg>
);

const UIEDIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 500 500" fill="currentColor">
    <g stroke="none" strokeWidth="1" fillRule="evenodd">
      <path d="M50,0 L450,0 C477.614237,-5.07265313e-15 500,22.3857625 500,50 L500,450 C500,477.614237 477.614237,500 450,500 L50,500 C22.3857625,500 1.69088438e-15,477.614237 0,450 L0,50 C-3.38176876e-15,22.3857625 22.3857625,3.38176876e-15 50,0 Z M212.021661,187 L196.281588,299.620652 C195.703971,303.602926 193.947052,306.881017 191.01083,309.454926 C188.074609,312.028835 184.632972,313.315789 180.685921,313.315789 L167.400722,313.315789 L183.429603,198.655436 C183.910951,195.255934 185.427196,192.463486 187.978339,190.278091 C190.529483,188.092697 193.489771,187 196.859206,187 L212.021661,187 Z M87.1119134,187 L77.1480144,257.515389 C76.8592058,259.846476 76.7148014,262.03187 76.7148014,264.071572 C76.7148014,272.618892 79.3140794,279.077946 84.5126354,283.448734 C89.6149218,287.819523 96.3056558,290.004917 104.584838,290.004917 C113.056558,290.004917 120.036101,287.67383 125.523466,283.011655 C131.01083,278.252352 134.33213,271.356219 135.487365,262.323256 L144.151625,200.695137 C144.729242,196.712863 146.486161,193.434772 149.422383,190.860863 C152.358604,188.286954 155.752106,187 159.602888,187 L172.166065,187 L161.33574,264.508651 C156.907341,296.852486 137.990373,313.024404 104.584838,313.024404 C87.0637786,313.024404 73.5860409,309.04213 64.1516245,301.077581 C54.7172082,293.015905 50,281.894676 50,267.713895 C50,264.508651 50.2406739,261.206277 50.7220217,257.806775 L58.9530686,200.549445 C59.6269555,196.567171 61.4079422,193.313361 64.2960289,190.788017 C67.1841155,188.262672 70.5535499,187 74.4043321,187 L87.1119134,187 Z M326.534296,187 L325.234657,196.178656 C324.849579,198.704 323.742479,200.767984 321.913357,202.370606 C320.084236,203.973229 317.966306,204.77454 315.559567,204.77454 L258.519856,204.77454 L254.043321,237.409761 L312.238267,237.409761 L309.350181,258.098161 L251.155235,258.098161 L245.812274,292.773083 L311.805054,292.773083 L311.083032,299.912038 C310.505415,303.797183 308.820698,307.002428 306.028881,309.527773 C303.237064,312.053117 299.963899,313.315789 296.209386,313.315789 L216.209386,313.315789 L231.516245,204.337461 C232.286402,199.286772 234.524669,195.134523 238.231047,191.880714 C241.937425,188.626905 246.293622,187 251.299639,187 L326.534296,187 Z M385.451264,187.145693 C406.341757,187.145693 422.322503,192.827718 433.393502,204.191768 C444.464501,215.652947 450,230.4165 450,248.482426 C450,267.033995 444.320096,282.477448 432.960289,294.812785 C421.696751,307.050993 407.689531,313.170097 390.938628,313.170097 L326.534296,313.170097 L341.98556,200.986523 L342.06209,200.552325 C342.789822,196.670463 344.569366,193.48854 347.400722,191.006556 C350.336943,188.432647 353.77858,187.145693 357.725632,187.145693 Z M380.397112,208.271171 L367.545126,208.271171 L355.99278,292.190311 L380.974729,292.190311 C393.971119,292.190311 404.127557,288.062344 411.444043,279.80641 C418.856799,271.550477 422.563177,261.01202 422.563177,248.19104 C422.563177,236.341346 418.760529,226.725612 411.155235,219.343835 C403.54994,211.962059 393.297232,208.271171 380.397112,208.271171 Z" />
    </g>
  </svg>
);

const ArrowIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

const repoIconMap = {
  github: GitHubIcon,
  gitee: GiteeIcon,
  csdn: CSDNIcon,
  uied: UIEDIcon,
} as const;

// 更新记录数据
const localChangelogData: ChangelogRelease[] = [
  {
    version: '1.1.1',
    date: '2026-04-14',
    title: '正式版1.1.1：售卖版交付增强、账号体系补齐与投稿服务重构',
    changes: [
      { type: 'feature', scope: 'fullstack', text: '【第三方登录】新增 QQ 互联网页登录能力：后端 social provider 新增 `qqWeb`，支持 state 签发、授权回调、openid 拉取、账号自动创建与登录态签发，前端登录弹窗支持一键发起 QQ 登录' },
      { type: 'feature', scope: 'backend', text: '【认证配置】站点认证配置新增 `qqLogin`（启用、AppID、AppKey、固定回调路径），后台“用户认证”页新增 QQ 配置项并提供回调地址预览，公开配置接口同步返回脱敏字段供前端读取' },
      { type: 'improve', scope: 'frontend', text: '【账号安全】个人中心“第三方账号”升级为微信+QQ双卡片：支持查看绑定状态、脱敏标识、绑定时间，并可分别执行绑定/解绑操作；社交回调页提示文案改为按平台动态展示' },
      { type: 'fix', scope: 'backend', text: '【授权回调白名单】新增 `/api/auth/qq/callback` 免登录放行与路由注册，避免 QQ 授权回调被后台 token 中间件拦截' },
      { type: 'feature', scope: 'fullstack', text: '【个人中心投放闭环】新增“我的投放”页签：可查看投稿审核状态、支付状态、投放方向与 Banner 位信息，支持待支付订单“继续支付 + 刷新支付状态”闭环操作' },
      { type: 'improve', scope: 'backend', text: '【订单支付回流】用户中心订单列表/详情补充 `payUrl` 字段透传，待支付订单可直接拉起支付页，避免“支付中断后无法在个人中心继续支付”' },
      { type: 'improve', scope: 'frontend', text: '【个人中心闭环增强】“我的投放”新增快捷工具栏：支持一键刷新投放状态、跳转提交页、跳转订单页与官网客服入口，提升运营投放闭环效率' },
      { type: 'improve', scope: 'frontend', text: '【订单闭环增强】“我的订单”新增手动刷新状态入口，并在列表/详情补充支付渠道展示（支付宝/微信/余额），降低用户支付后核对成本' },
      { type: 'improve', scope: 'frontend', text: '【提交页闭环】提交成功卡片新增“查看我的投放/查看我的订单”快捷入口，用户可从提交结果页直接回流个人中心持续跟进审核与支付进度' },
      { type: 'feature', scope: 'backend', text: '【投稿服务配置】后台“站点设置 -> 投稿服务”补齐正式售卖版配置：新增投稿页开关、Hero 高亮、关闭态文案与跳转、服务流程、提交须知，以及基础收录/置顶推荐/Banner 位价格统一配置' },
      { type: 'feature', scope: 'fullstack', text: '【投稿模式】基础收录新增“网站收录 / 付费收录”后台模式切换：网站收录模式下基础服务直接提交，付费模式下才创建支付订单；前后端统一按同一套配置判断，避免切模式后仍残留旧支付逻辑' },
      { type: 'feature', scope: 'fullstack', text: '【投稿页重构】前台 `/submit` 重构为正式售卖版页面：头图信息区、价格摘要、服务流程、提交须知、关闭态与支付状态全部接入后台公开配置，基础价格同时驱动页面展示与实际下单金额' },
      { type: 'improve', scope: 'frontend', text: '【投稿页拆分】前台投稿链路拆分为 `/submit`「网站收录」与 `/submit/services`「收录与增值服务」两条入口：基础收录回归轻量表单，商业曝光、置顶推荐与 Banner 投放独立沉淀到增值服务页' },
      { type: 'improve', scope: 'frontend', text: '【网站收录页】继续压缩 `/submit` 页面信息层级：顶部去掉双标签与右侧统计面板，只保留主标题、简短说明、表单与精简收录说明，减少活动页感，更贴近正式交付表单页' },
      { type: 'feature', scope: 'fullstack', text: '【热门推荐投放时间】后台“热门推荐管理”新增开始/结束时间配置，列表可直接查看当前投放状态（投放中/未开始/已结束/已隐藏），前台仅展示当前时间窗口内生效的推荐内容，方便按广告周期运营' },
      { type: 'feature', scope: 'fullstack', text: '【头部品牌区】后台“站点信息”新增头部 Logo 展示模式与品牌文案配置：支持“图标 + 文案 / 仅文案 / 仅图标”三种模式，前台 Navbar 同步按配置渲染' },
      { type: 'improve', scope: 'backend', text: '【配置迁移】系统设置 `/setting/system/setting-backup` 文案与菜单统一改名为“配置导入导出”，明确该页面只处理配置快照，不再误导为数据库/文件/源码的全量备份恢复入口' },
      { type: 'feature', scope: 'backend', text: '【后台引导】侧边栏为当前版本重点功能增加 `NEW` 标签，工作台首页新增“本版更新”模块，并补充“后台更新记录”页：可按分组查看本版新增能力并一键跳转到授权中心、升级中心、站点设置、投稿配置、AI 配置等入口' },
      { type: 'improve', scope: 'backend', text: '【后台新功能定位】`NEW` 标签改为“一级菜单 + 具体功能入口”双层提示，并支持在多 Tab 页面精确标记到具体配置项，避免只知道有新功能却找不到位置' },
      { type: 'improve', scope: 'backend', text: '【网址图标编辑】网站编辑页图标区域升级为“图标 URL + 素材中心选择 + 自动获取图标”三合一，并增加统一小预览，和缩略图交互保持一致' },
      { type: 'fix', scope: 'backend', text: '【商业授权守卫】后台商业激活拦截范围扩展到 `system/setting/common/monitor/gen/user/article/channel/decorate/uied` 等核心接口，未激活实例仅保留登录态基础信息与授权中心必要能力，真正收口“未激活前后台不可用”链路' },
      { type: 'fix', scope: 'backend', text: '【升级与导入原子性】配置导入导出改为单事务执行，升级中心发起任务增加数据库命名锁，修复“导入半成功”和“重复升级任务并发创建”两类上线风险' },
      { type: 'fix', scope: 'frontend', text: '【资源链路清理】统一图片 URL 归一化逻辑，兼容历史 `localhost/127.0.0.1` 上传资源地址；页脚背景与文章默认封面改为站内内置样式/占位图，不再依赖外部 `img.uied.cn` 资源' },
      { type: 'feature', scope: 'backend', text: '【文章管理】批量导入弹窗新增“处理方式”下拉切换：支持在“公众号链接导入”与“批量AI生成文章”之间直接切换，沿用现有栏目、作者、状态、标签与专题配置，降低后台运营批量产文门槛' },
      { type: 'feature', scope: 'fullstack', text: '【AI文章生成】新增 `POST /api/article/import/ai/batch` 接口：支持每行一个文章选题逐篇调用默认 AI 模型生成标题、导语、摘要与 HTML 正文，并直接入库返回新增/失败统计与逐条结果明细' },
      { type: 'improve', scope: 'backend', text: '【AI文章生成】批量生成模式补充“高级AI配置（可选）”折叠区：支持临时覆盖模型与提示词模板，留空时自动回退到「AI 助手管理 -> 导入配置」默认值，兼顾运营灵活性与日常简洁操作' },
      { type: 'improve', scope: 'backend', text: '【AI文章生成】批量生成模式新增“提示词预设”下拉：直接复用「AI 助手管理」里维护的文章导入模板库，一键带入模型与提示词，不再额外维护本地硬编码模板' },
      { type: 'improve', scope: 'backend', text: '【AI文章生成】批量生成结果表新增“模板/模型”列：接口逐条返回本次实际使用的模板名与模型名，方便运营回看这批文章是按哪套提示词与模型生成的' },
      { type: 'improve', scope: 'frontend', text: '【安装向导】重构 /install 为“授权校验 -> 数据库测试 -> 初始化安装”三步工作台，步骤切换不再跳转锚点，视觉重心统一回归安装流程，适配正式售卖版首次部署体验' },
      { type: 'fix', scope: 'frontend', text: '【外观配置字体】修复后台“外观配置 -> 主字体”保存后前台无变化的问题：前台根路由补齐公开外观配置全局应用，主字体、主题色等变量会在进入站点时同步写入 :root，全站标题/导航/正文统一跟随后台设置生效' },
      { type: 'fix', scope: 'frontend', text: '【左侧菜单跟随】动态频道页侧栏恢复桌面端吸顶跟随（CSS sticky），滚动时保持可见且不再脱离主内容区' },
      { type: 'fix', scope: 'frontend', text: '【锚点联动】分类高亮跟随逻辑统一基于 window 滚动容器计算，修复部分页面滚动时左侧菜单不跟随右侧分类锚点的问题' },
      { type: 'fix', scope: 'frontend', text: '【左侧菜单边界】侧栏可视高度改为按顶部导航自动计算，菜单列表改为“仅 sticky 态内部滚动”，修复长分类下底部超出与滚动冲突问题' },
      { type: 'fix', scope: 'frontend', text: '【点击分类不丢菜单】侧栏吸顶禁用断点从 1024px 调整到 768px，电脑/平板点击左侧分类后侧栏持续可见，不再随页面滚动后“整块消失”' },
      { type: 'fix', scope: 'frontend', text: '【顶部对齐】桌面端左侧菜单改为固定在头部导航下方（header 下沿 + 8px），右侧内容滚动时菜单始终可见，避免“点击分类后菜单脱离视口”' },
      { type: 'fix', scope: 'frontend', text: '【不覆盖Hero】左侧菜单固定模式改为“进入主内容区后再激活”，Hero 区域内保持正常文档流展示，避免侧栏超出并压住 Hero 视觉区' },
      { type: 'improve', scope: 'frontend', text: '【响应式布局】1024px 以下主布局改为“侧栏在上、内容在下”，避免中小屏出现菜单挤压内容或遮挡卡片' },
      { type: 'improve', scope: 'frontend', text: '【网址卡片交互】新增“鼠标移入简介浮窗”：悬停时以浮窗形式展示网址介绍文案，移动端自动隐藏悬停层，不影响现有卡片内容布局' },
      { type: 'improve', scope: 'backend', text: '【授权中心文案】激活页新增官方说明区块：统一替换为 fsuied.com 品牌信息，补充客服QQ（403479454）、官方QQ群（1082794860）、购买与授权入口说明' },
      { type: 'improve', scope: 'frontend', text: '【后台运营】继续沿用 1.1.0 的短链重定向能力，便于在 SEO 中心按 /codeflying 这类入口持续运营推广链接' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-30',
    title: '正式版1.1.0：前台侧栏小屏适配与滚动行为修正',
    changes: [
      { type: 'feature', scope: 'fullstack', text: '【运营短链】新增公开解析接口 `GET /api/seo/redirect/resolve`，前台 404 页支持命中后台“短链重定向（运营）”规则后自动跳转，适配静态部署场景下的推广短链投放' },
      { type: 'improve', scope: 'frontend', text: '【SEO中心】后台“重定向规则”标签升级为“短链重定向（运营）”，并补充 `/codeflying -> 外部推广链接` 的可视化示例，降低运营配置门槛' },
      { type: 'fix', scope: 'frontend', text: '【前台导航侧栏】修复小屏与平板下左侧菜单被遮挡问题：主布局在 1024px 以下改为“侧栏上置 + 内容下置”，分类菜单始终可见可点' },
      { type: 'fix', scope: 'frontend', text: '【前台导航侧栏】取消动态频道页 / 热门文章页 / 榜单页 / 每日上新页侧栏吸顶固定，统一改为跟随主内容滚动，修复长页面滚到底部时侧栏超出视区/压到页脚的问题' },
      { type: 'fix', scope: 'frontend', text: '【前台导航侧栏】修复分类锚点联动：点击侧栏按顶部偏移精准滚动到对应分类，页面滚动时侧栏高亮随当前锚点自动切换，并同步地址栏 hash' },
      { type: 'fix', scope: 'frontend', text: '【首页最新网站更新】统一首页与频道页的数据口径，改为同一全站“近7日最新上新”数据源，修复正式环境出现的“首页与其它页面不同步”问题' },
      { type: 'improve', scope: 'frontend', text: '【前台导航侧栏】移动端（<=750px）保留分类导航容器，不再默认整块隐藏，确保客户站点在手机端仍可快速切换分类' },
    ],
  },
  {
    version: '1.0.9',
    date: '2026-03-20',
    title: '正式版1.0.9：MCP中心导航归位 + 官网MCP页重构',
    changes: [
      { type: 'fix', scope: 'backend', text: '【置顶banner广告】修复“四卡位批量编辑误删其它页面配置”问题：保存逻辑改为按“位置 + 页面范围”精准覆盖，仅替换当前目标范围，不再全量删除 page_banner 记录' },
      { type: 'improve', scope: 'backend', text: '【置顶banner广告】四卡批量编辑支持“同范围替换、跨范围新增”策略：编辑同一页面范围时覆盖原组，切换到新页面范围时保留旧组并新增新组，实现多页面广告组件共存' },
      { type: 'improve', scope: 'frontend', text: '【Figma/MCP官网】重构 Hero 间距体系：PC 与移动端统一最小节奏为 1rem，减少两端视觉偏差，保持页面头部阅读节奏一致' },
      { type: 'improve', scope: 'frontend', text: '【Figma/MCP官网】新增统一间距变量 `--feature-page-top-padding` 与 `--feature-hero-top-gap`，两页顶部留白与 Hero 顶部间距可一处配置同步生效' },
      { type: 'feature', scope: 'fullstack', text: '【Figma推荐】新增前台“推荐插件”入口：/figma 页支持用户提交插件名称、官方链接、分类与说明，提交后进入后台审核队列' },
      { type: 'feature', scope: 'backend', text: '【Figma推荐】新增推荐审核能力：后端新增推荐记录入库、审核通过入库插件、审核拒绝与删除接口（/api/uied/figma/recommend/*）' },
      { type: 'feature', scope: 'backend', text: '【数据库补丁】新增 SQL `patch_2026_0322_figma_recommend_review.sql`：创建推荐审核表并安装“Figma中心 -> 推荐审核”菜单与权限' },
      { type: 'improve', scope: 'frontend', text: '【Figma后台】插件列表页新增“推荐审核”快捷入口，运营可一键跳转审核页进行通过/拒绝操作' },
      { type: 'improve', scope: 'fullstack', text: '【Figma数据质检】补充 2000 条插件质量审计报告（图标缺失/重复URL/重复PluginID），用于后续分批去重与补图治理' },
      { type: 'feature', scope: 'fullstack', text: '【热门搜索】页面管理新增热词模式配置：`custom_only` / `dynamic_only` / `custom_then_dynamic`，支持固定词与动态词组合策略' },
      { type: 'feature', scope: 'backend', text: '【热门搜索】新增动态热词策略参数：固定词数量、动态补齐数量、统计窗口天数、最低热度阈值，支持后台可视化配置与接口返回' },
      { type: 'improve', scope: 'backend', text: '【热门搜索】动态热词改为“最近N天点击统计 + 5分钟缓存”模式，基于 `uied_website_click_daily` 聚合，降低榜单抖动与重复计算成本' },
      { type: 'feature', scope: 'backend', text: '【数据库补丁】新增 SQL `patch_2026_0322_hot_search_mode_and_click_daily.sql`：补齐页面热词配置字段并创建网站日点击统计表' },
      { type: 'fix', scope: 'backend', text: '【置顶banner广告】修复“四卡广告编辑后误新增一组”的问题：page_banner 列表聚合改为按组识别，编辑保存优先更新原组记录' },
      { type: 'improve', scope: 'backend', text: '【置顶banner广告】新增广告列表 `raw=1` 原始记录读取能力，四卡批量编辑器改为读取原子记录，避免聚合态反写导致数据错位' },
      { type: 'fix', scope: 'backend', text: '【置顶banner广告】组删除逻辑增强：支持按 `old_id` 整组删除，并兼容历史无组ID数据按页面+类型回收，减少脏数据残留' },
      { type: 'improve', scope: 'frontend', text: '【热门搜索】前台 Hero 热词渲染接入模式字段：自定义模式仅显示固定词，动态模式按配置自动补齐，行为与后台策略保持一致' },
      { type: 'fix', scope: 'backend', text: '【点击统计】补齐前台点击服务兼容方法 `ctx.service.uied.website.click`，统一转发到 `incrementClick`，修复公开接口 `/api/websites/:id/click` 在部分环境下漏计问题' },
      { type: 'improve', scope: 'frontend', text: '【点击统计】网站点击上报升级为 `sendBeacon + fetch keepalive + axios` 三层兜底策略，降低跳转外链时请求被取消导致的点击丢失' },
      { type: 'improve', scope: 'frontend', text: '【点击统计】分类页/标签页/搜索页/网址详情页统一改为 `recordWebsiteClick` 公共上报方法，前端点击埋点链路一致化' },
      { type: 'improve', scope: 'frontend', text: '【404页面】重构 404 页面视觉：统一站点主色与卡片层级，优化回首页/返回上页操作区与常用入口布局，移动端断点同步适配' },
      { type: 'feature', scope: 'fullstack', text: '【Figma独立页】新增前端独立路由 `/figma`，固定绑定后台自定义页面 slug=`figma`，不再依赖“页面管理一键创建”入口' },
      { type: 'improve', scope: 'backend', text: '【页面管理】新增“页面分组（导航页面/自定义页面）”筛选与列表标签；编辑弹窗可直接设置页面分组，系统页统一按自定义页管理' },
      { type: 'fix', scope: 'backend', text: '【页面管理】撤回“一键创建Figma插件页”入口，避免与独立 Figma 页面能力冲突，页面创建逻辑回归统一配置流程' },
      { type: 'feature', scope: 'backend', text: '【数据库补丁】新增 SQL `patch_2026_0321_page_group_and_figma.sql`：规范页面分组 type 字段，并可一键初始化 figma 自定义页默认配置' },
      { type: 'feature', scope: 'fullstack', text: '【页面Banner】新增独立广告位置 `page_banner`：前端动态页面在“热门推荐”上方支持固定展示 4 个 Banner，后台广告管理可直接按新位置投放' },
      { type: 'feature', scope: 'frontend', text: '【页面Banner】AdBanner 组件新增 `page_banner` 渲染分支：采用 4 卡网格布局（移动端自动降为 2 列/1 列），替代原顶部单图轮播用于频道页运营位' },
      { type: 'improve', scope: 'backend', text: '【页面Banner】后台广告管理“位置”枚举新增“页面Banner（page_banner）”，并在位置说明卡片补充用途提示，降低运营同学配置成本' },
      { type: 'improve', scope: 'backend', text: '【置顶banner广告】后台命名统一：将“页面广告/页面Banner”统一为“置顶banner广告”，并同步页面管理开关文案，降低客户配置歧义' },
      { type: 'feature', scope: 'backend', text: '【置顶banner广告】广告管理新增“四卡位批量编辑器”：可一键配置 4 张卡片标题/简介/跳转，渐变文案模式支持四卡内容集中维护，保存时自动同步增改删' },
      { type: 'improve', scope: 'backend', text: '【置顶banner广告】四卡位编辑器支持“图片卡片/渐变文案”一键切换，单卡可配置启用状态、排序值、打开方式与页面链接/自定义链接' },
      { type: 'fix', scope: 'backend', text: '【置顶banner广告】四卡保存逻辑优化：自动清理空卡与冗余旧记录，避免运营重复编辑后出现“前台数量不一致”问题' },
      { type: 'improve', scope: 'backend', text: '【置顶banner广告】广告管理筛选场景与位置枚举同步调整为统一命名（置顶banner广告），减少客户理解成本' },
      { type: 'feature', scope: 'fullstack', text: '【Figma插件页】专题页工厂新增内置模板 `figma-plugins-directory`，后台支持一键创建“Figma 插件收录页”（默认路径 /p/figma-plugins）用于插件内容运营' },
      { type: 'feature', scope: 'backend', text: '【页面管理】新增“一键创建Figma插件页”入口，支持从页面管理直接创建 Figma 插件收录频道，减少手工配置步骤' },
      { type: 'improve', scope: 'backend', text: '【专题页工厂】内置模板白名单补充 figma-plugins-directory，保障模板包导入/导出与内置模板识别一致' },
      { type: 'improve', scope: 'frontend', text: '【后台导航】侧边栏分组规则调整：MCP相关入口统一归并到“网站设置”业务域，避免一级菜单堆叠与入口分散' },
      { type: 'feature', scope: 'backend', text: '【菜单补丁】新增 SQL `patch_2026_0320_mcp_setting_menu.sql`：在“网站设置 -> 基础配置”下新增“MCP配置”二级入口，并默认切到内容中心 `tab=mcp`' },
      { type: 'improve', scope: 'frontend', text: '【MCP官网】/mcp 页面结构重构为“顶部筛选工具栏 + 结果网格卡片”，筛选与结果阅读路径更接近导航站主站交互' },
      { type: 'improve', scope: 'frontend', text: '【MCP官网】支持整卡点击进入详情页，并保留外链点击防穿透，降低误触导致的跳转混乱' },
      { type: 'improve', scope: 'frontend', text: '【MCP官网】卡片图标链路优化：优先使用后台配置 icon_url，缺失时回退站点 favicon，提高卡片识别度与数据容错' },
      { type: 'improve', scope: 'frontend', text: '【MCP官网】页面视觉变量继续保持后台可配置（主题色、背景色、头图、卡片圆角/边框/阴影开关），方便售卖版按客户风格快速交付' },
      { type: 'improve', scope: 'frontend', text: '【MCP官网】卡片悬浮反馈改为“仅描边高亮”，去除额外悬浮装饰，保证视觉与主站卡片交互风格一致' },
      { type: 'improve', scope: 'frontend', text: '【MCP官网】页面外边距与顶部留白按详情页规范统一，列表容器宽度与站点主容器对齐，并支持后台配置最大宽度' },
      { type: 'feature', scope: 'frontend', text: '【MCP详情】新增“使用教程 + SEO摘要”模块，并补充 FAQPage 结构化数据输出，提升内容可读性与搜索引擎可理解度' },
    ]
  },
  {
    version: '1.0.8',
    date: '2026-03-18',
    title: '正式版1.0.8：SEO中心（配置化 + 检测 + 推送）首版上线',
    changes: [
      { type: 'feature', scope: 'backend', text: '【SEO中心】新增后端服务 `seoCenter`：支持 TDK 模板、图片优化、链接改写、404监测、失效URL检测、基础/进阶 Sitemap、Robots 规则、站长验证、重定向、内部链接建议与进阶链接检测' },
      { type: 'feature', scope: 'backend', text: '【SEO公开文件】新增可直接访问的 `GET /robots.txt`、`GET /sitemap.xml`、`GET /sitemap-advanced.xml`、`GET /sitemap-advanced/:fileName`，并同步加入免登录白名单' },
      { type: 'feature', scope: 'backend', text: '【站长推送】新增百度/Bing/IndexNow 推送能力：支持按平台推送 URL 列表并记录推送日志（成功条数、样例 URL、响应结果）' },
      { type: 'feature', scope: 'backend', text: '【监测链路】新增 `seo_rewrite` 中间件：支持链接改写重定向规则与 404 日志自动记录，便于后续做异常页面追踪' },
      { type: 'feature', scope: 'frontend', text: '【后台管理】新增“SEO中心”页面（基础配置/重定向规则/检测与日志/站长推送四标签），支持在线预览 robots 与 sitemap，执行扫描与清空日志' },
      { type: 'feature', scope: 'backend', text: '【后台接口】新增 `/api/uied/setting/get|save/seoCenter/*` 统一接口组，复用站点设置权限体系（`uied:setting:get/save`）降低角色改造成本' },
      { type: 'feature', scope: 'backend', text: '【菜单补丁】新增 SQL 补丁 `patch_2026_0318_seo_center_menu.sql`：在“网站设置 -> 基础配置”下新增“SEO中心”菜单并自动补齐管理员角色授权' },
      { type: 'feature', scope: 'fullstack', text: '【文章管理】新增“文章绑定网址”能力：后台编辑文章可搜索并多选关联网址，详情接口返回 `relatedWebsites`，前端可直接渲染关联站点卡片' },
      { type: 'feature', scope: 'frontend', text: '【文章详情】重构为“左侧交互栏 + 顶部标签页”布局：支持产品介绍/产品信息/关联网址/常见问题四区切换，阅读与运营信息分层更清晰' },
    ]
  },
  {
    version: '1.0.7',
    date: '2026-03-17',
    title: '正式版1.0.7：批量导入文章/网址支持 AI 模型与提示词配置',
    changes: [
      { type: 'feature', scope: 'frontend', text: '【文章管理】文章列表新增“批量导入文章”弹窗：支持批量导入公众号链接、选择栏目与作者、设置草稿/发布状态，并展示逐条导入结果明细' },
      { type: 'feature', scope: 'fullstack', text: '【文章导入】新增 /api/article/import/wechat/batch 批量接口：支持每行一个公众号链接入库，返回新增/失败统计与逐条失败原因' },
      { type: 'feature', scope: 'fullstack', text: '【文章导入】批量导入支持 AI 润色正文的“模型覆盖 + 提示词覆盖”，默认模板可直接使用，支持占位变量 {title}/{intro}/{content}/{author}/{sourceUrl}' },
      { type: 'feature', scope: 'frontend', text: '【网址管理】批量导入网址弹窗新增 AI 模型与 AI 提示词配置：当开启“导入后自动生成详情正文”时可按任务覆盖默认模型与生成提示词' },
      { type: 'feature', scope: 'backend', text: '【网址导入】批量导入调用 AI 详情生成时新增 modelOverride/promptTemplateOverride 参数透传，后端详情生成器支持占位变量模板渲染' },
      { type: 'improve', scope: 'frontend', text: '【导入反馈】文章与网址批量导入统一提供“导入完成”成功提醒，含新增/失败统计，降低“是否成功保存”的不确定感' },
      { type: 'improve', scope: 'frontend', text: '【搜索页】重构搜索输入交互：Hero 搜索框改为受控输入，新增提交/聚焦/失焦回调，搜索历史与搜索建议下拉统一贴合搜索框展示，避免“输入区与下拉区割裂”' },
      { type: 'improve', scope: 'frontend', text: '【搜索页】优化搜索逻辑：来源筛选同步 URL 参数（source），刷新后可保持筛选状态；仅切换来源时不重复触发后端搜索请求，降低无效请求' },
      { type: 'improve', scope: 'frontend', text: '【搜索页】新增“来源分布快捷筛选”标签组，并重构搜索头部视觉层级（弱化玻璃态、提升信息可读性）' },
      { type: 'feature', scope: 'fullstack', text: '【交付文档】新增《1.0.7客户安装部署指引》：提供宝塔原生/容器两种部署路径、Nginx 反代模板、上线自检命令与常见故障速查，降低客户安装门槛' },
    ]
  },
  {
    version: '1.0.6',
    date: '2026-03-10',
    title: '正式版1.0.6：首页新增“最新网站更新”滚动模块',
    changes: [
      { type: 'feature', scope: 'frontend', text: '【首页交互】在 Hero 下方、热门推荐上方新增“最新网站更新”模块，展示最近收录/更新的网站动态，支持横向连续滚动与悬停暂停' },
      { type: 'feature', scope: 'frontend', text: '【首页交互】最新网站更新模块新增“查看更多”入口，支持跳转至 /p/hot?tab=daily-new，并兼容后台“新窗口打开”配置' },
      { type: 'improve', scope: 'frontend', text: '【首页交互】最新网站条目新增明确时间显示（今天显示 HH:mm，历史显示 MM-DD HH:mm），提升时效感知' },
      { type: 'improve', scope: 'frontend', text: '【点击体验】最新更新卡片复用现有详情/直达跳转链路，保持与分类卡片一致的点击行为与埋点逻辑' },
      { type: 'improve', scope: 'frontend', text: '【每日上新】/p/hot?tab=daily-new 底部分页按钮文案由“加载更多”调整为“查看更多”，与站内交互口径统一' },
      { type: 'improve', scope: 'frontend', text: '【移动端适配】更新条在移动端自动切换为可横向滑动模式，避免动画滚动导致可读性下降' },
    ]
  },
  {
    version: '1.0.5',
    date: '2026-03-09',
    title: '正式版1.0.5：素材中心地址修复 + 分类SEO批量生成',
    changes: [
      { type: 'fix', scope: 'backend', text: '【素材中心】修复上传图片URL在正式环境返回 127.0.0.1 的问题：资源地址改为环境变量优先（UIED_PUBLIC_URL），并兼容历史本地绝对地址自动规范化' },
      { type: 'fix', scope: 'backend', text: '【素材中心】兼容容器 `egg-bin dev --env=prod` 启动但未注入 EGG_SERVER_ENV 的场景：生产态判断新增启动参数兜底，避免误判为本地开发导致返回 localhost 资源地址' },
      { type: 'fix', scope: 'fullstack', text: '【素材中心】修复本地开发素材预览异常：开发环境保留绝对资源地址，生产环境回退相对地址，避免后台素材中心图片加载失败' },
      { type: 'improve', scope: 'frontend', text: '【站点SEO】统一默认兜底文案为“UIED AI工具导航”版本，接口异常回退时不再显示旧版设计导航文案' },
      { type: 'feature', scope: 'frontend', text: '【分类管理】新增“批量生成SEO”脚本按钮：默认仅处理SEO字段为空的分类，逐条调用AI生成并自动保存，完成后展示成功/失败统计' },
      { type: 'improve', scope: 'frontend', text: '【分类管理】批量SEO改为“可配置分批执行”：支持起始条目、最多处理条数、每批条数与批间隔，降低一次性跑全量导致卡顿风险' },
      { type: 'fix', scope: 'frontend', text: '【网站管理】后台点击“网站URL/前端路径/查看按钮”时补齐点击上报（/api/uied/website/click），并在列表/详情抽屉实时回写点击量，避免“点击后浏览量不变”错觉' },
    ]
  },
  {
    version: '1.0.4',
    date: '2026-03-09',
    title: '正式版1.0.4：SEO 预渲染上线 + 专题页生成器增强',
    changes: [
      { type: 'feature', scope: 'backend', text: '【SEO】新增公开接口 /api/seo/prerender-manifest：统一输出站点信息、频道页、分类页、标签页、文章页与网址详情页的预渲染 SEO 路由清单（支持网站详情开关与数量上限）' },
      { type: 'feature', scope: 'frontend', text: '【SEO】新增构建后预渲染脚本 frontend/scripts/prerender-seo.js，支持批量生成路由静态 HTML 首屏 meta + canonical，并同步生成 sitemap.xml' },
      { type: 'improve', scope: 'frontend', text: '【SEO】新增 npm 脚本 build:seo / seo:prerender，部署时可直接产出“搜索引擎可读首屏源码”版本，降低仅靠运行时 JS 注入导致的抓取延迟' },
      { type: 'fix', scope: 'frontend', text: '【SEO】修复 SEO 组件默认 canonical 错误指向首页的问题：未传 url 时自动使用当前页面路径，支持相对路径自动转绝对 URL' },
      { type: 'fix', scope: 'frontend', text: '【SEO】修复 Twitter 元信息写入方式：改为 name 属性（twitter:title/description/url），提升主流抓取器识别稳定性' },
      { type: 'fix', scope: 'frontend', text: '【SEO】修复动态频道页 canonical/og:url 生成错误：改为基于当前路由 pathname，避免 /p/slug 与固定频道页路径混淆' },
      { type: 'improve', scope: 'backend', text: '【SEO】预渲染清单新增历史别名路由规范化：/hot、/categories、/tags、/p/category、/p/tag、/daily-hot 等别名统一输出 canonicalPath + noindex，减少重复收录与权重分散' },
      { type: 'improve', scope: 'frontend', text: '【SEO】构建流程升级：npm run build 默认接入 prerender-seo 产物，新增 build:plain 用于仅打静态包，降低正式部署遗漏预渲染步骤的风险' },
      { type: 'feature', scope: 'frontend', text: '【专题页工厂】后台模板工厂新增“新增模板 / 克隆模板 / 页面配置弹窗”能力，支持可视化编辑 Hero、热词、背景、显示开关与扩展 JSON，提升专题页售卖交付效率' },
      { type: 'improve', scope: 'frontend', text: '【专题页工厂】模板列表新增分类Slug批量编辑，创建专题后返回前台访问路径提示；未保存模板支持本地直接移除，运营操作更顺手' },
      { type: 'feature', scope: 'frontend', text: '【专题页工厂】新增模板包导入/导出：支持将模板批量打包为 JSON 交付文件，并在其他环境一键导入复用（适合售卖版快速落地）' },
      { type: 'fix', scope: 'frontend', text: '【导航切换】修复部分页面进入后顶部导航切换按钮默认值不一致：未命中频道路由时统一默认显示“AI导航”' },
      { type: 'fix', scope: 'fullstack', text: '【点击统计】补齐前端多入口点击上报链路：分类页/标签页/搜索页/每日上新/动态频道/网址详情访问按钮均统一写入点击统计，后台“点击量”数据更完整' },
      { type: 'improve', scope: 'backend', text: '【分类管理】分类列表统计改为真实关联口径：网站数与分类浏览量同时覆盖主分类 + 多分类关联表（uied_website_category），修复统计口径偏差' },
      { type: 'feature', scope: 'frontend', text: '【分类管理】后台新增“前端路径 + 浏览量”列：可直接打开分类前端地址，并查看分类维度浏览数据' },
      { type: 'feature', scope: 'frontend', text: '【网站管理】列表信息增强：新增前端路径、多分类标签、标记集与更新时间；新增“网站详情与点击数据”侧边抽屉，集中查看流量、来源占比与SEO内容' },
      { type: 'improve', scope: 'frontend', text: '【批量导入】所属分类搜索体验优化：支持按“分类名称/层级路径/slug”检索，下拉项同步展示路径+slug，关闭下拉自动清空搜索词' },
    ]
  },
  {
    version: '1.0.3',
    date: '2026-03-09',
    title: '正式版1.0.3：评论开关增强 + 自动审核抽屉化',
    changes: [
      { type: 'feature', scope: 'backend', text: '【后台设置】网址详情页配置新增“网址详情评论”明确开关文案与提示，支持单独控制详情页评论展示与提交能力' },
      { type: 'feature', scope: 'backend', text: '【后台设置】文章配置新增“文章详情评论”明确开关文案与提示，支持单独控制文章详情评论入口' },
      { type: 'improve', scope: 'backend', text: '【评论管理】评论类型与快捷开关文案统一为“网址详情评论/文章详情评论”，降低运营配置歧义' },
      { type: 'improve', scope: 'fullstack', text: '【评论链路】当详情评论开关关闭时，前台评论列表返回空并阻止提交，前后台行为保持一致' },
      { type: 'fix', scope: 'frontend', text: '【后台评论】修复评论开关状态显示异常：兼容 0/1、true/false、字符串等布尔值格式，避免“已关闭仍显示开启”' },
      { type: 'improve', scope: 'frontend', text: '【后台评论】自动审核与文字检测改为独立标签入口 + 右侧抽屉配置，减少主列表干扰并提升配置效率' },
      { type: 'fix', scope: 'frontend', text: '【后台评论】审核配置读取改为串行加载，规避同路由并发去重导致的 CanceledError 提示干扰' },
      { type: 'feature', scope: 'fullstack', text: '【后台评论】新增自动审核“风险分”机制：按敏感词、疑似词、外链、长度、重复等规则综合评分并输出低/中/高风险等级' },
      { type: 'feature', scope: 'frontend', text: '【后台评论】评论列表新增“审核命中”标签列，展示命中规则标签与风险分，便于运营快速人工复核' },
      { type: 'improve', scope: 'frontend', text: '【官网页脚】关注交流区改版为三列图标卡片样式，强化层级与对齐，悬浮详情面板改为轻玻璃卡片并优化移动端触发展示' },
      { type: 'fix', scope: 'frontend', text: '【官网页脚】修复“关注交流”首屏自动展开问题：默认不激活任何分组，改为鼠标移入或触屏点击后才展示详情弹层' },
      { type: 'fix', scope: 'fullstack', text: '【缓存链路】页脚相关公开接口（导航菜单/友情链接/页脚配置）补充 no-cache 响应头，前端设置接口请求统一追加时间戳，降低正式环境缓存滞后' },
      { type: 'improve', scope: 'frontend', text: '【SEO链路】index.html 启动时动态同步后台 site-info 到 title/description/keywords 与 OG/Twitter 标签；下一步将推进 SSR/预渲染以满足“首屏源码即最新 SEO”' },
      { type: 'fix', scope: 'frontend', text: '【页面管理】修复“滚动图标分类”编辑态设置异常：编辑页面时自动回显已关联分类，分类切换加载网站去重更稳定，非 iconScroll 模式不再误保存旧图标列表' },
      { type: 'improve', scope: 'fullstack', text: '【热门搜索标签】页面管理支持“双模式”生效链路：填写自定义标签时前台优先显示；留空时自动按后台网站标签热度生成动态标签' },
    ]
  },
  {
    version: '1.0.2',
    date: '2026-03-07',
    title: '正式版1.0.2：运营展示增强 + 网址草稿修复 + 后台菜单交互重构',
    changes: [
      { type: 'feature', scope: 'fullstack', text: '【页脚配置】新增“关于区域”后台配置：footer-about-section 标题、桌面/移动文案、网站收录按钮、更新记录按钮均支持后台编辑并前台实时生效' },
      { type: 'fix', scope: 'fullstack', text: '【社交媒体】修复“后台保存后前台页脚无变化”：统一后台分组/项目字段契约（displayType/type），前台 /api/social-media 接口加 no-cache 与可见项过滤' },
      { type: 'improve', scope: 'frontend', text: '【后台交互】重构“前端配置-社交媒体”页面骨架：分组管理/项目管理分栏更清晰，表格新增图标与状态可视化' },
      { type: 'feature', scope: 'frontend', text: '【后台能力】社交媒体编辑支持“图片 URL + 素材中心”双通道：分组图标、项目图标、二维码均可直接输入链接或从素材中心选择' },
      { type: 'feature', scope: 'frontend', text: '【后台能力】所属分组支持自定义昵称与自定义图标（素材中心图标库），并支持在项目编辑弹窗内快速新建分组' },
      { type: 'improve', scope: 'frontend', text: '【后台交互】前端配置-社交媒体页面新增“官网预览（每行3个）”区域，编辑时可直接对照前台图标排版效果' },
      { type: 'feature', scope: 'fullstack', text: '【社交媒体图标】新增 SVG 图标库接入：后台分组/项目图标支持 svg:key 选择，前台 /api/social-media 返回 iconSvg 并优先渲染' },
      { type: 'improve', scope: 'frontend', text: '【官网页脚】SocialMediaSection 支持 URL 图标优先渲染、移动端点击展开、extraInfo 多格式兼容，展示与运营配置保持一致' },
      { type: 'improve', scope: 'frontend', text: '【首页分类交互】子分类标签区右侧改为“纯图标查看更多”按钮，减少文案占位并保持操作区更紧凑' },
      { type: 'feature', scope: 'fullstack', text: '【查看更多配置】后台页面配置新增“查看更多新窗口”开关，支持分类区查看更多图标按配置在新标签页打开' },
      { type: 'fix', scope: 'frontend', text: '【分类页跳转】修复“查看更多”跳转落点异常：布局层新增全局强制回顶（关闭平滑滚动干扰），避免从页脚位置开始渲染' },
      { type: 'feature', scope: 'backend', text: '【后台评论】评论管理页新增“网站评论/文章评论”总开关，支持一键开启/关闭并保持配置合并保存' },
      { type: 'fix', scope: 'fullstack', text: '【后台评论】修复删除/审核偶发“缺少评论ID”：管理端改为透传 ids 与评论类型，后端删除接口兼容 id/ids 两种参数' },
      { type: 'feature', scope: 'fullstack', text: '【评论策略】新增“登录后评论”总开关：后台评论页可配置，开启后网站/文章评论提交必须登录' },
      { type: 'feature', scope: 'fullstack', text: '【评论审核】评论管理页新增“自动审核+文字检测”配置面板，支持关闭/全待审/智能审核三种模式' },
      { type: 'feature', scope: 'backend', text: '【评论审核】智能审核支持敏感词自动拒绝、疑似词转待审、最小长度/最大链接数校验与短时间重复评论检测' },
      { type: 'improve', scope: 'frontend', text: '【评论反馈】前台提交评论按审核状态返回明确提示：通过、待审核、未通过三类文案' },
      { type: 'fix', scope: 'fullstack', text: '【SEO生效】修复后台站点SEO修改后前台不刷新的问题：/api/site-info 与 /api/settings/frontend-config 增加 no-cache，前端请求追加时间戳参数强制取最新配置' },
      { type: 'fix', scope: 'backend', text: '【网址管理】修复草稿筛选混入已发布：statusList 优先于 legacy status，避免旧参数叠加导致筛选污染' },
      { type: 'fix', scope: 'fullstack', text: '【更新记录】修复 /changelog 网站总数显示为 0：新增 /websites/stats 公开统计接口，前端改为优先读取统计接口并增加回退解析' },
      { type: 'improve', scope: 'backend', text: '【后台菜单】登录后菜单下发增加“工作台置顶”规则，工作台固定在第一位（首页位置）' },
      { type: 'improve', scope: 'frontend', text: '【后台交互】重构侧栏菜单搜索与层级体验：新增导航统计、搜索态自动展开、统一 hover/active 视觉与折叠态对齐' },
      { type: 'improve', scope: 'frontend', text: '【后台交互】菜单选中态视觉优化：取消整块底色与边线，仅保留轻量字重高亮' },
      { type: 'improve', scope: 'frontend', text: '【后台交互】补充菜单键盘焦点态（focus-visible），提升后台可达性与操作反馈' },
      { type: 'improve', scope: 'backend', text: '【部署兼容】投稿服务字段补丁改为 MySQL 5.6/5.7 兼容写法（移除 8.0 专属 ADD COLUMN IF NOT EXISTS）' },
      { type: 'improve', scope: 'backend', text: '【部署兼容】补齐热门文章与文章配置补丁的 MySQL 5.6 兼容：移除 JSON_OBJECT/JSON_ARRAY，改为纯 JSON 文本写入' },
      { type: 'improve', scope: 'backend', text: '【本地开发】后端数据库保持原有默认连接（Docker 3308），并新增 UIED_DB_* 环境变量用于宝塔/本机 MySQL 覆盖' },
      { type: 'improve', scope: 'frontend', text: '【热门推荐】超大屏保持 6 列布局，首屏展示条数提升至 18 条，稳定显示 3 行卡片' },
      { type: 'improve', scope: 'frontend', text: '【外链跳转】ref 参数增强：兼容 URL 中的 &amp; 实体，避免 UTM 参数被错误解析' },
      { type: 'fix', scope: 'frontend', text: '【网址详情】正文排版间距收敛，标题/段落/列表与后台编辑器阅读节奏对齐' },
      { type: 'improve', scope: 'backend', text: '【工程能力】新增 skill：uied-nav-admin-menu-ux-refactor，用于沉淀后台菜单 IA/交互重构流程与回归清单' },
    ]
  },
  {
    version: '1.0.1',
    date: '2026-03-07',
    title: '正式版1.0.1：后台网址管理与发布编辑链路修复',
    changes: [
      { type: 'fix', scope: 'frontend', text: '【后台前端】修复“网站管理-前端查看”写死本地地址问题，改为读取 VITE_FRONTEND_URL（正式环境跳转正式域名）' },
      { type: 'fix', scope: 'backend', text: '【后端服务】修复已发布网站编辑时的重复网址误拦截：编辑保存/发布不再拦截重复网址（新增网站仍保留重复拦截）' },
      { type: 'improve', scope: 'frontend', text: '【官网前端】/changelog 新增“前端/后端”标签区分，便于版本验收快速定位变更范围' },
    ]
  },
  {
    version: '1.0.0',
    date: '2026-03-07',
    title: '正式版发布：移动端适配完成与上线稳定性修复',
    changes: [
      { type: 'improve', text: '完成首页、/p/hot、网址详情页移动端逐屏细调，多轮修复布局错乱与间距问题' },
      { type: 'improve', text: 'design-article-grid-container 改为单行横向滑动，优化 No.1 标签与“查看更多”移动端样式' },
      { type: 'improve', text: '详情页按钮与标签改为单行横向滚动交互，提升小屏信息密度与可操作性' },
      { type: 'feature', text: '新增 Hero Banner 图标点击方式配置，支持“直接跳转”与“打开详情页”两种模式' },
      { type: 'fix', text: '修复后台线上接口 404（/api 前缀重复）问题，保证管理端请求链路稳定' },
    ]
  },
  {
    version: '3.0.0-rc.5',
    date: '2026-03-07',
    title: '移动端逐屏细调第 7 轮与头部菜单颜色修复',
    changes: [
      { type: 'fix', text: '修复 Windows 系统深色模式下头部菜单发黑问题，导航栏改为固定浅色方案' },
      { type: 'improve', text: '网址详情页移动端重新排布：标题信息区与缩略图区密度优化，站点数据卡片可横向浏览' },
      { type: 'improve', text: '详情页按钮与标签统一为单行横向滚动交互，减少换行导致的错位' },
      { type: 'fix', text: 'design-article-grid-container 移动端修复 No.1 标签遮挡问题，调整为标题旁角标' },
      { type: 'improve', text: '重做“查看更多”移动端样式，改为简洁文本入口，减少视觉干扰' },
    ]
  },
  {
    version: '3.0.0-rc.4',
    date: '2026-03-05',
    title: '内容中心统一路由与 Hot 页面运营化增强',
    changes: [
      { type: 'feature', text: '热门文章 / 榜单系统 / 每日热榜 / 最新上新合并为单路由 /p/hot，顶部切换不跳页' },
      { type: 'feature', text: '新增内容中心统一配置入口，切换菜单文案可后台统一管理并实时生效' },
      { type: 'improve', text: '热门文章页面支持左侧运营菜单 + 右侧筛选组联动，补齐旧版筛选映射能力' },
      { type: 'improve', text: '新增搜索页头部广告位对接与默认结果数量扩展，首屏信息密度提升' },
      { type: 'fix', text: '修复 Hot 页面遗留写死数据导致的菜单与筛选不一致问题' },
    ]
  },
  {
    version: '3.0.0-rc.3',
    date: '2026-03-04',
    title: '网站管理批量能力增强与运营流程补齐',
    changes: [
      { type: 'feature', text: '网站管理新增批量导入结果明细表 + 一键导出 CSV，支持成功/跳过/失败原因追踪' },
      { type: 'feature', text: '批量导入支持多分类、主分类选择、重复主域名提醒后继续导入' },
      { type: 'feature', text: '新增批量 AI 生成详情正文流程，带执行中锁定与结果回执弹窗' },
      { type: 'improve', text: '添加网站与批量导入统一接入“获取网站信息”（SEO 标题/简介/关键词）能力' },
      { type: 'fix', text: '修复批量任务 10 秒超时报错但后端已成功写入的误报问题（前端超时放宽）' },
    ]
  },
  {
    version: '3.0.0-rc.2',
    date: '2026-03-03',
    title: '导航菜单与页面配置链路稳定性修复',
    changes: [
      { type: 'feature', text: '导航菜单编辑预览支持拖拽排序与结构化配置，后台保存后前端同步生效' },
      { type: 'feature', text: '页面管理新增 design-article-grid-container 配置同步能力，支持分类/标签/数量运营化设置' },
      { type: 'improve', text: 'SVG 图标库能力扩展，支持后台上传与页面分类图标调用' },
      { type: 'improve', text: '广告管理多位置配置链路增强，统一接入首页/详情页/搜索页等运营位' },
      { type: 'fix', text: '修复分类页/标签页部分场景 500 与详情页配置冲突导致的页面不可访问问题' },
    ]
  },
  {
    version: '3.0.0-rc.1',
    date: '2026-02-27',
    title: '首发候选包生成与发布健康检查通过',
    changes: [
      { type: 'feature', text: '完成商业版首发候选包（first-pro 预设）打包，支持按许可证交付而非代码分叉' },
      { type: 'improve', text: '发布前健康检查增强并实测通过（FAIL=0），覆盖接口、路由、菜单、配置、数据与前台关键页面' },
      { type: 'fix', text: '修复用户中心网址互动接口鉴权（收藏/点赞/评论列表 403），前后端联调可用' },
    ]
  },
  {
    version: '3.0.0-beta.8',
    date: '2026-02-26',
    title: '用户中心评论链路打通与分页对接修复',
    changes: [
      { type: 'feature', text: '个人中心新增“我的评论”Tab，支持文章评论与网址评论双列表展示' },
      { type: 'feature', text: '后端新增用户评论接口：/api/user/article/comment/list 与 /api/user/website/comment/list' },
      { type: 'improve', text: '用户中心分页参数兼容增强：统一支持 page / pageNo，修复部分列表翻页失效问题' },
      { type: 'improve', text: '个人中心统计卡片新增“网站收藏”“网站点赞”两项，运营侧可直观看到互动沉淀' },
    ]
  },
  {
    version: '3.0.0-beta.7',
    date: '2026-02-26',
    title: '热榜/榜单布局优化与站点访问数据高级版',
    changes: [
      { type: 'feature', text: '新增站点访问数据（高级版）模型与后台录入：月访问量、停留时长、页数、跳出率、来源占比' },
      { type: 'feature', text: '个人中心新增收藏网址与点赞网站列表（前后端打通）' },
      { type: 'feature', text: '网址对比页新增 AI 分析对比模块（受商业版 AI 能力控制）' },
      { type: 'improve', text: '每日热榜与榜单页布局改造，支持多平台展示与双栏榜单布局' },
      { type: 'improve', text: '广告管理页面增加前端显示位置说明与快捷预览入口，降低运营配置门槛' },
    ]
  },
  {
    version: '3.0.0-beta.6',
    date: '2026-02-26',
    title: '商业版运营模块与详情页对比能力增强',
    changes: [
      { type: 'feature', text: '新增网址详情页多模板（展示版/紧凑版/企业版）与后台切换配置' },
      { type: 'feature', text: '新增网址对比页 VS 路由与 SEO 结构化数据（FAQPage）' },
      { type: 'feature', text: '新增网站点赞链路（匿名+登录均可）并接入榜单系统' },
      { type: 'improve', text: '网站详情页支持截图优先级：上传预览图 > 本地图/截图 > 自动截图兜底' },
      { type: 'improve', text: '榜单系统升级为访问量/收藏量/点赞量 + 日周月切换' },
    ]
  },
  {
    version: '3.0.0-beta.5',
    date: '2026-02-25',
    title: '每日热榜与运营配置后台化',
    changes: [
      { type: 'feature', text: '每日热榜新增后台全局配置（默认平台、显示位置、入口配置）' },
      { type: 'feature', text: '每日热榜前端页面支持多平台展示与平台标签切换' },
      { type: 'improve', text: '每日热榜平台配置页改为运营化交互，弱化开发调试字段' },
      { type: 'fix', text: '修复热榜平台列表为空时前端无数据问题（后端默认平台回退）' },
    ]
  },
  {
    version: '3.0.0-beta.4',
    date: '2026-02-24',
    title: '商业位体系与截图能力升级',
    changes: [
      { type: 'feature', text: '新增商业位体系（顶部/正文中/底部/侧栏）并接入详情页运营位' },
      { type: 'feature', text: '新增网站预览截图接口（Playwright 优先，mShots 兜底）' },
      { type: 'improve', text: '广告管理支持图片/链接/HTML 代码广告内容配置' },
      { type: 'improve', text: '后台菜单按运营场景重构，新增榜单与专题/商业变现分组' },
    ]
  },
  {
    version: '2.7.1',
    date: '2026-01-18',
    title: 'SEO抓取与图标URL功能',
    changes: [
      { type: 'feature', text: '新增SEO信息自动抓取功能（标题、描述、关键词）' },
      { type: 'feature', text: '网站图标支持URL输入方式' },
      { type: 'improve', text: '优化网站添加流程，支持三种图标设置方式' },
      { type: 'fix', text: '修复SEO抓取SSL证书验证问题' },
    ]
  },
  {
    version: '2.7.0',
    date: '2026-01-18',
    title: '管理后台与移动端优化',
    changes: [
      { type: 'feature', text: '热门推荐管理新增批量删除功能' },
      { type: 'feature', text: '后台新增"访问首页"快捷按钮' },
      { type: 'improve', text: '搜索页面移动端改为2列卡片布局' },
      { type: 'fix', text: '修复后台 logo.svg 路径问题' },
      { type: 'improve', text: '优化移动端搜索卡片显示效果' },
    ]
  },
  {
    version: '2.6.0',
    date: '2026-01-17',
    title: '更新日志页面优化',
    changes: [
      { type: 'feature', text: '更新日志页面新增目录导航' },
      { type: 'feature', text: '新增开发者信息和仓库链接' },
      { type: 'feature', text: '新增相关平台快捷入口' },
      { type: 'improve', text: '完善历史功能更新记录' },
    ]
  },
  {
    version: '2.5.0',
    date: '2026-01-17',
    title: '自动跳转与页脚优化',
    changes: [
      { type: 'feature', text: '新增跳转弹窗自动倒计时跳转功能' },
      { type: 'feature', text: '新增更新记录页面' },
      { type: 'improve', text: '优化页脚按钮设计风格' },
      { type: 'fix', text: '修复广告横幅多位置筛选问题' },
    ]
  },
  {
    version: '2.4.0',
    date: '2026-01-15',
    title: '页脚与移动端优化',
    changes: [
      { type: 'feature', text: '页脚新增关注交流区域（社交媒体分组）' },
      { type: 'feature', text: '新增网站跳转确认弹窗配置' },
      { type: 'improve', text: '优化移动端子分类标签滚动体验' },
      { type: 'improve', text: '统一各页面底部广告横幅支持' },
      { type: 'fix', text: '修复移动端卡片溢出问题' },
    ]
  },
  {
    version: '2.3.0',
    date: '2026-01-10',
    title: 'AI搜索与监控功能',
    changes: [
      { type: 'feature', text: '新增AI智能搜索功能' },
      { type: 'feature', text: '新增网站状态监控系统' },
      { type: 'feature', text: '新增SEO设置管理（sitemap、robots）' },
      { type: 'feature', text: '新增操作日志记录系统' },
      { type: 'improve', text: '优化搜索结果排序算法' },
    ]
  },
  {
    version: '2.2.0',
    date: '2026-01-05',
    title: '广告与提交系统',
    changes: [
      { type: 'feature', text: '新增广告横幅管理系统' },
      { type: 'feature', text: '新增网站提交功能' },
      { type: 'feature', text: '新增数据导出功能（JSON/CSV）' },
      { type: 'feature', text: '新增批量导入功能' },
      { type: 'improve', text: '优化后台管理界面布局' },
    ]
  },
  {
    version: '2.1.0',
    date: '2025-12-28',
    title: '社交媒体与页面管理',
    changes: [
      { type: 'feature', text: '新增社交媒体分组管理' },
      { type: 'feature', text: '新增动态页面配置系统' },
      { type: 'feature', text: '新增友情链接管理' },
      { type: 'feature', text: '新增页脚分组管理' },
      { type: 'improve', text: '优化分类侧边栏交互' },
      { type: 'fix', text: '修复热门推荐数据加载问题' },
    ]
  },
  {
    version: '2.0.0',
    date: '2025-12-20',
    title: '全新架构升级',
    changes: [
      { type: 'feature', text: '全新前后端分离架构（React + Express）' },
      { type: 'feature', text: '新增后台管理系统（Ant Design）' },
      { type: 'feature', text: '支持SQLite数据库动态管理' },
      { type: 'feature', text: '新增JWT用户认证系统' },
      { type: 'feature', text: '新增分类和子分类管理' },
      { type: 'feature', text: '新增网站CRUD管理' },
      { type: 'feature', text: '新增站点设置管理' },
      { type: 'improve', text: '全面优化页面加载性能' },
    ]
  },
  {
    version: '1.5.0',
    date: '2025-12-10',
    title: '多页面支持',
    changes: [
      { type: 'feature', text: '新增AI工具页面' },
      { type: 'feature', text: '新增UI/UX设计页面' },
      { type: 'feature', text: '新增平面设计页面' },
      { type: 'feature', text: '新增3D设计页面' },
      { type: 'feature', text: '新增电商设计页面' },
      { type: 'feature', text: '新增室内设计页面' },
      { type: 'feature', text: '新增字体资源页面' },
    ]
  },
];

// 变更类型标签
const typeLabels: Record<string, { text: string; className: string }> = {
  feature: { text: '新功能', className: 'tag-feature' },
  improve: { text: '优化', className: 'tag-improve' },
  fix: { text: '修复', className: 'tag-fix' },
};

// 前后端范围标签
const scopeLabels: Record<string, { text: string; className: string }> = {
  frontend: { text: '前端', className: 'scope-frontend' },
  backend: { text: '后端', className: 'scope-backend' },
  fullstack: { text: '全栈', className: 'scope-fullstack' },
};

/**
 * 合并 GitHub 与本地更新记录：
 * 1) GitHub 版本优先（已发布）
 * 2) 本地仅存在的版本追加到前面（未发布预告/本地补丁）
 */
const mergeChangelogData = (
  githubReleases: ChangelogRelease[],
  localReleases: ChangelogRelease[],
): ChangelogRelease[] => {
  const githubVersions = new Set(githubReleases.map((item) => item.version));
  const localOnlyReleases = localReleases.filter((item) => !githubVersions.has(item.version));
  return [...localOnlyReleases, ...githubReleases];
};

/**
 * 获取公开网站总数（读取前台公开接口分页总数）。
 */
const fetchPublicWebsiteCount = async (): Promise<number | null> => {
  try {
    /**
     * 优先读取专用统计接口，避免误把 `/websites` 的列表结构当作分页结构解析成 0。
     */
    const statsResponse = await api.get('/websites/stats');
    const statsPayload = unwrapApiResponse<{ total?: number }>(statsResponse.data, {});
    const statsTotal = Number(statsPayload?.total);
    if (Number.isFinite(statsTotal) && statsTotal >= 0) {
      return statsTotal;
    }
  } catch (error) {
    console.warn('读取网站总数统计接口失败，尝试回退统计来源:', error);
  }

  try {
    /**
     * 回退到首页统计接口（兼容旧后端未提供 `/websites/stats` 的场景）。
     */
    const pageStatsResponse = await api.get('/pages/home/stats');
    const pageStatsPayload = unwrapApiResponse<{ totalWebsites?: number }>(pageStatsResponse.data, {});
    const totalFromPageStats = Number(pageStatsPayload?.totalWebsites);
    if (Number.isFinite(totalFromPageStats) && totalFromPageStats > 0) {
      return totalFromPageStats;
    }
  } catch (error) {
    console.warn('读取首页统计失败，尝试回退列表分页统计:', error);
  }

  try {
    /**
     * 最后回退：仅当返回里明确有 pagination.total 时才使用，避免把无分页结构误判为 0。
     */
    const response = await api.get('/websites', { params: { pageSize: 1 } });
    const payload = unwrapApiResponse<{ pagination?: { total?: number } }>(response.data, {});
    if (payload && payload.pagination && payload.pagination.total !== undefined) {
      const total = Number(payload.pagination.total);
      return Number.isFinite(total) && total >= 0 ? total : null;
    }
    return null;
  } catch (error) {
    console.warn('获取公开网站总数失败:', error);
    return null;
  }
};

const ChangelogPage: React.FC = () => {
  const { data: publicSettings } = usePublicSettings();
  const brandConfig = publicSettings.brand;
  const [changelogData, setChangelogData] = useState<ChangelogRelease[]>(localChangelogData);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'github' | 'local'>('loading');
  const [websiteCount, setWebsiteCount] = useState<number | null>(null);

  // 统计信息
  const lastUpdate = changelogData[0]?.date ? `${changelogData[0].date} 00:00` : '-';
  
  // 当前激活的版本（用于目录高亮）
  const [activeVersion, setActiveVersion] = useState<string>(localChangelogData[0].version);

  /**
   * 启动时从 GitHub 同步更新记录，失败时回退本地内置记录
   */
  useEffect(() => {
    let cancelled = false;
    const loadChangelog = async () => {
      try {
        const releases = await fetchGitHubChangelog({ limit: 16 });
        if (!cancelled && releases.length) {
          setChangelogData(mergeChangelogData(releases, localChangelogData));
          setSyncStatus('github');
          return;
        }
      } catch (error) {
        console.warn('同步 GitHub 更新记录失败，使用本地内置数据:', error);
      }
      if (!cancelled) {
        setChangelogData(localChangelogData);
        setSyncStatus('local');
      }
    };
    loadChangelog();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 当数据源变化时，重置目录高亮到最新版本
   */
  useEffect(() => {
    if (changelogData.length > 0) {
      setActiveVersion(changelogData[0].version);
    }
  }, [changelogData]);

  /**
   * 页面加载时同步网站总数（失败时保持空值展示）。
   */
  useEffect(() => {
    let cancelled = false;
    const loadWebsiteCount = async () => {
      const total = await fetchPublicWebsiteCount();
      if (!cancelled) {
        setWebsiteCount(total);
      }
    };
    loadWebsiteCount();
    return () => {
      cancelled = true;
    };
  }, []);

  // 滚动监听
  useEffect(() => {
    if (!changelogData.length) return;
    const handleScroll = () => {
      const sections = document.querySelectorAll('.changelog-item');
      let currentVersion = changelogData[0].version;
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150) {
          currentVersion = section.getAttribute('data-version') || currentVersion;
        }
      });
      
      setActiveVersion(currentVersion);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [changelogData]);

  // 点击目录跳转
  const scrollToVersion = (version: string) => {
    const element = document.querySelector(`[data-version="${version}"]`);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };
  const repoLinks = brandConfig.changelogRepoLinks.map((link) => ({
    ...link,
    icon: repoIconMap[link.iconKey] || UIEDIcon,
  }));
  const platformLinks = brandConfig.changelogPlatformLinks;

  return (
    <div className="changelog-page">
      <SEO 
        title="更新记录"
        description="UIED设计导航更新记录，了解最新功能和改进"
        keywords="更新记录,版本历史,功能更新"
      />

      <div className="changelog-layout">
        {/* 左侧目录导航 */}
        <aside className="changelog-toc">
          <div className="toc-header">版本目录</div>
          <nav className="toc-nav">
            {changelogData.map((release) => (
              <button
                key={release.version}
                className={`toc-item ${activeVersion === release.version ? 'active' : ''}`}
                onClick={() => scrollToVersion(release.version)}
              >
                <span className="toc-version">v{release.version}</span>
                <span className="toc-title">{release.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* 主内容区 */}
        <div className="changelog-container">
          {/* 页面头部 */}
          <div className="changelog-header">
            <h1>更新日志</h1>
            <p className="header-desc">
              由 <a href={brandConfig.changelogAuthorUrl} target="_blank" rel="noopener noreferrer" className="author-link">{brandConfig.changelogAuthorName}</a> {brandConfig.changelogAuthorDescription}
            </p>
            <div className="changelog-actions">
              <a
                href={brandConfig.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="changelog-buy-link"
              >
                {brandConfig.changelogBuyButtonText}
              </a>
            </div>
            
            {/* 仓库链接 */}
            <div className="repo-links">
              {repoLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="repo-link"
                >
                  <link.icon size={20} />
                  <span>{link.name}</span>
                </a>
              ))}
            </div>

            {/* 相关平台 */}
            <div className="platform-links">
              {platformLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="platform-link"
                >
                  <span>{link.name}</span>
                  <ArrowIcon size={12} />
                </a>
              ))}
            </div>

            {/* 统计信息 */}
            <div className="stats-info">
              当前网站总数：{websiteCount === null ? '--' : `${websiteCount}个`} | 最后更新：{lastUpdate} | 数据源：
              {syncStatus === 'loading' ? '加载中' : syncStatus === 'github' ? 'GitHub Release' : '本地内置记录'}
            </div>
          </div>

          {/* 时间线 */}
          <div className="changelog-timeline">
            {changelogData.map((release, index) => (
              <div 
                className="changelog-item" 
                key={release.version}
                data-version={release.version}
              >
                <div className="changelog-marker">
                  <div className="marker-dot" />
                  {index < changelogData.length - 1 && <div className="marker-line" />}
                </div>
                
                <div className="changelog-content">
                  <div className="changelog-meta">
                    <span className="version-tag">v{release.version}</span>
                    <span className="release-date">{release.date}</span>
                  </div>
                  
                  <h2 className="release-title">
                    {release.releaseUrl ? (
                      <a
                        href={release.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="release-title-link"
                      >
                        {release.title}
                      </a>
                    ) : (
                      release.title
                    )}
                  </h2>
                  
                  <ul className="changes-list">
                    {release.changes.map((change, i) => (
                      <li key={i} className="change-item">
                        <span className={`change-tag ${typeLabels[change.type].className}`}>
                          {typeLabels[change.type].text}
                        </span>
                        {change.scope && scopeLabels[change.scope] ? (
                          <span className={`change-scope-tag ${scopeLabels[change.scope].className}`}>
                            {scopeLabels[change.scope].text}
                          </span>
                        ) : null}
                        <span className="change-text">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogPage;
