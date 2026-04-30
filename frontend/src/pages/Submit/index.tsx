/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.03.06
 *
 * @file Submit/index.tsx
 * @description 网站提交页面 - 基础付费提交与运营加购
 */

import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { unwrapApiList, unwrapApiResponse } from '../../utils/apiResponse';
import { debugLog } from '../../utils/debugHelper';
import useDetailLayoutWidthMode from '../../hooks/useDetailLayoutWidthMode';
import SEO from '../../components/SEO';
import './index.css';

const STORAGE_KEY = 'submit_form_draft';

type ServiceType = 'submission';
type AddonKey = 'top_recommendation' | 'banner_slot';
type PayChannel = 'alipay' | 'wechat';
type SubmissionMode = 'free' | 'paid';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

interface SubmitFormData {
  serviceType: ServiceType;
  name: string;
  description: string;
  url: string;
  categoryId: string;
  tags: string;
  submitterName: string;
  submitterEmail: string;
  promotionPlan: string;
  promotionBudget: string;
  promotionTarget: string;
  promotionContact: string;
  selectedAddons: AddonKey[];
  bannerPositions: string[];
}

interface DraftData extends SubmitFormData {
  iconUrl: string;
  savedAt: number;
}

interface IconFetchPayload {
  faviconUrl?: string;
}

interface AiGeneratePayload {
  name?: string;
  description?: string;
  tags?: string;
}

interface SubmissionPayload {
  id?: string | number;
}

interface SubmissionPayOrderPayload {
  orderNo?: string;
  submissionId?: string | number;
  serviceType?: ServiceType;
  payChannel?: PayChannel;
  amount?: number;
  status?: 'created' | 'paid' | 'free' | 'closed';
  payUrl?: string;
  payTime?: number;
  message?: string;
}

interface SubmitResultState {
  success: boolean;
  message: string;
  id?: string;
  orderNo?: string;
  payUrl?: string;
  isPayment?: boolean;
}

interface PublicSettingsPayload {
  submission?: unknown;
}

interface SubmissionServiceItemConfig {
  enabled?: boolean;
  key?: ServiceType | AddonKey;
  mode?: SubmissionMode;
  label?: string;
  badge?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  ctaText?: string;
  features?: string[];
}

interface SubmissionFaqItem {
  question?: string;
  answer?: string;
  enabled?: boolean;
}

interface SubmissionProcessStep {
  title?: string;
  description?: string;
  sort?: number;
  enabled?: boolean;
}

interface SubmissionPublicConfig {
  enabled: boolean;
  pageEyebrow: string;
  pageTitle: string;
  pageSubtitle: string;
  pageDescription: string;
  heroHighlights: string[];
  containerMaxWidth: number;
  pricingTitle: string;
  processTitle: string;
  processDescription: string;
  processSteps: SubmissionProcessStep[];
  submitNoticeTitle: string;
  submitNotices: string[];
  faqTitle: string;
  closedTitle: string;
  closedDescription: string;
  closedButtonText: string;
  closedButtonUrl: string;
  submitService: SubmissionServiceItemConfig;
  topRecommendAddon: SubmissionServiceItemConfig;
  bannerAddon: SubmissionServiceItemConfig;
  faqItems: SubmissionFaqItem[];
  payment: {
    enabled: boolean;
    allowAlipay: boolean;
    allowWechat: boolean;
  };
}

interface SubmitServiceOption {
  key: ServiceType | AddonKey;
  mode: SubmissionMode;
  enabled: boolean;
  title: string;
  badge: string;
  description: string;
  highlights: string[];
  price: number;
  originalPrice: number;
  ctaText: string;
}

interface PayChannelOption {
  value: PayChannel;
  label: string;
  desc: string;
  enabled: boolean;
}

interface BannerPositionOption {
  value: string;
  label: string;
}

interface BannerPositionGroup {
  key: string;
  title: string;
  items: BannerPositionOption[];
}

const DEFAULT_FORM_DATA: SubmitFormData = {
  serviceType: 'submission',
  name: '',
  description: '',
  url: '',
  categoryId: '',
  tags: '',
  submitterName: '',
  submitterEmail: '',
  promotionPlan: 'standard',
  promotionBudget: '',
  promotionTarget: '',
  promotionContact: '',
  selectedAddons: [],
  bannerPositions: [],
};

const DEFAULT_BANNER_POSITION_OPTIONS: BannerPositionOption[] = [
  { value: 'home', label: '首页（home）' },
  { value: 'sidebar', label: '侧边栏（sidebar）' },
  { value: 'footer', label: '底部（footer）' },
  { value: 'detail', label: '详情页（detail）' },
  { value: 'global_strip', label: '全局横条（global_strip）' },
  { value: 'detail_top', label: '详情顶部（detail_top）' },
  { value: 'detail_inline', label: '详情正文中（detail_inline）' },
  { value: 'detail_bottom', label: '详情底部（detail_bottom）' },
  { value: 'detail_sidebar', label: '详情侧栏（detail_sidebar）' },
];

const DEFAULT_FREE_SUBMIT_SERVICE_TEXT = {
  label: '免费提交收录',
  description: '提交后进入人工审核、信息完善与正式收录流程，当前站点基础收录免费开放。',
  ctaText: '免费提交',
} as const;

const DEFAULT_SUBMISSION_PUBLIC_CONFIG: SubmissionPublicConfig = {
  enabled: true,
  pageEyebrow: 'Website Submission',
  pageTitle: '网站收录',
  pageSubtitle: '免费收录与商业增值服务分离：基础提交走网站收录，置顶推荐与 Banner 曝光在服务页加购。',
  pageDescription: '提交后进入审核与收录流程，商业服务页用于新品发布、首页曝光与短期活动冲刺，可按需购买置顶推荐和 Banner 运营位。',
  heroHighlights: [ '人工审核收录', '支持置顶推荐与 Banner 加购', '个人中心可追踪进度' ],
  containerMaxWidth: 1320,
  pricingTitle: '服务与加购',
  processTitle: '服务流程',
  processDescription: '从填写资料到支付审核再到正式上线，整条链路都可在后台跟踪。',
  processSteps: [
    { title: '填写资料', description: '提交网址、分类、简介与联系方式。', enabled: true, sort: 10 },
    { title: '选择服务', description: '免费收录走 /submit；商业服务页用于选择置顶推荐或 Banner 位。', enabled: true, sort: 20 },
    { title: '支付审核', description: '勾选收费加购后系统会创建订单；完成支付后进入人工审核排期。', enabled: true, sort: 30 },
    { title: '正式上线', description: '审核通过后上架展示，并在个人中心可查看记录。', enabled: true, sort: 40 },
  ],
  submitNoticeTitle: '提交须知',
  submitNotices: [
    '请确保提交的网站内容合法、健康，且可正常访问。',
    '免费基础收录请使用 /submit；本页主要用于置顶推荐、Banner 位等增值服务下单。',
    'Banner 位和置顶推荐属于附加曝光，不替代审核标准。',
    '提交后如需补充排期，请在联系方式里留下可联络方式。',
  ],
  faqTitle: '常见问题',
  closedTitle: '投稿服务暂未开放',
  closedDescription: '请稍后再试，或联系站点运营团队获取开放时间。',
  closedButtonText: '返回首页',
  closedButtonUrl: '/',
  submitService: {
    enabled: true,
    key: 'submission',
    mode: 'free',
    label: '免费提交收录',
    badge: '基础服务',
    description: '提交后进入人工审核、信息完善与正式收录流程，当前站点基础收录免费开放。',
    price: 39,
    originalPrice: 59,
    ctaText: '免费提交',
    features: [ '站点基础信息审核', '收录到分类页与搜索', '支持后续人工优化建议' ],
  },
  topRecommendAddon: {
    enabled: true,
    key: 'top_recommendation',
    label: '置顶推荐加购',
    badge: '曝光增强',
    description: '适合新品上线或短期活动，提升在列表与推荐位的优先级。',
    price: 99,
    originalPrice: 129,
    ctaText: '加购置顶',
    features: [ '优先排序与推荐位', '适合新品冷启动', '可与 Banner 叠加购买' ],
  },
  bannerAddon: {
    enabled: true,
    key: 'banner_slot',
    label: 'Banner 位加购',
    badge: '高曝光',
    description: '适合重点活动和商业推广，由运营确认排期后上线对应广告位。',
    price: 199,
    originalPrice: 299,
    ctaText: '加购 Banner',
    features: [ '首页或频道运营位', '适合发布会/活动期', '支付后人工排期执行' ],
  },
  faqItems: [
    { question: '提交后多久审核？', answer: '通常 1-3 个工作日完成审核。', enabled: true },
    { question: '置顶推荐和 Banner 位何时生效？', answer: '支付成功后由运营排期，审核通过后执行。', enabled: true },
    { question: '支持哪些支付方式？', answer: '支持支付宝和微信支付。', enabled: true },
  ],
  payment: {
    enabled: false,
    allowAlipay: true,
    allowWechat: true,
  },
};

/**
 * 规范化基础投稿模式，仅允许免费 / 付费两种。
 */
const normalizeSubmissionMode = (value: unknown): SubmissionMode => (
  String(value || '').trim().toLowerCase() === 'free' ? 'free' : 'paid'
);

/**
 * 根据投稿模式补齐基础服务默认文案，避免只切模式时仍残留旧的付费默认词。
 */
const resolveSubmitServiceDisplayText = (
  mode: SubmissionMode,
  rawLabel: string,
  rawDescription: string,
  rawCtaText: string,
): {
  title: string;
  description: string;
  ctaText: string;
} => {
  const fallbackLabel = mode === 'free'
    ? DEFAULT_FREE_SUBMIT_SERVICE_TEXT.label
    : String(DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.label || '付费提交收录');
  const fallbackDescription = mode === 'free'
    ? DEFAULT_FREE_SUBMIT_SERVICE_TEXT.description
    : String(DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.description || '站点提交后进入审核、补充、收录与站内搜索曝光流程。');
  const fallbackCtaText = mode === 'free'
    ? DEFAULT_FREE_SUBMIT_SERVICE_TEXT.ctaText
    : String(DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.ctaText || '提交并支付');
  const title = rawLabel
    ? (mode === 'free' && rawLabel === DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.label
      ? DEFAULT_FREE_SUBMIT_SERVICE_TEXT.label
      : rawLabel)
    : fallbackLabel;
  const description = rawDescription
    ? (mode === 'free' && rawDescription === DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.description
      ? DEFAULT_FREE_SUBMIT_SERVICE_TEXT.description
      : rawDescription)
    : fallbackDescription;
  const ctaText = rawCtaText
    ? (mode === 'free' && rawCtaText === DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.ctaText
      ? DEFAULT_FREE_SUBMIT_SERVICE_TEXT.ctaText
      : rawCtaText)
    : fallbackCtaText;
  return {
    title,
    description,
    ctaText,
  };
};

/**
 * 规范化投稿公开配置，兼容旧字段并保证前端渲染稳定。
 */
const normalizeSubmissionPublicConfig = (value: unknown): SubmissionPublicConfig => {
  const source = value && typeof value === 'object' ? (value as Record<string, any>) : {};
  const normalizeTextList = (rows: unknown, fallback: string[], max = 8, itemMax = 40): string[] => {
    const list = Array.isArray(rows) ? rows : fallback;
    const normalized = list
      .map((item: any) => String(item || '').trim().slice(0, itemMax))
      .filter(Boolean)
      .slice(0, max);
    return normalized.length > 0 ? normalized : fallback;
  };
  const normalizeProcessSteps = (rows: unknown, fallback: SubmissionProcessStep[]): SubmissionProcessStep[] => {
    const list = Array.isArray(rows) ? rows : fallback;
    const normalized = list
      .map((item: any, index: number) => ({
        title: String(item?.title || '').trim().slice(0, 40),
        description: String(item?.description || '').trim().slice(0, 180),
        sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
        enabled: item?.enabled !== false,
      }))
      .filter((item) => item.enabled !== false && item.title && item.description)
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
      .slice(0, 8);
    return normalized.length > 0 ? normalized : fallback;
  };
  const submitService = {
    ...DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService,
    ...(source.submitService && typeof source.submitService === 'object'
      ? source.submitService
      : (source.aiGrowthService && typeof source.aiGrowthService === 'object' ? source.aiGrowthService : {})),
    mode: normalizeSubmissionMode(
      source.submitService && typeof source.submitService === 'object'
        ? source.submitService.mode
        : (source.aiGrowthService && typeof source.aiGrowthService === 'object'
          ? source.aiGrowthService.mode
          : DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.mode)
    ),
  };
  const topRecommendAddon = {
    ...DEFAULT_SUBMISSION_PUBLIC_CONFIG.topRecommendAddon,
    ...(source.topRecommendAddon && typeof source.topRecommendAddon === 'object'
      ? source.topRecommendAddon
      : (source.paidBoostService && typeof source.paidBoostService === 'object' ? source.paidBoostService : {})),
  };
  const bannerAddon = {
    ...DEFAULT_SUBMISSION_PUBLIC_CONFIG.bannerAddon,
    ...(source.bannerAddon && typeof source.bannerAddon === 'object' ? source.bannerAddon : {}),
  };
  const faqItems = Array.isArray(source.faqItems)
    ? source.faqItems.filter((item: any) => item && item.enabled !== false)
    : DEFAULT_SUBMISSION_PUBLIC_CONFIG.faqItems;

  return {
    ...DEFAULT_SUBMISSION_PUBLIC_CONFIG,
    ...source,
    enabled: source.enabled !== false,
    pageEyebrow: String(source.pageEyebrow || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageEyebrow).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageEyebrow,
    pageTitle: String(source.pageTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageTitle,
    pageSubtitle: String(source.pageSubtitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageSubtitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageSubtitle,
    pageDescription: String(source.pageDescription || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageDescription).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageDescription,
    heroHighlights: normalizeTextList(source.heroHighlights, DEFAULT_SUBMISSION_PUBLIC_CONFIG.heroHighlights, 6, 32),
    containerMaxWidth: Number.isFinite(Number(source.containerMaxWidth))
      ? Math.max(960, Math.min(1600, Number(source.containerMaxWidth)))
      : DEFAULT_SUBMISSION_PUBLIC_CONFIG.containerMaxWidth,
    pricingTitle: String(source.pricingTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pricingTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pricingTitle,
    processTitle: String(source.processTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.processTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.processTitle,
    processDescription: String(source.processDescription || DEFAULT_SUBMISSION_PUBLIC_CONFIG.processDescription).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.processDescription,
    processSteps: normalizeProcessSteps(source.processSteps, DEFAULT_SUBMISSION_PUBLIC_CONFIG.processSteps),
    submitNoticeTitle: String(source.submitNoticeTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitNoticeTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitNoticeTitle,
    submitNotices: normalizeTextList(source.submitNotices, DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitNotices, 10, 120),
    faqTitle: String(source.faqTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.faqTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.faqTitle,
    closedTitle: String(source.closedTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedTitle,
    closedDescription: String(source.closedDescription || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedDescription).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedDescription,
    closedButtonText: String(source.closedButtonText || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedButtonText).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedButtonText,
    closedButtonUrl: String(source.closedButtonUrl || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedButtonUrl).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.closedButtonUrl,
    submitService,
    topRecommendAddon,
    bannerAddon,
    faqItems,
    payment: {
      enabled: source?.payment?.enabled === true,
      allowAlipay: source?.payment?.allowAlipay !== false,
      allowWechat: source?.payment?.allowWechat !== false,
    },
  };
};

/**
 * 价格格式化，整数显示更干净。
 */
const formatPrice = (price: number): string => {
  if (price <= 0) return '免费';
  return Number.isInteger(price) ? `¥${price}` : `¥${price.toFixed(2)}`;
};

/**
 * 生成订单摘要文案。
 */
const getAddonPlanLabel = (
  selectedAddons: AddonKey[],
  options: SubmitServiceOption[],
  baseLabel = '基础收录',
): string => {
  const labels = options
    .filter((item) => selectedAddons.includes(item.key as AddonKey))
    .map((item) => item.title);
  return labels.join(' + ') || baseLabel;
};

/**
 * 规范化 Banner 位置值，兼容历史别名与错误拼写。
 */
const normalizeBannerPosition = (position: unknown): string => {
  const raw = String(position || '').trim().toLowerCase();
  if (!raw) return '';
  const fixed = raw
    .replace(/^detall(?=$|[_-])/, 'detail')
    .replace(/^website-detall/, 'website-detail')
    .replace(/^website_detall/, 'website_detail');
  const map: Record<string, string> = {
    top: 'home',
    bottom: 'footer',
    popup: 'detail',
    website_detail: 'detail',
    website_detail_sidebar: 'detail_sidebar',
    'website-detail-sidebar': 'detail_sidebar',
    'detail-sidebar': 'detail_sidebar',
    detall: 'detail',
    detall_top: 'detail_top',
    detall_inline: 'detail_inline',
    detall_bottom: 'detail_bottom',
    detall_sidebar: 'detail_sidebar',
    'detall-sidebar': 'detail_sidebar',
  };
  return map[fixed] || fixed;
};

/**
 * 根据位置值输出中文标签，未知值直接回显原值。
 */
const getBannerPositionLabel = (position: string): string => {
  const normalized = normalizeBannerPosition(position);
  const matched = DEFAULT_BANNER_POSITION_OPTIONS.find((item) => item.value === normalized);
  if (matched) return matched.label;
  return normalized ? `其他位置（${normalized}）` : '未知位置';
};

/**
 * 获取 Banner 位置分组键，便于运营快速筛选。
 */
const getBannerPositionGroupKey = (position: string): 'home' | 'sidebar' | 'detail' | 'other' => {
  const normalized = normalizeBannerPosition(position);
  if ([ 'home', 'global_strip', 'footer' ].includes(normalized)) return 'home';
  if ([ 'sidebar' ].includes(normalized)) return 'sidebar';
  if ([ 'detail', 'detail_top', 'detail_inline', 'detail_bottom', 'detail_sidebar' ].includes(normalized)) return 'detail';
  return 'other';
};

// SVG 图标组件
const Icons = {
  Submit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  AI: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
      <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  Growth: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  Megaphone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a2 2 0 0 0 2 2h1l3 5h2l-1.5-5H13l6 3V6l-6 3H5a2 2 0 0 0-2 2z" />
    </svg>
  ),
  Rocket: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  Success: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Error: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  /**
   * 支付宝品牌图标（官方蓝色语义）
   */
  Alipay: () => (
    <svg viewBox="0 0 1024 1024" fill="none">
      <path d="M1024.0512 701.0304V196.864A196.9664 196.9664 0 0 0 827.136 0H196.864A196.9664 196.9664 0 0 0 0 196.864v630.272A196.9152 196.9152 0 0 0 196.864 1024h630.272a197.12 197.12 0 0 0 193.8432-162.0992c-52.224-22.6304-278.528-120.32-396.4416-176.64-89.7024 108.6976-183.7056 173.9264-325.3248 173.9264s-236.1856-87.2448-224.8192-194.048c7.4752-70.0416 55.552-184.576 264.2944-164.9664 110.08 10.3424 160.4096 30.8736 250.1632 60.5184 23.1936-42.5984 42.496-89.4464 57.1392-139.264H248.064v-39.424h196.9152V311.1424H204.8V267.776h240.128V165.632s2.1504-15.9744 19.8144-15.9744h98.4576V267.776h256v43.4176h-256V381.952h208.8448a805.9904 805.9904 0 0 1-84.8384 212.6848c60.672 22.016 336.7936 106.3936 336.7936 106.3936zM283.5456 791.6032c-149.6576 0-173.312-94.464-165.376-133.9392 7.8336-39.3216 51.2-90.624 134.4-90.624 95.5904 0 181.248 24.4736 284.0576 74.5472-72.192 94.0032-160.9216 150.016-253.0816 150.016z" fill="#009FE8" />
    </svg>
  ),
  /**
   * 微信支付品牌图标（官方绿色语义）
   */
  WechatPay: () => (
    <svg viewBox="0 0 1228 1024" fill="none">
      <path d="M530.8928 703.1296a41.472 41.472 0 0 1-35.7376-19.8144l-2.7136-5.5808L278.272 394.752a18.7392 18.7392 0 0 1-2.048-8.1408 19.968 19.968 0 0 1 20.48-19.3536c4.608 0 8.8576 1.4336 12.288 3.84l234.3936 139.9296a64.4096 64.4096 0 0 0 54.528 5.9392L1116.2624 204.8C1004.9536 80.896 821.76 0 614.4 0 275.0464 0 0 216.576 0 483.6352c0 145.7152 82.7392 276.8896 212.2752 365.5168a38.1952 38.1952 0 0 1 17.2032 31.488 44.4928 44.4928 0 0 1-2.1504 12.3904l-27.6992 97.4848c-1.3312 4.608-3.328 9.3696-3.328 14.1312 0 10.752 9.216 19.3536 20.48 19.3536 4.4032 0 8.0384-1.536 11.776-3.584l134.5536-73.3184c10.1376-5.5296 20.7872-8.96 32.6144-8.96 6.2976 0 12.288 0.9216 18.0736 2.5088 62.72 17.0496 130.4576 26.5728 200.5504 26.5728C953.7024 967.168 1228.8 750.592 1228.8 483.6352c0-80.9472-25.4464-157.1328-70.0416-224.1024l-604.9792 436.992-4.4544 2.4064a42.1376 42.1376 0 0 1-18.432 4.1984z" fill="#15BA11" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * 可搜索分类选择器，保留父子分组结构，减少大量分类下的操作成本。
 */
const CategorySelect: React.FC<CategorySelectProps> = ({ categories, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoryTree = useMemo(() => {
    const idSet = new Set(categories.map((item) => String(item.id)));
    const parentCategories = categories.filter((item) => !item.parentId || !idSet.has(String(item.parentId)));
    return parentCategories.map((parent) => ({
      ...parent,
      children: categories.filter((child) => String(child.parentId || '') === String(parent.id)),
    }));
  }, [categories]);

  const filteredTree = useMemo(() => {
    if (!searchTerm) return categoryTree;
    const term = searchTerm.toLowerCase();
    return categoryTree
      .map((parent) => ({
        ...parent,
        parentMatched: parent.name.toLowerCase().includes(term),
        children: parent.children.filter((child) => child.name.toLowerCase().includes(term)),
      }))
      .filter((parent) => parent.parentMatched || parent.children.length > 0);
  }, [categoryTree, searchTerm]);

  const selectedCategory = useMemo(() => {
    const category = categories.find((item) => item.id === value);
    if (!category) return null;
    const parent = category.parentId
      ? categories.find((item) => String(item.id) === String(category.parentId))
      : null;
    return { name: category.name, parentName: parent?.name || '' };
  }, [categories, value]);

  useEffect(() => {
    /**
     * 点击外部关闭下拉。
     */
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  /**
   * 处理分类选中，并在选中后收起面板。
   */
  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="category-select" ref={containerRef}>
      <button
        type="button"
        className={`category-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selectedCategory ? (
          <span className="selected-value">
            {selectedCategory.parentName ? <span className="parent-name">{selectedCategory.parentName} / </span> : null}
            {selectedCategory.name}
          </span>
        ) : (
          <span className="placeholder">请选择分类</span>
        )}
        <Icons.ChevronDown />
      </button>

      {isOpen ? (
        <div className="category-select-dropdown">
          <div className="category-search">
            <Icons.Search />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索分类..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
            {searchTerm ? (
              <button
                type="button"
                className="clear-search"
                onClick={(event) => {
                  event.stopPropagation();
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
              >
                <Icons.X />
              </button>
            ) : null}
          </div>

          <div className="category-list">
            <div
              className={`category-item clear-option ${!value ? 'selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              <span className="category-name">不选择分类</span>
              {!value ? <Icons.Check /> : null}
            </div>

            {filteredTree.length === 0 ? (
              <div className="no-results">没有找到匹配的分类</div>
            ) : (
              filteredTree.map((parent) => (
                <div key={parent.id} className="category-group">
                  <div className="category-group-header">{parent.name}</div>
                  <div
                    className={`category-item category-item-parent ${value === parent.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(parent.id)}
                  >
                    <span className="category-name">{parent.name}</span>
                    {value === parent.id ? <Icons.Check /> : null}
                  </div>
                  {parent.children.map((child) => (
                    <div
                      key={child.id}
                      className={`category-item ${value === child.id ? 'selected' : ''}`}
                      onClick={() => handleSelect(child.id)}
                    >
                      <span className="category-name">{child.name}</span>
                      {value === child.id ? <Icons.Check /> : null}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const SubmitPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const layoutWidthMode = useDetailLayoutWidthMode();
  const [formData, setFormData] = useState<SubmitFormData>({ ...DEFAULT_FORM_DATA });
  const [categories, setCategories] = useState<Category[]>([]);
  const [bannerPositionOptions, setBannerPositionOptions] = useState<BannerPositionOption[]>(DEFAULT_BANNER_POSITION_OPTIONS);
  const [bannerPositionKeyword, setBannerPositionKeyword] = useState('');
  const [bannerPositionLoading, setBannerPositionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [fetchingIcon, setFetchingIcon] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [iconUrl, setIconUrl] = useState('');
  const [submitResult, setSubmitResult] = useState<SubmitResultState | null>(null);
  const [submissionConfig, setSubmissionConfig] = useState<SubmissionPublicConfig>(DEFAULT_SUBMISSION_PUBLIC_CONFIG);
  const [payChannel, setPayChannel] = useState<PayChannel>('alipay');
  const [payPollingOrderNo, setPayPollingOrderNo] = useState('');
  const [allowDuplicateSubmit, setAllowDuplicateSubmit] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [urlCheckResult, setUrlCheckResult] = useState<{
    checking: boolean;
    exists: boolean;
    type?: 'website' | 'pending';
    message?: string;
    website?: { name: string; url: string };
  }>({ checking: false, exists: false });
  const layoutStyle = useMemo(
    () => ({ '--submit-layout-config-max-width': `${submissionConfig.containerMaxWidth || 1320}px` } as CSSProperties),
    [submissionConfig.containerMaxWidth],
  );

  const submitService = useMemo<SubmitServiceOption>(() => {
    const source = submissionConfig.submitService || {};
    const mode = normalizeSubmissionMode(source.mode);
    const displayText = resolveSubmitServiceDisplayText(
      mode,
      String(source.label || '').trim(),
      String(source.description || '').trim(),
      String(source.ctaText || '').trim(),
    );
    return {
      key: 'submission',
      mode,
      enabled: source.enabled !== false,
      title: displayText.title,
      badge: String(source.badge || DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.badge),
      description: displayText.description,
      highlights: Array.isArray(source.features) && source.features.length > 0
        ? source.features.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
        : DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitService.features || [],
      price: mode === 'free' ? 0 : Math.max(0, Number(source.price || 0)),
      originalPrice: mode === 'free' ? 0 : Math.max(0, Number(source.originalPrice || 0)),
      ctaText: displayText.ctaText,
    };
  }, [submissionConfig.submitService]);

  const addonOptions = useMemo<SubmitServiceOption[]>(() => {
    const topAddon = submissionConfig.topRecommendAddon || {};
    const bannerAddon = submissionConfig.bannerAddon || {};
    return [
      {
        key: 'top_recommendation' as AddonKey,
        mode: 'paid' as SubmissionMode,
        enabled: topAddon.enabled !== false,
        title: String(topAddon.label || DEFAULT_SUBMISSION_PUBLIC_CONFIG.topRecommendAddon.label),
        badge: String(topAddon.badge || DEFAULT_SUBMISSION_PUBLIC_CONFIG.topRecommendAddon.badge),
        description: String(topAddon.description || DEFAULT_SUBMISSION_PUBLIC_CONFIG.topRecommendAddon.description),
        highlights: Array.isArray(topAddon.features) && topAddon.features.length > 0
          ? topAddon.features.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
          : DEFAULT_SUBMISSION_PUBLIC_CONFIG.topRecommendAddon.features || [],
        price: Math.max(0, Number(topAddon.price || 0)),
        originalPrice: Math.max(0, Number(topAddon.originalPrice || 0)),
        ctaText: String(topAddon.ctaText || DEFAULT_SUBMISSION_PUBLIC_CONFIG.topRecommendAddon.ctaText),
      },
      {
        key: 'banner_slot' as AddonKey,
        mode: 'paid' as SubmissionMode,
        enabled: bannerAddon.enabled !== false,
        title: String(bannerAddon.label || DEFAULT_SUBMISSION_PUBLIC_CONFIG.bannerAddon.label),
        badge: String(bannerAddon.badge || DEFAULT_SUBMISSION_PUBLIC_CONFIG.bannerAddon.badge),
        description: String(bannerAddon.description || DEFAULT_SUBMISSION_PUBLIC_CONFIG.bannerAddon.description),
        highlights: Array.isArray(bannerAddon.features) && bannerAddon.features.length > 0
          ? bannerAddon.features.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
          : DEFAULT_SUBMISSION_PUBLIC_CONFIG.bannerAddon.features || [],
        price: Math.max(0, Number(bannerAddon.price || 0)),
        originalPrice: Math.max(0, Number(bannerAddon.originalPrice || 0)),
        ctaText: String(bannerAddon.ctaText || DEFAULT_SUBMISSION_PUBLIC_CONFIG.bannerAddon.ctaText),
      },
    ].filter((item) => item.enabled);
  }, [submissionConfig.bannerAddon, submissionConfig.topRecommendAddon]);

  const faqItems = useMemo(
    () => (submissionConfig.faqItems || []).filter((item) => item && item.enabled !== false && item.question && item.answer),
    [submissionConfig.faqItems],
  );
  const processSteps = useMemo(
    () => (submissionConfig.processSteps || []).filter((item) => item && item.enabled !== false && item.title && item.description),
    [submissionConfig.processSteps],
  );
  const submitNotices = useMemo(
    () => (submissionConfig.submitNotices || []).map((item) => String(item || '').trim()).filter(Boolean),
    [submissionConfig.submitNotices],
  );
  const heroHighlights = useMemo(
    () => (submissionConfig.heroHighlights || []).map((item) => String(item || '').trim()).filter(Boolean),
    [submissionConfig.heroHighlights],
  );

  const selectedAddonOptions = useMemo(
    () => addonOptions.filter((item) => formData.selectedAddons.includes(item.key as AddonKey)),
    [addonOptions, formData.selectedAddons],
  );
  const isFreeSubmitMode = submitService.mode === 'free';
  const isServiceLanding = location.pathname.startsWith('/submit/services');
  const useSimpleFreeFlow = !isServiceLanding;
  const isFreeEntryUnavailable = false;
  const requiresCommercialAddon = !useSimpleFreeFlow && isFreeSubmitMode && selectedAddonOptions.length === 0;

  const bannerPositionGroups = useMemo<BannerPositionGroup[]>(() => {
    const keyword = bannerPositionKeyword.trim().toLowerCase();
    const groupTitleMap: Record<string, string> = {
      home: '首页与全局',
      sidebar: '通用侧栏',
      detail: '详情页',
      other: '其他',
    };
    const groupOrder = [ 'home', 'sidebar', 'detail', 'other' ];
    const groupMap = new Map<string, BannerPositionOption[]>();

    bannerPositionOptions.forEach((item) => {
      const hit = !keyword
        || item.label.toLowerCase().includes(keyword)
        || item.value.toLowerCase().includes(keyword);
      if (!hit) return;
      const key = getBannerPositionGroupKey(item.value);
      const current = groupMap.get(key) || [];
      current.push(item);
      groupMap.set(key, current);
    });

    return groupOrder
      .map((key) => ({
        key,
        title: groupTitleMap[key] || '其他',
        items: groupMap.get(key) || [],
      }))
      .filter((group) => group.items.length > 0);
  }, [bannerPositionKeyword, bannerPositionOptions]);

  const totalPrice = useMemo(
    () => (useSimpleFreeFlow ? 0 : submitService.price + selectedAddonOptions.reduce((sum, item) => sum + item.price, 0)),
    [selectedAddonOptions, submitService.price, useSimpleFreeFlow],
  );
  const isSubmissionClosed = !submissionConfig.enabled || !submitService.enabled;

  const shouldRequirePayment = !useSimpleFreeFlow && totalPrice > 0;
  const displayPageTitle = useMemo(() => {
    const configuredTitle = String(submissionConfig.pageTitle || '').trim();
    if (!configuredTitle || configuredTitle === '提交网站' || configuredTitle === '网站收录') {
      return useSimpleFreeFlow ? '网站收录' : '收录与增值服务';
    }
    return configuredTitle;
  }, [submissionConfig.pageTitle, useSimpleFreeFlow]);

  /**
   * 汇总当前模式下的核心文案与结构标题，统一驱动页面视觉表达。
   */
  const submitModePresentation = useMemo(() => {
    if (useSimpleFreeFlow) {
      return {
        heroActionText: isFreeEntryUnavailable ? '查看收录与增值服务' : '进入网站收录',
        pricingTitle: '网站收录说明',
        pricingDescription: '网站收录页只保留基础投稿表单，填写网站资料后即可进入审核与收录流程。',
        processTitle: '网站收录流程',
        processDescription: '提交基础信息后进入人工审核，通过后将完成分类整理与正式收录。',
        summaryEyebrow: '网站收录',
        summaryTitle: '投稿检查',
        summaryEmptyText: '当前页仅处理网站收录，不包含增值曝光服务。',
        noticeTitle: '收录提醒',
        operationSectionTitle: '补充信息（选填）',
        overviewTitle: '网站收录标准',
        overviewDescription: '这套模式更像编辑部收稿入口，先看站点质量与完整度，再决定是否正式收录。',
        overviewItems: [
          '提交基础资料后进入人工审核，符合定位的网站会完成分类与标签整理。',
          '通过审核后，会以普通收录形式进入站点内容库。',
          '如需置顶推荐或 Banner 曝光，请前往“收录与增值服务”页面。',
        ],
      };
    }

    return {
      heroActionText: '进入投放表单',
      pricingTitle: '商业投放方案',
      pricingDescription: '这套模式面向付费投放与运营合作，免费收录走基础入口，本页通过置顶与 Banner 资源提升曝光。',
      processTitle: '商业投放流程',
      processDescription: '提交商业资料后统一创建订单，完成支付进入排期与审核，再按投放方案上线。',
      summaryEyebrow: '商业投放',
      summaryTitle: '投放预算',
      summaryEmptyText: '当前仅包含基础商业收录，如需额外曝光可继续勾选置顶推荐或 Banner 位。',
      noticeTitle: '投放提醒',
      operationSectionTitle: '投放诉求（选填）',
      overviewTitle: '商业投放权益',
      overviewDescription: '这套模式更像运营投放单，强调预算、资源位与上线节奏，适合新品发布和品牌曝光。',
      overviewItems: [
        '免费收录请走 /submit；本页选择增值服务后生成投放订单并进入处理流程。',
        '置顶推荐与 Banner 资源位可组合购买，用于首页或频道页的额外曝光。',
        '支付完成后进入排期与沟通阶段，适合新品上线、活动推广与集中曝光。',
      ],
    };
  }, [isFreeEntryUnavailable, useSimpleFreeFlow]);

  /**
   * 汇总当前基础收录模式文案，便于在前台不同区域复用。
   */
  const submitModeSummary = useMemo(() => {
    if (useSimpleFreeFlow) {
      return {
        title: isFreeEntryUnavailable ? '当前未开启网站收录' : '当前为网站收录页',
        description: isFreeEntryUnavailable
          ? '当前站点未开启网站收录入口，请改用“收录与增值服务”页面继续提交。'
          : '当前无需支付，提交后会直接进入人工审核与基础收录流程。',
      };
    }
    return {
      title: requiresCommercialAddon ? '请选择增值服务' : '当前为收录与增值服务页',
      description: shouldRequirePayment
        ? '基础收录与已选加购会统一创建支付订单，完成付款后进入审核流程。'
        : (requiresCommercialAddon
          ? '基础收录已拆到免费入口；请至少选择一个增值服务后再提交商业投放单。'
          : '当前配置无需支付，可直接提交。'),
    };
  }, [isFreeEntryUnavailable, requiresCommercialAddon, shouldRequirePayment, useSimpleFreeFlow]);

  /**
   * 当后台未自定义标题时，按当前模式输出更贴合的默认标题。
   */
  const displaySectionCopy = useMemo(() => ({
    pricingTitle: submissionConfig.pricingTitle === DEFAULT_SUBMISSION_PUBLIC_CONFIG.pricingTitle
      ? submitModePresentation.pricingTitle
      : submissionConfig.pricingTitle,
    processTitle: submissionConfig.processTitle === DEFAULT_SUBMISSION_PUBLIC_CONFIG.processTitle
      ? submitModePresentation.processTitle
      : submissionConfig.processTitle,
    submitNoticeTitle: submissionConfig.submitNoticeTitle === DEFAULT_SUBMISSION_PUBLIC_CONFIG.submitNoticeTitle
      ? submitModePresentation.noticeTitle
      : submissionConfig.submitNoticeTitle,
    operationSectionTitle: submitModePresentation.operationSectionTitle,
  }), [submissionConfig.pricingTitle, submissionConfig.processTitle, submissionConfig.submitNoticeTitle, submitModePresentation]);
  const heroTotalLabel = useMemo(() => {
    if (isSubmissionClosed) return '当前状态';
    if (useSimpleFreeFlow) return '网站收录入口';
    if (shouldRequirePayment) return '当前待支付金额';
    return '当前服务组合';
  }, [isSubmissionClosed, shouldRequirePayment, useSimpleFreeFlow]);
  const heroTotalValue = useMemo(() => {
    if (isSubmissionClosed) return '暂停开放';
    if (useSimpleFreeFlow) return isFreeEntryUnavailable ? '未开启' : '已开启';
    if (requiresCommercialAddon) return '待选择';
    if (shouldRequirePayment) return formatPrice(totalPrice);
    return formatPrice(totalPrice);
  }, [isFreeEntryUnavailable, isSubmissionClosed, requiresCommercialAddon, shouldRequirePayment, totalPrice, useSimpleFreeFlow]);
  const submitActionText = useMemo(() => {
    if (useSimpleFreeFlow) return '提交收录申请';
    if (requiresCommercialAddon) return '选择增值服务';
    if (shouldRequirePayment) {
      return submitService.mode === 'free'
        ? '提交并支付'
        : (submitService.ctaText || '提交并支付');
    }
    return submitService.ctaText || (submitService.mode === 'free' ? '免费提交' : '提交并支付');
  }, [requiresCommercialAddon, shouldRequirePayment, submitService.ctaText, submitService.mode, useSimpleFreeFlow]);

  const paymentChannelOptions = useMemo<PayChannelOption[]>(
    () => [
      {
        value: 'alipay' as const,
        label: '支付宝官方',
        desc: '网页支付 / 当面付',
        enabled: submissionConfig.payment.enabled && submissionConfig.payment.allowAlipay,
      },
      {
        value: 'wechat' as const,
        label: '微信支付官方',
        desc: 'H5 MWEB 支付',
        enabled: submissionConfig.payment.enabled && submissionConfig.payment.allowWechat,
      },
    ],
    [submissionConfig.payment],
  );

  const availablePayChannels = useMemo(
    () => paymentChannelOptions.filter((item) => item.enabled),
    [paymentChannelOptions],
  );
  const heroStats = useMemo(() => {
    if (useSimpleFreeFlow) {
      return [
        {
          label: '提交流程',
          value: isFreeEntryUnavailable ? '已切换' : '免费',
          hint: isFreeEntryUnavailable ? '当前免费通道未开放，可前往增值服务页继续提交' : '填写网址与站点信息后即可提交',
        },
        {
          label: '必填重点',
          value: '网址 + 名称',
          hint: '补充描述、标签与联系方式越完整，越有利于审核',
        },
        {
          label: '相关服务',
          value: addonOptions.length > 0 ? `${addonOptions.length} 项` : '另页查看',
          hint: '置顶推荐与 Banner 曝光已拆分到“收录与增值服务”页',
        },
      ];
    }

    return [
      {
        label: '基础服务价',
        value: formatPrice(submitService.price),
        hint: submitService.title || '基础服务',
      },
      {
        label: '加购资源',
        value: addonOptions.length > 0 ? `${addonOptions.length} 项` : '未开启',
        hint: addonOptions.length > 0 ? '置顶推荐 / Banner 位组合投放' : '当前仅基础商业收录',
      },
      {
        label: '支付状态',
        value: requiresCommercialAddon ? '待选服务' : (shouldRequirePayment ? (submissionConfig.payment.enabled ? '已开启' : '待配置') : '无需支付'),
        hint: requiresCommercialAddon
          ? '请选择置顶推荐或 Banner 位后继续'
          : (submissionConfig.payment.enabled ? '完成支付后进入排期与审核' : '需到支付中心补齐参数'),
      },
    ];
  }, [addonOptions.length, isFreeEntryUnavailable, requiresCommercialAddon, shouldRequirePayment, submissionConfig.payment.enabled, submitService.price, submitService.title, useSimpleFreeFlow]);

  const commercialBaseTitle = !useSimpleFreeFlow && isFreeSubmitMode
    ? '基础收录资料（随增值服务提交）'
    : submitService.title;
  const commercialBaseDescription = !useSimpleFreeFlow && isFreeSubmitMode
    ? '免费基础收录请使用网站收录入口；本页用于置顶推荐、Banner 投放等增值服务下单。'
    : submitService.description;
  const commercialBasePriceText = !useSimpleFreeFlow && isFreeSubmitMode
    ? '按加购计费'
    : formatPrice(submitService.price);

  /**
   * 统一提取 API 错误文案，兼容 message/msg/error 三种结构。
   */
  const getApiErrorMessage = useCallback((error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<Record<string, any>>;
    const payload = axiosError.response?.data || {};
    return String(payload?.message || payload?.msg || payload?.error || fallback);
  }, []);

  /**
   * 加载投稿公开配置，驱动前端价格、文案与支付方式。
   */
  const fetchSubmissionConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await api.get('/settings/public');
      const settings = unwrapApiResponse<PublicSettingsPayload>(res.data, {});
      setSubmissionConfig(normalizeSubmissionPublicConfig(settings?.submission));
    } catch (error) {
      debugLog.error('获取投稿公开配置失败，使用默认值:', error);
      setSubmissionConfig(DEFAULT_SUBMISSION_PUBLIC_CONFIG);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  /**
   * 加载分类列表，供投稿页分类选择器使用。
   */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories?flat=true');
      const rawList = unwrapApiList<Record<string, any>>(res.data);
      const normalized = rawList
        .map((item) => ({
          id: String(item.id || ''),
          name: String(item.name || '').trim(),
          slug: String(item.slug || '').trim(),
          parentId: item.parentId || item.parent_id ? String(item.parentId || item.parent_id) : undefined,
        }))
        .filter((item) => item.id && item.name);
      setCategories(normalized);
    } catch (error) {
      debugLog.error('获取分类失败:', error);
    }
  }, []);

  /**
   * 拉取后台广告管理中的投放位置，并与默认位置合并供 Banner 加购选择。
   */
  const fetchBannerPositionOptions = useCallback(async () => {
    setBannerPositionLoading(true);
    try {
      const res = await api.get('/banners');
      const list = unwrapApiList<Record<string, any>>(res.data);
      const positionSet = new Set(DEFAULT_BANNER_POSITION_OPTIONS.map((item) => item.value));
      list.forEach((item) => {
        const rawPositionList = Array.isArray(item.positionList)
          ? item.positionList
          : String(item.position || '')
            .split(',')
            .map((position) => String(position || '').trim())
            .filter(Boolean);
        rawPositionList.forEach((position) => {
          const normalized = normalizeBannerPosition(position);
          if (normalized) positionSet.add(normalized);
        });
      });

      const defaultOrderMap = DEFAULT_BANNER_POSITION_OPTIONS.reduce<Record<string, number>>((acc, item, index) => {
        acc[item.value] = index;
        return acc;
      }, {});

      const options = Array.from(positionSet)
        .map((value) => ({ value, label: getBannerPositionLabel(value) }))
        .sort((a, b) => {
          const orderA = defaultOrderMap[a.value];
          const orderB = defaultOrderMap[b.value];
          if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
          if (orderA !== undefined) return -1;
          if (orderB !== undefined) return 1;
          return a.value.localeCompare(b.value, 'zh-CN');
        });
      setBannerPositionOptions(options);
    } catch (error) {
      debugLog.error('获取 Banner 位置失败，使用默认位置:', error);
      setBannerPositionOptions(DEFAULT_BANNER_POSITION_OPTIONS);
    } finally {
      setBannerPositionLoading(false);
    }
  }, []);

  /**
   * 尝试在新窗口打开支付链接，若被浏览器拦截则允许用户手动继续支付。
   */
  const openPayWindow = useCallback((payUrl: string): boolean => {
    if (!payUrl) return false;
    const opened = window.open(payUrl, '_blank', 'noopener,noreferrer');
    return Boolean(opened);
  }, []);

  /**
   * 预打开可控空白支付窗口，避免异步创建订单后被浏览器拦截。
   */
  const preOpenPayWindow = useCallback((): Window | null => {
    try {
      return window.open('', '_blank');
    } catch (error) {
      return null;
    }
  }, []);

  /**
   * 查询支付订单状态，并把支付结果同步到当前结果卡片。
   */
  const refreshPayOrderStatus = useCallback(async (orderNo: string): Promise<string> => {
    const normalizedOrderNo = String(orderNo || '').trim();
    if (!normalizedOrderNo) return '';
    try {
      const res = await api.get('/submissions/pay/status', { params: { orderNo: normalizedOrderNo } });
      const data = unwrapApiResponse<SubmissionPayOrderPayload>(res.data, {});
      const status = String(data.status || '');
      if (status === 'paid' || status === 'free') {
        setSubmitResult((prev) => ({
          success: true,
          id: data.submissionId ? String(data.submissionId) : prev?.id,
          orderNo: normalizedOrderNo,
          isPayment: false,
          payUrl: undefined,
          message: status === 'paid'
            ? '支付已确认，服务已进入待审核与待履约流程。'
            : '提交成功！当前配置无需支付。',
        }));
        setPayPollingOrderNo('');
      } else if (status === 'closed') {
        setSubmitResult((prev) => ({
          success: false,
          id: data.submissionId ? String(data.submissionId) : prev?.id,
          orderNo: normalizedOrderNo,
          isPayment: false,
          payUrl: undefined,
          message: '支付订单已关闭，请重新提交并创建订单。',
        }));
        setPayPollingOrderNo('');
      }
      return status;
    } catch (error) {
      debugLog.error('查询支付状态失败:', error);
      return '';
    }
  }, []);

  useEffect(() => {
    fetchSubmissionConfig();
    fetchCategories();
    fetchBannerPositionOptions();
  }, [fetchBannerPositionOptions, fetchCategories, fetchSubmissionConfig]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - draft.savedAt < sevenDays) {
          const selectedAddons = Array.isArray(draft.selectedAddons)
            ? draft.selectedAddons.filter((item): item is AddonKey => item === 'top_recommendation' || item === 'banner_slot')
            : [];
          const bannerPositions = Array.isArray(draft.bannerPositions)
            ? Array.from(new Set(
              draft.bannerPositions
                .map((item) => normalizeBannerPosition(item))
                .filter(Boolean)
            ))
            : [];
          setFormData({
            ...DEFAULT_FORM_DATA,
            ...draft,
            serviceType: 'submission',
            selectedAddons,
            bannerPositions: selectedAddons.includes('banner_slot') ? bannerPositions : [],
          });
          setIconUrl(draft.iconUrl || '');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      debugLog.error('加载草稿失败:', error);
    }
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!shouldRequirePayment) return;
    const exists = availablePayChannels.some((item) => item.value === payChannel);
    if (!exists && availablePayChannels.length > 0) {
      setPayChannel(availablePayChannels[0].value);
    }
  }, [availablePayChannels, payChannel, shouldRequirePayment]);

  /**
   * 支付回跳后自动识别订单号，避免用户回到页面后不知道是否已经支付成功。
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const orderNo = String(params.get('orderNo') || params.get('out_trade_no') || '').trim();
    const payResult = String(params.get('payResult') || params.get('trade_status') || params.get('result') || '').trim();
    if (!orderNo) return;
    setSubmitResult({
      success: true,
      orderNo,
      isPayment: true,
      message: payResult
        ? '已返回网站，正在确认支付结果...'
        : '已识别支付订单，正在确认支付结果...',
    });
    setPayPollingOrderNo(orderNo);
    refreshPayOrderStatus(orderNo);
    navigate(`${location.pathname}${location.hash || ''}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate, refreshPayOrderStatus]);

  /**
   * 创建支付订单后在当前页面轮询状态，支付成功自动进入个人中心可追踪的记录状态。
   */
  useEffect(() => {
    const orderNo = String(payPollingOrderNo || '').trim();
    if (!orderNo) return undefined;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      const status = await refreshPayOrderStatus(orderNo);
      if (cancelled || [ 'paid', 'free', 'closed' ].includes(status) || attempts >= 40) {
        return;
      }
      timer = window.setTimeout(poll, attempts <= 3 ? 2500 : 5000);
    };
    timer = window.setTimeout(poll, 2500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [payPollingOrderNo, refreshPayOrderStatus]);

  useEffect(() => {
    const allowedAddonKeys = new Set(addonOptions.map((item) => item.key as AddonKey));
    setFormData((prev) => {
      const nextAddons = prev.selectedAddons.filter((item) => allowedAddonKeys.has(item));
      if (nextAddons.length === prev.selectedAddons.length) return prev;
      return {
        ...prev,
        selectedAddons: nextAddons,
        bannerPositions: nextAddons.includes('banner_slot') ? prev.bannerPositions : [],
      };
    });
  }, [addonOptions]);

  /**
   * 免费模式收口为简版投稿，自动清除草稿里残留的加购项和 Banner 位置。
   */
  useEffect(() => {
    if (!useSimpleFreeFlow) return;
    setFormData((prev) => {
      if (prev.selectedAddons.length === 0 && prev.bannerPositions.length === 0) return prev;
      return {
        ...prev,
        selectedAddons: [],
        bannerPositions: [],
      };
    });
  }, [useSimpleFreeFlow]);

  /**
   * 保存草稿，避免用户关闭页面后内容丢失。
   */
  const saveDraft = useCallback(() => {
    const draft: DraftData = {
      ...formData,
      iconUrl,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      debugLog.error('保存草稿失败:', error);
    }
  }, [formData, iconUrl]);

  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(saveDraft, 500);
    return () => clearTimeout(timer);
  }, [draftLoaded, formData, iconUrl, saveDraft]);

  /**
   * 清除本地草稿，提交成功后调用。
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      debugLog.error('清除草稿失败:', error);
    }
  }, []);
  /**
   * 判断当前链接是否为外部地址，便于关闭态按钮安全跳转。
   */
  const isExternalLink = useCallback((value: string): boolean => /^(https?:)?\/\//i.test(String(value || '').trim()), []);

  /**
   * 检查网址是否已存在，提交站点场景默认禁止重复收录。
   */
  const checkUrlExists = useCallback(async (url: string) => {
    if (!url || !url.startsWith('http')) {
      setUrlCheckResult({ checking: false, exists: false });
      return;
    }
    setUrlCheckResult((prev) => ({ ...prev, checking: true }));
    try {
      const res = await api.get('/submissions/check-url', { params: { url } });
      const data = unwrapApiResponse<{
        exists?: boolean;
        type?: 'website' | 'pending';
        message?: string;
        website?: { id?: string; name?: string; url?: string };
      }>(res.data, {});
      setUrlCheckResult({
        checking: false,
        exists: Boolean(data.exists),
        type: data.type,
        message: data.message,
        website: data.website
          ? {
              name: String(data.website.name || ''),
              url: String(data.website.url || ''),
            }
          : undefined,
      });
    } catch (error) {
      debugLog.error('检查URL失败:', error);
      setUrlCheckResult({ checking: false, exists: false });
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(() => {
      checkUrlExists(formData.url);
    }, 800);
    return () => clearTimeout(timer);
  }, [checkUrlExists, draftLoaded, formData.url]);

  /**
   * 统一处理表单字段变更。
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'url') {
      setUrlCheckResult({ checking: false, exists: false });
      setAllowDuplicateSubmit(false);
    }
  };

  /**
   * 处理分类切换。
   */
  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => ({ ...prev, categoryId }));
  };

  /**
   * 切换加购项，支持同时勾选多个运营位。
   */
  const handleAddonToggle = (addonKey: AddonKey) => {
    setFormData((prev) => {
      const exists = prev.selectedAddons.includes(addonKey);
      const nextAddons = exists
        ? prev.selectedAddons.filter((item) => item !== addonKey)
        : [ ...prev.selectedAddons, addonKey ];
      return {
        ...prev,
        selectedAddons: nextAddons,
        bannerPositions: nextAddons.includes('banner_slot') ? prev.bannerPositions : [],
      };
    });
    setSubmitResult(null);
  };

  /**
   * 切换 Banner 投放位置，支持多位置同时投放。
   */
  const handleBannerPositionToggle = (position: string) => {
    const normalized = normalizeBannerPosition(position);
    if (!normalized) return;
    setFormData((prev) => {
      const exists = prev.bannerPositions.includes(normalized);
      return {
        ...prev,
        bannerPositions: exists
          ? prev.bannerPositions.filter((item) => item !== normalized)
          : [ ...prev.bannerPositions, normalized ],
      };
    });
  };

  /**
   * 一键选中全部详情页广告位。
   */
  const handleSelectAllDetailBannerPositions = () => {
    const detailPositions = bannerPositionOptions
      .map((item) => normalizeBannerPosition(item.value))
      .filter((value) => getBannerPositionGroupKey(value) === 'detail');
    const uniqueDetailPositions = Array.from(new Set(detailPositions));
    setFormData((prev) => ({
      ...prev,
      bannerPositions: uniqueDetailPositions,
    }));
  };

  /**
   * 清空已选择的 Banner 投放位置。
   */
  const handleClearBannerPositions = () => {
    setFormData((prev) => ({
      ...prev,
      bannerPositions: [],
    }));
  };

  /**
   * 获取站点图标，走后台 Favicon API。
   */
  const handleFetchIcon = async () => {
    if (!formData.url) return;
    setFetchingIcon(true);
    try {
      const res = await api.get('/favicon-api/fetch', { params: { url: formData.url } });
      const data = unwrapApiResponse<IconFetchPayload>(res.data, {});
      setIconUrl(data.faviconUrl || '');
    } catch (error) {
      debugLog.error('获取图标失败:', error);
    } finally {
      setFetchingIcon(false);
    }
  };

  /**
   * 使用 AI 自动填写站点标题、描述与标签。
   */
  const handleAiGenerate = async () => {
    if (!formData.url) return;
    setGeneratingAi(true);
    try {
      const res = await api.post('/ai-config/generate-website-info', { url: formData.url });
      const data = unwrapApiResponse<AiGeneratePayload>(res.data, {});
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        tags: data.tags || prev.tags,
      }));
      if (!iconUrl) {
        await handleFetchIcon();
      }
    } catch (error) {
      debugLog.error('AI 生成失败:', error as AxiosError<{ error?: string }>);
    } finally {
      setGeneratingAi(false);
    }
  };

  /**
   * 构建提交/下单所需 payload，统一普通提交和支付订单入参。
   */
  const buildSubmitPayload = useCallback(() => {
    const entryMode = useSimpleFreeFlow ? 'free_submission' : 'commercial_service';
    const selectedAddons = useSimpleFreeFlow ? [] : formData.selectedAddons;
    const bannerPositions = useSimpleFreeFlow ? [] : formData.bannerPositions;
    const addonPlan = getAddonPlanLabel(
      selectedAddons,
      addonOptions,
      useSimpleFreeFlow ? '网站收录' : '基础收录',
    );
    return {
      entryMode,
      serviceType: 'submission' as const,
      name: formData.name.trim(),
      description: formData.description.trim(),
      url: formData.url.trim(),
      categoryId: formData.categoryId || undefined,
      tags: formData.tags.trim(),
      submitterName: formData.submitterName.trim(),
      submitterEmail: formData.submitterEmail.trim(),
      iconUrl: iconUrl || undefined,
      allowDuplicate: allowDuplicateSubmit,
      serviceMeta: {
        entryMode,
        plan: addonPlan || formData.promotionPlan || (useSimpleFreeFlow ? '网站收录' : '基础收录'),
        budget: formData.promotionBudget.trim(),
        target: formData.promotionTarget.trim(),
        contact: formData.promotionContact.trim(),
        addons: selectedAddons,
        bannerPositions,
      },
    };
  }, [addonOptions, allowDuplicateSubmit, formData, iconUrl, useSimpleFreeFlow]);

  /**
   * 提交动作：有价格走支付订单，无价格则直接提交。
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmissionClosed) {
      setSubmitResult({ success: false, message: '基础提交服务暂未开放' });
      return;
    }
    if (!formData.name.trim() || !formData.url.trim()) {
      setSubmitResult({ success: false, message: '请填写网站名称和URL' });
      return;
    }
    if (urlCheckResult.exists && !allowDuplicateSubmit) {
      setSubmitResult({ success: false, message: '该网址疑似已存在，请勾选“允许重复提交”后继续' });
      return;
    }
    if (formData.selectedAddons.length > 0 && !formData.promotionContact.trim()) {
      setSubmitResult({ success: false, message: '勾选运营加购后，请填写联系方式' });
      return;
    }
    if (formData.selectedAddons.includes('banner_slot') && formData.bannerPositions.length === 0) {
      setSubmitResult({ success: false, message: '购买 Banner 位时，请至少选择一个投放位置' });
      return;
    }
    if (requiresCommercialAddon) {
      setSubmitResult({
        success: false,
        message: addonOptions.length > 0
          ? '收录与增值服务页至少需要选择一个置顶推荐或 Banner 增值服务；免费收录请使用 /submit。'
          : '当前未开启增值服务，请先到后台开启加购项或将基础服务切换为付费模式。',
      });
      return;
    }
    if (shouldRequirePayment && !submissionConfig.payment.enabled) {
      setSubmitResult({ success: false, message: '支付通道未开启，请联系管理员' });
      return;
    }
    if (shouldRequirePayment && availablePayChannels.length === 0) {
      setSubmitResult({ success: false, message: '当前没有可用支付方式，请联系管理员' });
      return;
    }

    let preOpenedPayWindow: Window | null = null;
    if (shouldRequirePayment) {
      /**
       * 先预开支付窗口，降低浏览器对异步 window.open 的拦截概率。
       */
      preOpenedPayWindow = preOpenPayWindow();
    }
    setLoading(true);
    try {
      if (shouldRequirePayment) {
        const res = await api.post('/submissions/pay/create', {
          ...buildSubmitPayload(),
          payChannel,
        });
        const data = unwrapApiResponse<SubmissionPayOrderPayload>(res.data, {});
        clearDraft();
        const payUrl = String(data.payUrl || '').trim();
        let opened = false;
        if (payUrl) {
          if (preOpenedPayWindow && !preOpenedPayWindow.closed) {
            preOpenedPayWindow.location.href = payUrl;
            opened = true;
          } else {
            opened = openPayWindow(payUrl);
          }
        }
        if (preOpenedPayWindow && !preOpenedPayWindow.closed && !opened) {
          preOpenedPayWindow.close();
        }
        setSubmitResult({
          success: true,
          id: data.submissionId ? String(data.submissionId) : undefined,
          orderNo: data.orderNo ? String(data.orderNo) : undefined,
          payUrl: payUrl || undefined,
          isPayment: data.status !== 'free',
          message: data.status === 'free'
            ? '提交成功！当前配置无需支付。'
            : (opened
              ? '支付订单已创建，已为您打开支付页面，请完成付款。'
              : '支付订单已创建，请点击“继续支付”完成付款。'),
        });
        if (data.orderNo && data.status !== 'free') {
          setPayPollingOrderNo(String(data.orderNo));
        }
        return;
      }

      const res = await api.post('/submissions', buildSubmitPayload());
      const data = unwrapApiResponse<SubmissionPayload>(res.data, {});
      clearDraft();
      setSubmitResult({
        success: true,
        id: data.id ? String(data.id) : undefined,
        message: '提交成功！我们会尽快审核并完成收录。',
      });
    } catch (error) {
      setSubmitResult({
        success: false,
        message: getApiErrorMessage(error, '提交失败，请稍后重试'),
      });
      if (preOpenedPayWindow && !preOpenedPayWindow.closed) {
        preOpenedPayWindow.close();
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置表单并清空结果态。
   */
  const handleReset = () => {
    setFormData({ ...DEFAULT_FORM_DATA });
    setIconUrl('');
    setSubmitResult(null);
    setUrlCheckResult({ checking: false, exists: false });
    setAllowDuplicateSubmit(false);
    clearDraft();
  };

  /**
   * 继续支付。
   */
  const handleContinuePay = () => {
    if (!submitResult?.payUrl) return;
    openPayWindow(submitResult.payUrl);
  };

  return (
    <div className={`submit-page submit-page--layout-${layoutWidthMode} submit-page--mode-${useSimpleFreeFlow ? 'free' : 'paid'}`}>
      <SEO
        title={useSimpleFreeFlow
          ? displayPageTitle
          : `收录与增值服务 - ${displayPageTitle}`}
        description={useSimpleFreeFlow
          ? '向UIED设计导航提交优质网站，完善站点资料后进入人工审核与基础收录流程。'
          : (submissionConfig.pageDescription || '收录与增值服务，支持置顶推荐、Banner 推广与商业投放。')}
        keywords={useSimpleFreeFlow ? '网站收录,网站投稿,网址提交' : '网站收录,商业投放,置顶推荐,Banner推广'}
      />

      <div className={`submit-page__hero ${useSimpleFreeFlow ? 'submit-page__hero--simple' : 'submit-page__hero--detail'}`} style={layoutStyle}>
        <div className="submit-page__hero-main">
          {!useSimpleFreeFlow ? (
            <div className="submit-page__kicker-row">
              <p className="submit-page__kicker">{submissionConfig.pageEyebrow || 'Website Submission'}</p>
              <span className="submit-page__mode-badge">
                收录与增值服务
              </span>
            </div>
          ) : null}
          <h1>{displayPageTitle}</h1>
          <p className="submit-page__hero-desc">
            {submissionConfig.pageSubtitle || submissionConfig.pageDescription}
          </p>
          {!useSimpleFreeFlow && heroHighlights.length > 0 ? (
            <div className="submit-page__hero-tags">
              {heroHighlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
          <div className="submit-page__hero-actions">
            {isSubmissionClosed ? (
              <a
                className="submit-page__hero-primary"
                href={submissionConfig.closedButtonUrl || '/'}
                target={isExternalLink(submissionConfig.closedButtonUrl || '') ? '_blank' : undefined}
                rel={isExternalLink(submissionConfig.closedButtonUrl || '') ? 'noopener noreferrer' : undefined}
              >
                {submissionConfig.closedButtonText || '返回首页'}
              </a>
            ) : useSimpleFreeFlow ? (
              <>
                <a className="submit-page__hero-primary" href={isFreeEntryUnavailable ? '/submit/services' : '#submit-form'}>
                  {submitModePresentation.heroActionText}
                </a>
                <Link className="submit-page__back-link" to={isFreeEntryUnavailable ? '/' : '/submit/services'}>
                  {isFreeEntryUnavailable ? '返回首页' : '收录与增值服务'}
                </Link>
              </>
            ) : (
              <>
                <a className="submit-page__hero-primary" href="#submit-form">
                  {submitModePresentation.heroActionText}
                </a>
                <Link className="submit-page__back-link" to="/submit">
                  网站收录
                </Link>
              </>
            )}
          </div>
        </div>

        {!useSimpleFreeFlow ? (
          <div className="submit-page__hero-panel">
            <div className="submit-page__hero-total">
              <span className="submit-page__hero-total-label">{heroTotalLabel}</span>
              <strong>{heroTotalValue}</strong>
              <p>
                {isSubmissionClosed
                  ? (submissionConfig.closedDescription || '当前暂不接受新的提交申请。')
                  : getAddonPlanLabel(
                    formData.selectedAddons,
                    addonOptions,
                    useSimpleFreeFlow ? '免费提交' : '收录服务',
                  )}
              </p>
            </div>
            <div className="submit-page__hero-stats">
              {heroStats.map((item) => (
                <div key={item.label} className="submit-page__stat">
                  <span className="submit-page__stat-label">{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className={`submit-page__shell ${useSimpleFreeFlow ? 'submit-page__shell--simple' : ''}`} style={layoutStyle}>
        {configLoading ? (
          <div className="submit-page__state">正在加载投稿配置...</div>
        ) : isSubmissionClosed ? (
          <div className="submit-page__closed">
            <span className="submit-page__closed-badge">SERVICE CLOSED</span>
            <h2>{submissionConfig.closedTitle || '投稿服务暂未开放'}</h2>
            <p>{submissionConfig.closedDescription || '请稍后再试，或联系站点运营团队获取开放时间。'}</p>
            <a
              className="btn-primary"
              href={submissionConfig.closedButtonUrl || '/'}
              target={isExternalLink(submissionConfig.closedButtonUrl || '') ? '_blank' : undefined}
              rel={isExternalLink(submissionConfig.closedButtonUrl || '') ? 'noopener noreferrer' : undefined}
            >
              <Icons.Home />
              <span>{submissionConfig.closedButtonText || '返回首页'}</span>
            </a>
          </div>
        ) : (
          <>
            <div className={`submit-page__main ${useSimpleFreeFlow ? 'submit-page__main--simple' : ''}`}>
              {isFreeEntryUnavailable ? (
                <div className="submit-page__state submit-page__state--service-link">
                  <strong>{submitModeSummary.title}</strong>
                  <p>{submitModeSummary.description}</p>
                  <div className="submit-page__state-actions">
                    <Link className="btn-primary" to="/submit/services">
                      <Icons.Megaphone />
                      <span>前往收录与增值服务</span>
                    </Link>
                    <Link className="btn-secondary" to="/">
                      <Icons.Home />
                      <span>返回首页</span>
                    </Link>
                  </div>
                </div>
              ) : !useSimpleFreeFlow ? (
                <section className={`submit-mode-overview submit-mode-overview--${submitService.mode}`}>
                  <div className="submit-block-header">
                    <h2>{submitModePresentation.overviewTitle}</h2>
                    <p>{submitModePresentation.overviewDescription}</p>
                  </div>
                  <div className="submit-mode-overview__grid">
                    {submitModePresentation.overviewItems.map((item, index) => (
                      <article key={`${item}-${index}`} className="submit-mode-overview__item">
                        <span className="submit-mode-overview__index">{String(index + 1).padStart(2, '0')}</span>
                        <p>{item}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {!useSimpleFreeFlow ? (
              <section className="submit-service-card">
                <div className="submit-block-header">
                  <h2>{displaySectionCopy.pricingTitle}</h2>
                  <p>{submitModePresentation.pricingDescription}</p>
                </div>

                <article className="submit-service-card__base">
                  <div className="submit-service-card__head">
                    <span className="submit-service-card__icon">
                      <Icons.Submit />
                    </span>
                    <div>
                      <div className="submit-service-card__eyebrow">
                        {submitService.badge || '基础服务'} · 收录与增值服务
                      </div>
                        <h3>{commercialBaseTitle}</h3>
                    </div>
                  </div>
                    <p className="submit-service-card__desc">{commercialBaseDescription}</p>
                  <div className={`submit-service-card__mode-note ${isFreeSubmitMode ? 'is-free' : 'is-paid'}`}>
                    <strong>{submitModeSummary.title}</strong>
                    <p>{submitModeSummary.description}</p>
                  </div>
                  <div className="submit-service-card__price">
                      <strong>{commercialBasePriceText}</strong>
                      {!isFreeSubmitMode && submitService.originalPrice > submitService.price ? (
                        <span>{formatPrice(submitService.originalPrice)}</span>
                      ) : null}
                  </div>
                  <ul className="submit-feature-list">
                    {submitService.highlights.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </article>

                {!useSimpleFreeFlow && addonOptions.length > 0 ? (
                  <div className="submit-addon-grid">
                    {addonOptions.map((addon) => {
                      const active = formData.selectedAddons.includes(addon.key as AddonKey);
                      return (
                        <button
                          key={addon.key}
                          type="button"
                          className={`submit-addon-card ${active ? 'is-active' : ''}`}
                          onClick={() => handleAddonToggle(addon.key as AddonKey)}
                        >
                          <div className="submit-addon-card__head">
                            <span className="submit-addon-card__icon">
                              {addon.key === 'banner_slot' ? <Icons.Megaphone /> : <Icons.Growth />}
                            </span>
                            <div className="submit-addon-card__title">
                              <strong>{addon.title}</strong>
                              <span>{addon.badge}</span>
                            </div>
                            <span className="submit-addon-card__toggle">
                              {active ? '已加购' : '点击加购'}
                            </span>
                          </div>
                          <p>{addon.description}</p>
                          <div className="submit-addon-card__price">
                            <strong>{formatPrice(addon.price)}</strong>
                            {addon.originalPrice > addon.price ? (
                              <span>{formatPrice(addon.originalPrice)}</span>
                            ) : null}
                          </div>
                          <div className="submit-addon-card__tags">
                            {addon.highlights.slice(0, 3).map((text) => (
                              <span key={text}>{text}</span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
              ) : null}

              {!useSimpleFreeFlow && processSteps.length > 0 ? (
                <section className="submit-process">
                  <div className="submit-block-header">
                    <h2>{displaySectionCopy.processTitle}</h2>
                    <p>{submissionConfig.processDescription || submitModePresentation.processDescription}</p>
                  </div>
                  <div className="submit-process__grid">
                    {processSteps.map((item, index) => (
                      <article key={`${item.title}-${index}`} className="submit-process__item">
                        <span className="submit-process__index">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <h3>{item.title}</h3>
                          <p>{item.description}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {!isFreeEntryUnavailable ? (submitResult ? (
                <div className={`submit-result-card ${submitResult.success ? 'success' : 'error'}`}>
                  <div className="result-icon">
                    {submitResult.success ? <Icons.Success /> : <Icons.Error />}
                  </div>
                  <h2>{submitResult.success ? '提交成功' : '提交失败'}</h2>
                  <p>{submitResult.message}</p>
                  {submitResult.id ? <p className="result-id">提交编号：{submitResult.id}</p> : null}
                  {submitResult.orderNo ? <p className="result-id">支付订单：{submitResult.orderNo}</p> : null}
                  <div className="result-actions">
                    {submitResult.success ? (
                      <>
                        <button className="btn-secondary" onClick={handleReset}>
                          <Icons.Plus />
                          <span>继续提交</span>
                        </button>
                        <button className="btn-secondary" onClick={() => navigate('/profile/submissions')}>
                          <Icons.Megaphone />
                          <span>查看我的投放</span>
                        </button>
                        <button className="btn-secondary" onClick={() => navigate('/profile/orders')}>
                          <Icons.Submit />
                          <span>查看我的订单</span>
                        </button>
                        {submitResult.payUrl ? (
                          <button className="btn-primary" onClick={handleContinuePay}>
                            <Icons.Rocket />
                            <span>继续支付</span>
                          </button>
                        ) : (
                          <button className="btn-primary" onClick={() => navigate('/')}>
                            <Icons.Home />
                            <span>返回首页</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <button className="btn-primary" onClick={() => setSubmitResult(null)}>
                        <Icons.Refresh />
                        <span>重新填写</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form id="submit-form" className="submit-form" onSubmit={handleSubmit}>
                  <div className="form-section">
                    <div className="section-title">
                      <span className="step-number">1</span>
                      <h3>网站地址</h3>
                    </div>
                    <div className="form-group">
                      <label htmlFor="url">
                        网站URL <span className="required">*</span>
                      </label>
                      <div className="input-with-button">
                        <input
                          type="url"
                          id="url"
                          name="url"
                          value={formData.url}
                          onChange={handleChange}
                          placeholder="https://example.com"
                          className={urlCheckResult.exists ? 'has-error' : ''}
                          required
                        />
                        <button
                          type="button"
                          className="btn-ai"
                          onClick={handleAiGenerate}
                          disabled={generatingAi || !formData.url || urlCheckResult.exists}
                        >
                          {generatingAi ? (
                            <span className="loading-text">分析中</span>
                          ) : (
                            <>
                              <Icons.AI />
                              <span>AI智能填写</span>
                            </>
                          )}
                        </button>
                      </div>
                      {urlCheckResult.checking ? (
                        <p className="form-hint checking">
                          <span className="checking-dot" />
                          正在检查网址...
                        </p>
                      ) : urlCheckResult.exists ? (
                        <div className="url-exists-warning">
                          <Icons.Info />
                          <span>
                            {urlCheckResult.message || '该网址已存在'}
                            {urlCheckResult.website ? <>：<strong>{urlCheckResult.website.name}</strong></> : null}
                          </span>
                        </div>
                      ) : formData.url && formData.url.startsWith('http') ? (
                        <p className="form-hint success">
                          <Icons.Check />
                          该网址可以提交
                        </p>
                      ) : (
                        <p className="form-hint">输入网站地址后，可直接使用 AI 自动补全站点信息</p>
                      )}
                      {urlCheckResult.exists ? (
                        <label className="duplicate-submit-confirm">
                          <input
                            type="checkbox"
                            checked={allowDuplicateSubmit}
                            onChange={(event) => setAllowDuplicateSubmit(event.target.checked)}
                          />
                          <span>允许重复提交（进入人工复核，不保证收录）</span>
                        </label>
                      ) : null}
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="section-title">
                      <span className="step-number">2</span>
                      <h3>站点信息</h3>
                    </div>

                    <div className="form-group icon-group">
                      <label>网站图标</label>
                      <div className="icon-preview">
                        {iconUrl ? (
                          <img src={iconUrl} alt="网站图标" className="icon-img" />
                        ) : (
                          <div className="icon-placeholder">
                            <Icons.Globe />
                          </div>
                        )}
                        <div className="icon-actions">
                          <button
                            type="button"
                            className="btn-text"
                            onClick={handleFetchIcon}
                            disabled={fetchingIcon || !formData.url}
                          >
                            <Icons.Refresh />
                            <span>{fetchingIcon ? '获取中...' : '获取图标'}</span>
                          </button>
                          {iconUrl ? (
                            <button type="button" className="btn-text danger" onClick={() => setIconUrl('')}>
                              <Icons.X />
                              <span>清除</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="name">
                          网站名称 <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="如：Dribbble"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>所属分类</label>
                        <CategorySelect
                          categories={categories}
                          value={formData.categoryId}
                          onChange={handleCategoryChange}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="description">网站描述</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="简要描述这个网站的功能和特点（50-200字为佳）"
                        rows={4}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="tags">标签</label>
                      <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="多个标签用逗号分隔，如：设计, 灵感, UI"
                      />
                      <p className="form-hint">添加标签有助于用户更快找到这个网站</p>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="section-title">
                      <span className="step-number">3</span>
                      <h3>{displaySectionCopy.operationSectionTitle}</h3>
                    </div>

                    {useSimpleFreeFlow ? (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="submitterName">您的称呼</label>
                            <input
                              type="text"
                              id="submitterName"
                              name="submitterName"
                              value={formData.submitterName}
                              onChange={handleChange}
                              placeholder="可选"
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="submitterEmail">您的邮箱</label>
                            <input
                              type="email"
                              id="submitterEmail"
                              name="submitterEmail"
                              value={formData.submitterEmail}
                              onChange={handleChange}
                              placeholder="可选，方便同步审核结果"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="promotionContact">联系方式</label>
                          <input
                            type="text"
                            id="promotionContact"
                            name="promotionContact"
                            value={formData.promotionContact}
                            onChange={handleChange}
                            placeholder="微信 / 手机 / 邮箱，可选"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="promotionTarget">补充说明</label>
                          <textarea
                            id="promotionTarget"
                            name="promotionTarget"
                            value={formData.promotionTarget}
                            onChange={handleChange}
                            placeholder="可选，填写站点特色、补充信息或收录说明"
                            rows={3}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="promotionPlan">投放方向</label>
                            <select
                              id="promotionPlan"
                              name="promotionPlan"
                              value={formData.promotionPlan}
                              onChange={handleChange}
                            >
                              <option value="standard">标准收录</option>
                              <option value="launch">新品上线</option>
                              <option value="campaign">活动推广</option>
                              <option value="custom">定制沟通</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label htmlFor="promotionBudget">预算说明</label>
                            <input
                              type="text"
                              id="promotionBudget"
                              name="promotionBudget"
                              value={formData.promotionBudget}
                              onChange={handleChange}
                              placeholder="例如：2k-5k / 本期"
                            />
                          </div>
                        </div>

                        {formData.selectedAddons.includes('banner_slot') ? (
                          <div className="form-group">
                            <label>
                              Banner 投放位置 <span className="required">*</span>
                            </label>
                            <div className="banner-position-toolbar">
                              <div className="banner-position-search">
                                <Icons.Search />
                                <input
                                  type="text"
                                  value={bannerPositionKeyword}
                                  onChange={(event) => setBannerPositionKeyword(event.target.value)}
                                  placeholder="搜索投放位置..."
                                />
                                {bannerPositionKeyword ? (
                                  <button
                                    type="button"
                                    className="banner-position-search__clear"
                                    onClick={() => setBannerPositionKeyword('')}
                                  >
                                    <Icons.X />
                                  </button>
                                ) : null}
                              </div>
                              <div className="banner-position-actions">
                                <button type="button" className="btn-text" onClick={handleSelectAllDetailBannerPositions}>
                                  选中全部详情位
                                </button>
                                <button type="button" className="btn-text danger" onClick={handleClearBannerPositions}>
                                  清空已选
                                </button>
                              </div>
                            </div>
                            <div className="banner-position-picker">
                              {bannerPositionGroups.length > 0 ? (
                                bannerPositionGroups.map((group) => (
                                  <section key={group.key} className="banner-position-group">
                                    <div className="banner-position-group__title">{group.title}</div>
                                    <div className="banner-position-group__chips">
                                      {group.items.map((item) => {
                                        const active = formData.bannerPositions.includes(item.value);
                                        return (
                                          <button
                                            key={item.value}
                                            type="button"
                                            className={`banner-position-chip ${active ? 'is-active' : ''}`}
                                            onClick={() => handleBannerPositionToggle(item.value)}
                                          >
                                            {item.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </section>
                                ))
                              ) : (
                                <div className="banner-position-empty">没有匹配的位置，请修改关键词。</div>
                              )}
                            </div>
                            {bannerPositionLoading ? (
                              <p className="form-hint checking">
                                <span className="checking-dot" />
                                正在同步广告位配置...
                              </p>
                            ) : (
                              <p className="form-hint">位置来源于后台广告管理，可多选。</p>
                            )}
                          </div>
                        ) : null}

                        <div className="form-group">
                          <label htmlFor="promotionTarget">运营备注</label>
                          <textarea
                            id="promotionTarget"
                            name="promotionTarget"
                            value={formData.promotionTarget}
                            onChange={handleChange}
                            placeholder="如：希望投放首页 Banner、分类频道、活动时间等"
                            rows={3}
                          />
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="submitterName">您的称呼</label>
                            <input
                              type="text"
                              id="submitterName"
                              name="submitterName"
                              value={formData.submitterName}
                              onChange={handleChange}
                              placeholder="可选"
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="submitterEmail">您的邮箱</label>
                            <input
                              type="email"
                              id="submitterEmail"
                              name="submitterEmail"
                              value={formData.submitterEmail}
                              onChange={handleChange}
                              placeholder="可选，方便同步审核结果"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="promotionContact">
                            联系方式{formData.selectedAddons.length > 0 ? <span className="required">*</span> : null}
                          </label>
                          <input
                            type="text"
                            id="promotionContact"
                            name="promotionContact"
                            value={formData.promotionContact}
                            onChange={handleChange}
                            placeholder="微信 / 手机 / 邮箱"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
                      <Icons.ArrowLeft />
                      <span>取消</span>
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading || (urlCheckResult.exists && !allowDuplicateSubmit)}
                    >
                      {loading ? (
                        <span className="loading-text">提交中</span>
                      ) : (
                        <>
                          <Icons.Rocket />
                          <span>{submitActionText}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )) : null}

              {!isFreeEntryUnavailable && !useSimpleFreeFlow && faqItems.length > 0 ? (
                <section className="submit-faq">
                  <div className="submit-block-header">
                    <h2>{submissionConfig.faqTitle || '常见问题'}</h2>
                  </div>
                  <div className="submit-faq-list">
                    {faqItems.map((item, index) => (
                      <details key={`${item.question}-${index}`} className="submit-faq-item">
                        <summary>{item.question}</summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}

              {!isFreeEntryUnavailable && useSimpleFreeFlow && submitNotices.length > 0 ? (
                <section className="submit-compact-notes">
                  <div className="submit-compact-notes__head">
                    <h2>{displaySectionCopy.submitNoticeTitle || '网站收录说明'}</h2>
                    <Link to="/submit/services">如需加急曝光，前往收录与增值服务</Link>
                  </div>
                  <ul className="submit-compact-notes__list">
                    {submitNotices.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {!useSimpleFreeFlow ? (
              <aside className="submit-page__aside">
                <section className="submit-summary">
                  <div className="submit-summary__head">
                    <span className="submit-summary__eyebrow">{submitModePresentation.summaryEyebrow}</span>
                    <h3>{submitModePresentation.summaryTitle}</h3>
                  </div>

                  <div className="submit-summary__line">
                      <span>{commercialBaseTitle}</span>
                      <strong>{commercialBasePriceText}</strong>
                  </div>

                  {selectedAddonOptions.map((item) => (
                    <div key={item.key} className="submit-summary__line is-addon">
                      <span>{item.title}</span>
                      <strong>{formatPrice(item.price)}</strong>
                    </div>
                  ))}

                  {formData.bannerPositions.length > 0 ? (
                    <div className="submit-summary__line submit-summary__line--stack">
                      <span>Banner 投放位</span>
                      <div className="submit-summary__chips">
                        {formData.bannerPositions.map((position) => (
                          <span key={position}>{getBannerPositionLabel(position)}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedAddonOptions.length === 0 ? (
                    <div className="submit-summary__empty">{submitModePresentation.summaryEmptyText}</div>
                  ) : null}

                  <div className="submit-summary__total">
                    <span>合计</span>
                    <strong>{formatPrice(totalPrice)}</strong>
                  </div>

                  {shouldRequirePayment ? (
                    <div className="submit-summary__payment">
                      <div className="submit-summary__mode-tip">{submitModeSummary.description}</div>
                      <div className="submit-summary__payment-title">支付方式</div>
                      <div className="pay-channel-group">
                        {paymentChannelOptions.map((channel) => (
                          <label
                            key={channel.value}
                            className={`pay-channel-item pay-channel-item--${channel.value} ${payChannel === channel.value ? 'is-active' : ''} ${channel.enabled ? '' : 'is-disabled'}`}
                          >
                            <input
                              type="radio"
                              name="payChannel"
                              value={channel.value}
                              checked={payChannel === channel.value}
                              disabled={!channel.enabled}
                              onChange={() => setPayChannel(channel.value)}
                            />
                            <span className={`pay-channel-item__logo pay-channel-item__logo--${channel.value}`}>
                              {channel.value === 'alipay' ? <Icons.Alipay /> : <Icons.WechatPay />}
                            </span>
                            <span className="pay-channel-item__meta">
                              <span className="pay-channel-item__name">{channel.label}</span>
                              <span className="pay-channel-item__desc">{channel.desc}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {!submissionConfig.payment.enabled ? (
                        <p className="form-hint">支付功能尚未开放，请联系管理员。</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="submit-summary__free">{submitModeSummary.description}</div>
                  )}
                </section>
                {submitNotices.length > 0 ? (
                  <section className="submit-tips">
                    <div className="tips-header">
                      <Icons.Info />
                      <h4>{displaySectionCopy.submitNoticeTitle}</h4>
                    </div>
                    <ul>
                      {submitNotices.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </aside>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default SubmitPage;
