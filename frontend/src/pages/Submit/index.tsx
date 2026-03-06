/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.03.06
 *
 * @file Submit/index.tsx
 * @description 网站提交页面 - 用户提交网站到导航站
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { unwrapApiList, unwrapApiResponse } from '../../utils/apiResponse';
import { debugLog } from '../../utils/debugHelper';
import SEO from '../../components/SEO';
import './index.css';

const STORAGE_KEY = 'submit_form_draft';
type ServiceType = 'ai_growth' | 'paid_boost';

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
  payChannel?: 'alipay' | 'wechat';
  amount?: number;
  status?: 'created' | 'paid' | 'free';
  payUrl?: string;
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
  key?: ServiceType;
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

interface SubmissionPublicConfig {
  enabled: boolean;
  pageTitle: string;
  pageSubtitle: string;
  pageDescription: string;
  containerMaxWidth: number;
  pricingTitle: string;
  faqTitle: string;
  aiGrowthService: SubmissionServiceItemConfig;
  paidBoostService: SubmissionServiceItemConfig;
  faqItems: SubmissionFaqItem[];
  payment: {
    enabled: boolean;
    allowAlipay: boolean;
    allowWechat: boolean;
  };
}

const DEFAULT_SUBMISSION_PUBLIC_CONFIG: SubmissionPublicConfig = {
  enabled: true,
  pageTitle: '提交网站',
  pageSubtitle: 'AI产品提交及增长服务 / 付费加热推广产品',
  pageDescription: '提交优质站点并选择合适的增长方案，审核与投放流程统一收口。',
  containerMaxWidth: 1200,
  pricingTitle: '服务方案',
  faqTitle: '常见问题',
  aiGrowthService: {
    enabled: true,
    key: 'ai_growth',
    label: 'AI产品提交及增长服务',
    badge: '推荐',
    description: '适合首次收录与长期增长，提交后进入审核与推荐流程。',
    price: 0,
    originalPrice: 0,
    ctaText: '免费提交',
    features: [ 'AI 智能补全站点信息', '审核通过后收录到分类与搜索', '支持后续运营人工优化' ],
  },
  paidBoostService: {
    enabled: true,
    key: 'paid_boost',
    label: '付费加热推广产品',
    badge: '商业',
    description: '适合新品发布和活动期快速曝光，支持指定推广目标与预算。',
    price: 199,
    originalPrice: 299,
    ctaText: '提交并支付',
    features: [ '首页/频道曝光位优先分发', '支持预算与排期沟通', '运营团队跟进投放' ],
  },
  faqItems: [
    { question: '提交后多久审核？', answer: '通常 1-3 个工作日完成审核。', enabled: true },
    { question: '付费加热是否保证收录？', answer: '付费加热不改变审核标准，审核通过后进入推广排期。', enabled: true },
    { question: '支持哪些支付方式？', answer: '支持支付宝和微信支付。', enabled: true },
  ],
  payment: {
    enabled: false,
    allowAlipay: true,
    allowWechat: true,
  },
};

/**
 * 规范化投稿公开配置，避免后端未配置时前端渲染异常。
 */
const normalizeSubmissionPublicConfig = (value: unknown): SubmissionPublicConfig => {
  const source = (value && typeof value === 'object') ? (value as Record<string, any>) : {};
  const aiGrowthService = {
    ...DEFAULT_SUBMISSION_PUBLIC_CONFIG.aiGrowthService,
    ...(source.aiGrowthService && typeof source.aiGrowthService === 'object' ? source.aiGrowthService : {}),
  };
  const paidBoostService = {
    ...DEFAULT_SUBMISSION_PUBLIC_CONFIG.paidBoostService,
    ...(source.paidBoostService && typeof source.paidBoostService === 'object' ? source.paidBoostService : {}),
  };
  const faqItems = Array.isArray(source.faqItems)
    ? source.faqItems.filter((item: any) => item && item.enabled !== false)
    : DEFAULT_SUBMISSION_PUBLIC_CONFIG.faqItems;
  return {
    ...DEFAULT_SUBMISSION_PUBLIC_CONFIG,
    ...source,
    enabled: source.enabled !== false,
    pageTitle: String(source.pageTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageTitle,
    pageSubtitle: String(source.pageSubtitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageSubtitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageSubtitle,
    pageDescription: String(source.pageDescription || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageDescription).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pageDescription,
    containerMaxWidth: Number.isFinite(Number(source.containerMaxWidth))
      ? Math.max(960, Math.min(1600, Number(source.containerMaxWidth)))
      : DEFAULT_SUBMISSION_PUBLIC_CONFIG.containerMaxWidth,
    pricingTitle: String(source.pricingTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pricingTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.pricingTitle,
    faqTitle: String(source.faqTitle || DEFAULT_SUBMISSION_PUBLIC_CONFIG.faqTitle).trim() || DEFAULT_SUBMISSION_PUBLIC_CONFIG.faqTitle,
    aiGrowthService,
    paidBoostService,
    faqItems,
    payment: {
      enabled: source?.payment?.enabled === true,
      allowAlipay: source?.payment?.allowAlipay !== false,
      allowWechat: source?.payment?.allowWechat !== false,
    },
  };
};

interface SubmitServiceOption {
  key: ServiceType;
  enabled: boolean;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  price: number;
  originalPrice: number;
  ctaText: string;
}

const SUBMIT_SERVICE_OPTIONS: SubmitServiceOption[] = [
  {
    key: 'ai_growth',
    enabled: true,
    title: 'AI产品提交及增长服务',
    subtitle: '自然收录 + 运营推荐',
    description: '适合首次收录和长期曝光，提交后进入审核队列并匹配增长位。',
    highlights: [ 'AI 智能补全站点信息', '通过后进入分类页推荐', '支持后续运营跟进' ],
    price: 0,
    originalPrice: 0,
    ctaText: '免费提交',
  },
  {
    key: 'paid_boost',
    enabled: true,
    title: '付费加热推广产品',
    subtitle: '快速曝光 + 流量加热',
    description: '适合活动期和新品发布，可直接提交推广目标与预算区间。',
    highlights: [ '支持已有站点加热', '可选推广排期与预算', '运营专人跟进投放' ],
    price: 199,
    originalPrice: 299,
    ctaText: '提交并支付',
  },
];

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

// 可搜索的分类选择器组件
interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ categories, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 构建分类树结构（只包含有子分类的父分类）
  const categoryTree = useMemo(() => {
    const parentCategories = categories.filter(c => !c.parentId);
    return parentCategories
      .map(parent => ({
        ...parent,
        children: categories.filter(c => c.parentId === parent.id)
      }))
      .filter(parent => parent.children.length > 0); // 只显示有子分类的父分类
  }, [categories]);

  // 过滤分类（只搜索子分类）
  const filteredTree = useMemo(() => {
    if (!searchTerm) return categoryTree;
    const term = searchTerm.toLowerCase();
    return categoryTree
      .map(parent => ({
        ...parent,
        children: parent.children.filter(child => 
          child.name.toLowerCase().includes(term)
        )
      }))
      .filter(parent => parent.children.length > 0);
  }, [categoryTree, searchTerm]);

  // 获取选中的分类名称（只会是子分类）
  const selectedCategory = useMemo(() => {
    const cat = categories.find(c => c.id === value);
    if (!cat || !cat.parentId) return null;
    const parent = categories.find(c => c.id === cat.parentId);
    return { name: cat.name, parentName: parent?.name };
  }, [categories, value]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 打开时聚焦搜索框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedCategory ? (
          <span className="selected-value">
            <span className="parent-name">{selectedCategory.parentName} / </span>
            {selectedCategory.name}
          </span>
        ) : (
          <span className="placeholder">请选择分类</span>
        )}
        <Icons.ChevronDown />
      </button>

      {isOpen && (
        <div className="category-select-dropdown">
          <div className="category-search">
            <Icons.Search />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索分类..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button 
                type="button" 
                className="clear-search"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
              >
                <Icons.X />
              </button>
            )}
          </div>
          
          <div className="category-list">
            {/* 不选择分类选项 */}
            <div
              className={`category-item clear-option ${!value ? 'selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              <span className="category-name">不选择分类</span>
              {!value && <Icons.Check />}
            </div>

            {filteredTree.length === 0 ? (
              <div className="no-results">没有找到匹配的分类</div>
            ) : (
              filteredTree.map(parent => (
                <div key={parent.id} className="category-group">
                  {/* 父分类作为分组标题，不可点击 */}
                  <div className="category-group-header">
                    {parent.name}
                  </div>
                  {/* 子分类可选择 */}
                  {parent.children.map(child => (
                    <div
                      key={child.id}
                      className={`category-item ${value === child.id ? 'selected' : ''}`}
                      onClick={() => handleSelect(child.id)}
                    >
                      <span className="category-name">{child.name}</span>
                      {value === child.id && <Icons.Check />}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SubmitPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SubmitFormData>({
    serviceType: 'ai_growth',
    name: '',
    description: '',
    url: '',
    categoryId: '',
    tags: '',
    submitterName: '',
    submitterEmail: '',
    promotionPlan: 'basic',
    promotionBudget: '',
    promotionTarget: '',
    promotionContact: '',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [fetchingIcon, setFetchingIcon] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [iconUrl, setIconUrl] = useState<string>('');
  const [submitResult, setSubmitResult] = useState<SubmitResultState | null>(null);
  const [submissionConfig, setSubmissionConfig] = useState<SubmissionPublicConfig>(DEFAULT_SUBMISSION_PUBLIC_CONFIG);
  const [payChannel, setPayChannel] = useState<'alipay' | 'wechat'>('alipay');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [urlCheckResult, setUrlCheckResult] = useState<{
    checking: boolean;
    exists: boolean;
    type?: 'website' | 'pending';
    message?: string;
    website?: { name: string; url: string };
  }>({ checking: false, exists: false });

  const isPaidBoost = formData.serviceType === 'paid_boost';
  const serviceOptions = useMemo<SubmitServiceOption[]>(() => {
    const aiService = submissionConfig.aiGrowthService || {};
    const paidService = submissionConfig.paidBoostService || {};
    return [
      {
        key: 'ai_growth',
        enabled: aiService.enabled !== false,
        title: String(aiService.label || SUBMIT_SERVICE_OPTIONS[0].title),
        subtitle: String(aiService.badge || SUBMIT_SERVICE_OPTIONS[0].subtitle),
        description: String(aiService.description || SUBMIT_SERVICE_OPTIONS[0].description),
        highlights: Array.isArray(aiService.features) && aiService.features.length > 0
          ? aiService.features.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6)
          : SUBMIT_SERVICE_OPTIONS[0].highlights,
        price: Math.max(0, Number(aiService.price || 0)),
        originalPrice: Math.max(0, Number(aiService.originalPrice || 0)),
        ctaText: String(aiService.ctaText || '免费提交'),
      },
      {
        key: 'paid_boost',
        enabled: paidService.enabled !== false,
        title: String(paidService.label || SUBMIT_SERVICE_OPTIONS[1].title),
        subtitle: String(paidService.badge || SUBMIT_SERVICE_OPTIONS[1].subtitle),
        description: String(paidService.description || SUBMIT_SERVICE_OPTIONS[1].description),
        highlights: Array.isArray(paidService.features) && paidService.features.length > 0
          ? paidService.features.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6)
          : SUBMIT_SERVICE_OPTIONS[1].highlights,
        price: Math.max(0, Number(paidService.price || 0)),
        originalPrice: Math.max(0, Number(paidService.originalPrice || 0)),
        ctaText: String(paidService.ctaText || '提交并支付'),
      },
    ];
  }, [submissionConfig]);
  const enabledServiceOptions = useMemo(
    () => serviceOptions.filter(item => item.enabled),
    [serviceOptions]
  );
  const currentServiceOption = useMemo(
    () => enabledServiceOptions.find(item => item.key === formData.serviceType) || enabledServiceOptions[0] || serviceOptions[0],
    [enabledServiceOptions, formData.serviceType, serviceOptions]
  );
  const faqItems = useMemo(
    () => (submissionConfig.faqItems || []).filter(item => item && item.enabled !== false && item.question && item.answer),
    [submissionConfig.faqItems]
  );
  const paymentChannelOptions = useMemo(
    () => [
      {
        value: 'alipay' as const,
        label: '支付宝官方',
        desc: '支付宝当面付 / 网页支付',
        enabled: submissionConfig.payment.enabled && submissionConfig.payment.allowAlipay,
      },
      {
        value: 'wechat' as const,
        label: '微信支付官方',
        desc: '微信 H5 MWEB 支付',
        enabled: submissionConfig.payment.enabled && submissionConfig.payment.allowWechat,
      },
    ],
    [submissionConfig.payment]
  );
  const availablePayChannels = useMemo(
    () => paymentChannelOptions.filter(item => item.enabled),
    [paymentChannelOptions]
  );
  const shouldRequirePayment = isPaidBoost && Number(currentServiceOption?.price || 0) > 0;

  /**
   * 统一提取 API 错误文案，兼容 message/msg/error 三种返回键。
   */
  const getApiErrorMessage = useCallback((error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<Record<string, any>>;
    const payload = axiosError.response?.data || {};
    return String(payload?.message || payload?.msg || payload?.error || fallback);
  }, []);

  /**
   * 加载投稿公开配置，驱动前端投稿页文案、定价和支付渠道。
   */
  const fetchSubmissionConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await api.get('/settings/public');
      const settings = unwrapApiResponse<PublicSettingsPayload>(res.data, {});
      const normalized = normalizeSubmissionPublicConfig(settings?.submission);
      setSubmissionConfig(normalized);
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
      setCategories(unwrapApiList<Category>(res.data));
    } catch (error) {
      debugLog.error('获取分类失败:', error);
    }
  }, []);

  /**
   * 打开支付链接，浏览器拦截时给出可读提示。
   */
  const openPayWindow = useCallback((payUrl: string): boolean => {
    if (!payUrl) return false;
    const opened = window.open(payUrl, '_blank', 'noopener,noreferrer');
    return Boolean(opened);
  }, []);

  // 初始化加载配置与分类
  useEffect(() => {
    fetchSubmissionConfig();
    fetchCategories();
  }, [fetchSubmissionConfig, fetchCategories]);

  // 从 localStorage 加载草稿
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - draft.savedAt < sevenDays) {
          setFormData({
            serviceType: draft.serviceType === 'paid_boost' ? 'paid_boost' : 'ai_growth',
            name: draft.name || '',
            description: draft.description || '',
            url: draft.url || '',
            categoryId: draft.categoryId || '',
            tags: draft.tags || '',
            submitterName: draft.submitterName || '',
            submitterEmail: draft.submitterEmail || '',
            promotionPlan: draft.promotionPlan || 'basic',
            promotionBudget: draft.promotionBudget || '',
            promotionTarget: draft.promotionTarget || '',
            promotionContact: draft.promotionContact || '',
          });
          setIconUrl(draft.iconUrl || '');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      debugLog.error('加载草稿失败:', e);
    }
    setDraftLoaded(true);
  }, []);

  // 自动修正无效服务类型
  useEffect(() => {
    const currentEnabled = enabledServiceOptions.some(item => item.key === formData.serviceType);
    if (!currentEnabled && enabledServiceOptions.length > 0) {
      setFormData(prev => ({ ...prev, serviceType: enabledServiceOptions[0].key }));
    }
  }, [enabledServiceOptions, formData.serviceType]);

  // 自动修正无效支付渠道
  useEffect(() => {
    if (!shouldRequirePayment) return;
    const exists = availablePayChannels.some(item => item.value === payChannel);
    if (!exists && availablePayChannels.length > 0) {
      setPayChannel(availablePayChannels[0].value);
    }
  }, [availablePayChannels, payChannel, shouldRequirePayment]);

  // 保存草稿到 localStorage（防抖）
  const saveDraft = useCallback(() => {
    const draft: DraftData = {
      ...formData,
      iconUrl,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      debugLog.error('保存草稿失败:', e);
    }
  }, [formData, iconUrl]);

  // 表单数据变化时保存草稿
  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(saveDraft, 500);
    return () => clearTimeout(timer);
  }, [formData, iconUrl, draftLoaded, saveDraft]);

  /**
   * 清除本地草稿，提交成功后调用。
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      debugLog.error('清除草稿失败:', e);
    }
  }, []);

  /**
   * 检查 URL 是否已存在（防抖），付费加热允许继续提交。
   */
  const checkUrlExists = useCallback(async (url: string) => {
    if (!url || !url.startsWith('http')) {
      setUrlCheckResult({ checking: false, exists: false });
      return;
    }
    setUrlCheckResult(prev => ({ ...prev, checking: true }));
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

  // URL 变化时检查是否存在
  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(() => {
      checkUrlExists(formData.url);
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.url, draftLoaded, checkUrlExists]);

  /**
   * 处理表单输入变化。
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'url') {
      setUrlCheckResult({ checking: false, exists: false });
    }
  };

  /**
   * 切换所属分类。
   */
  const handleCategoryChange = (categoryId: string) => {
    setFormData(prev => ({ ...prev, categoryId }));
  };

  /**
   * 切换提交服务类型。
   */
  const handleServiceTypeChange = (serviceType: ServiceType) => {
    setFormData(prev => ({ ...prev, serviceType }));
    setSubmitResult(null);
  };

  /**
   * 获取站点图标（走后台 Favicon API）。
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
   * 调用 AI 自动补全网站信息。
   */
  const handleAiGenerate = async () => {
    if (!formData.url) return;
    setGeneratingAi(true);
    try {
      const res = await api.post('/ai-config/generate-website-info', { url: formData.url });
      const data = unwrapApiResponse<AiGeneratePayload>(res.data, {});
      const { name, description, tags } = data;
      setFormData(prev => ({
        ...prev,
        name: name || prev.name,
        description: description || prev.description,
        tags: tags || prev.tags,
      }));
      if (!iconUrl) {
        handleFetchIcon();
      }
    } catch (error: unknown) {
      debugLog.error('AI 生成失败:', error as AxiosError<{ error?: string }>);
    } finally {
      setGeneratingAi(false);
    }
  };

  /**
   * 构建投稿 payload，统一普通提交与支付下单入参。
   */
  const buildSubmitPayload = useCallback(() => {
    const serviceMeta = isPaidBoost
      ? {
          plan: formData.promotionPlan,
          budget: formData.promotionBudget,
          target: formData.promotionTarget,
          contact: formData.promotionContact,
        }
      : undefined;
    return {
      ...formData,
      iconUrl: iconUrl || undefined,
      serviceMeta,
    };
  }, [formData, iconUrl, isPaidBoost]);

  /**
   * 处理提交动作：免费服务走普通提交，付费服务走支付下单接口。
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionConfig.enabled) {
      setSubmitResult({ success: false, message: '投稿服务暂未开放' });
      return;
    }
    if (!formData.name || !formData.url) {
      setSubmitResult({ success: false, message: '请填写网站名称和URL' });
      return;
    }
    if (!isPaidBoost && urlCheckResult.exists) {
      setSubmitResult({ success: false, message: '该网址已存在，不能重复提交收录' });
      return;
    }
    if (isPaidBoost && (!formData.promotionTarget.trim() || !formData.promotionContact.trim())) {
      setSubmitResult({ success: false, message: '请选择推广需求并填写联系方式' });
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
        const opened = payUrl ? openPayWindow(payUrl) : false;
        setSubmitResult({
          success: true,
          id: data.submissionId ? String(data.submissionId) : undefined,
          orderNo: data.orderNo ? String(data.orderNo) : undefined,
          payUrl: payUrl || undefined,
          isPayment: data.status !== 'free',
          message: data.status === 'free'
            ? '提交成功！该方案当前无需支付。'
            : (opened
              ? '支付订单已创建，已在新窗口打开支付页面，请完成支付。'
              : '支付订单已创建，请点击“继续支付”完成支付（浏览器可能拦截了新窗口）。'),
        });
        return;
      }

      const res = await api.post('/submissions', buildSubmitPayload());
      const data = unwrapApiResponse<SubmissionPayload>(res.data, {});
      clearDraft();
      setSubmitResult({
        success: true,
        message: isPaidBoost
          ? '提交成功！运营同学会尽快联系您确认推广排期。'
          : '提交成功！我们会尽快审核您的网站。',
        id: data.id ? String(data.id) : undefined,
      });
    } catch (error: unknown) {
      setSubmitResult({
        success: false,
        message: getApiErrorMessage(error, '提交失败，请稍后重试'),
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置表单并清空结果状态。
   */
  const handleReset = () => {
    setFormData({
      serviceType: enabledServiceOptions[0]?.key || 'ai_growth',
      name: '',
      description: '',
      url: '',
      categoryId: '',
      tags: '',
      submitterName: '',
      submitterEmail: '',
      promotionPlan: 'basic',
      promotionBudget: '',
      promotionTarget: '',
      promotionContact: '',
    });
    setIconUrl('');
    setSubmitResult(null);
    clearDraft();
  };

  /**
   * 继续支付按钮事件。
   */
  const handleContinuePay = () => {
    if (!submitResult?.payUrl) return;
    openPayWindow(submitResult.payUrl);
  };

  return (
    <div className="submit-page">
      <SEO
        title={`${submissionConfig.pageTitle || '提交网站'} - UIED设计导航`}
        description={submissionConfig.pageDescription || '向UIED设计导航提交优质设计工具和资源网站。'}
        keywords="提交网站,产品投稿,加热推广,设计导航"
      />

      <div className="submit-container" style={{ maxWidth: `${submissionConfig.containerMaxWidth || 1200}px` }}>
        <div className="submit-header">
          <div className="header-icon">
            <Icons.Submit />
          </div>
          <h1>{submissionConfig.pageTitle || '提交网站'}</h1>
          <p>{submissionConfig.pageSubtitle || submissionConfig.pageDescription}</p>
        </div>

        {configLoading ? (
          <div className="submit-loading">正在加载投稿配置...</div>
        ) : !submissionConfig.enabled ? (
          <div className="submit-closed-card">
            <h2>投稿服务暂未开放</h2>
            <p>请稍后再试，或联系站点运营团队获取开放时间。</p>
            <button className="btn-secondary" onClick={() => navigate('/')}>
              <Icons.Home />
              <span>返回首页</span>
            </button>
          </div>
        ) : (
          <>
            <section className="submit-pricing">
              <div className="submit-block-header">
                <h2>{submissionConfig.pricingTitle || '服务方案'}</h2>
                <p>运营可在后台实时配置方案文案、价格与权益，这里自动同步。</p>
              </div>
              <div className="submit-pricing-grid">
                {enabledServiceOptions.map(service => {
                  const active = formData.serviceType === service.key;
                  const iconNode = service.key === 'paid_boost' ? <Icons.Megaphone /> : <Icons.Growth />;
                  return (
                    <article
                      key={service.key}
                      className={`submit-pricing-card ${active ? 'is-active' : ''}`}
                    >
                      <div className="submit-pricing-card__header">
                        <span className="submit-pricing-card__icon">{iconNode}</span>
                        <div>
                          <h3>{service.title}</h3>
                          {service.subtitle ? <span className="submit-pricing-card__badge">{service.subtitle}</span> : null}
                        </div>
                      </div>
                      <p className="submit-pricing-card__desc">{service.description}</p>
                      <div className="submit-pricing-card__price">
                        <strong>{service.price <= 0 ? '免费' : `¥${service.price.toFixed(0)}`}</strong>
                        {service.originalPrice > service.price ? (
                          <span>¥{service.originalPrice.toFixed(0)}</span>
                        ) : null}
                      </div>
                      <ul>
                        {service.highlights.map(text => (
                          <li key={text}>{text}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className={`submit-pricing-card__cta ${active ? 'is-active' : ''}`}
                        onClick={() => handleServiceTypeChange(service.key)}
                      >
                        {service.ctaText || '选择方案'}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            {faqItems.length > 0 ? (
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

            <div className="submit-service-switch">
              {enabledServiceOptions.map((service) => {
                const active = formData.serviceType === service.key;
                const iconNode = service.key === 'paid_boost' ? <Icons.Megaphone /> : <Icons.Growth />;
                return (
                  <button
                    key={service.key}
                    type="button"
                    className={`service-card ${active ? 'is-active' : ''}`}
                    onClick={() => handleServiceTypeChange(service.key)}
                  >
                    <div className="service-card__head">
                      <span className="service-card__icon">{iconNode}</span>
                      <div className="service-card__title-wrap">
                        <strong>{service.title}</strong>
                        <span>{service.subtitle}</span>
                      </div>
                    </div>
                    <p>{service.description}</p>
                    <div className="service-card__tags">
                      {service.highlights.slice(0, 3).map(text => (
                        <span key={text}>{text}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {submitResult ? (
              <div className={`submit-result-card ${submitResult.success ? 'success' : 'error'}`}>
                <div className="result-icon">
                  {submitResult.success ? <Icons.Success /> : <Icons.Error />}
                </div>
                <h2>{submitResult.success ? '提交成功' : '提交失败'}</h2>
                <p>{submitResult.message}</p>
                {submitResult.id ? (
                  <p className="result-id">提交编号: {submitResult.id}</p>
                ) : null}
                {submitResult.orderNo ? (
                  <p className="result-id">支付订单: {submitResult.orderNo}</p>
                ) : null}
                <div className="result-actions">
                  {submitResult.success ? (
                    <>
                      <button className="btn-secondary" onClick={handleReset}>
                        <Icons.Plus />
                        <span>继续提交</span>
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
              <form className="submit-form" onSubmit={handleSubmit}>
                <div className="form-section">
                  <div className="section-title">
                    <span className="step-number">1</span>
                    <h3>网站地址（{currentServiceOption?.title || '投稿服务'}）</h3>
                  </div>
                  <div className="form-group">
                    <label htmlFor="url">网站URL <span className="required">*</span></label>
                    <div className="input-with-button">
                      <input
                        type="url"
                        id="url"
                        name="url"
                        value={formData.url}
                        onChange={handleChange}
                        placeholder="https://example.com"
                        className={urlCheckResult.exists && !isPaidBoost ? 'has-error' : ''}
                        required
                      />
                      <button
                        type="button"
                        className="btn-ai"
                        onClick={handleAiGenerate}
                        disabled={generatingAi || !formData.url || (urlCheckResult.exists && !isPaidBoost)}
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
                        <span className="checking-dot"></span>
                        正在检查网址...
                      </p>
                    ) : urlCheckResult.exists ? (
                      <div className={`url-exists-warning ${isPaidBoost ? 'is-info' : ''}`}>
                        <Icons.Info />
                        <span>
                          {isPaidBoost ? '该网址已收录，可继续提交加热推广需求' : urlCheckResult.message}
                          {urlCheckResult.website ? (
                            <>：<strong>{urlCheckResult.website.name}</strong></>
                          ) : null}
                        </span>
                      </div>
                    ) : formData.url && formData.url.startsWith('http') ? (
                      <p className="form-hint success">
                        <Icons.Check />
                        该网址可以提交
                      </p>
                    ) : (
                      <p className="form-hint">输入网站地址后，可使用AI智能填写网站信息</p>
                    )}
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-title">
                    <span className="step-number">2</span>
                    <h3>网站信息</h3>
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
                      <label htmlFor="name">网站名称 <span className="required">*</span></label>
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

                {isPaidBoost ? (
                  <div className="form-section">
                    <div className="section-title">
                      <span className="step-number">3</span>
                      <h3>加热推广需求</h3>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="promotionPlan">推广套餐</label>
                        <select
                          id="promotionPlan"
                          name="promotionPlan"
                          value={formData.promotionPlan}
                          onChange={handleChange}
                        >
                          <option value="basic">基础加热（首页曝光）</option>
                          <option value="plus">进阶加热（分类 + 首页）</option>
                          <option value="pro">深度加热（多运营位联动）</option>
                          <option value="custom">定制方案（人工沟通）</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="promotionBudget">预算区间</label>
                        <input
                          type="text"
                          id="promotionBudget"
                          name="promotionBudget"
                          value={formData.promotionBudget}
                          onChange={handleChange}
                          placeholder="例如：2k-5k / 月"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="promotionTarget">推广目标 <span className="required">*</span></label>
                      <textarea
                        id="promotionTarget"
                        name="promotionTarget"
                        value={formData.promotionTarget}
                        onChange={handleChange}
                        placeholder="请描述目标用户、上线时间和预期效果"
                        rows={3}
                        required={isPaidBoost}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="promotionContact">联系方式 <span className="required">*</span></label>
                      <input
                        type="text"
                        id="promotionContact"
                        name="promotionContact"
                        value={formData.promotionContact}
                        onChange={handleChange}
                        placeholder="微信 / 手机 / 邮箱"
                        required={isPaidBoost}
                      />
                    </div>
                    {shouldRequirePayment ? (
                      <div className="form-group">
                        <label>支付方式 <span className="required">*</span></label>
                        <div className="pay-channel-group">
                          {paymentChannelOptions.map(channel => (
                            <label
                              key={channel.value}
                              className={`pay-channel-item ${payChannel === channel.value ? 'is-active' : ''} ${channel.enabled ? '' : 'is-disabled'}`}
                            >
                              <input
                                type="radio"
                                name="payChannel"
                                value={channel.value}
                                checked={payChannel === channel.value}
                                disabled={!channel.enabled}
                                onChange={() => setPayChannel(channel.value)}
                              />
                              <span className="pay-channel-item__name">{channel.label}</span>
                              <span className="pay-channel-item__desc">{channel.desc}</span>
                            </label>
                          ))}
                        </div>
                        {!submissionConfig.payment.enabled ? (
                          <p className="form-hint">支付功能尚未开放，请联系管理员。</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="form-section">
                  <div className="section-title">
                    <span className="step-number">{isPaidBoost ? '4' : '3'}</span>
                    <h3>您的信息（可选）</h3>
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
                        placeholder="可选，方便我们联系您"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
                    <Icons.ArrowLeft />
                    <span>取消</span>
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading || enabledServiceOptions.length === 0 || (urlCheckResult.exists && !isPaidBoost)}
                  >
                    {loading ? (
                      <span className="loading-text">提交中</span>
                    ) : (
                      <>
                        <Icons.Rocket />
                        <span>{currentServiceOption?.ctaText || (isPaidBoost ? '提交加热需求' : '提交网站')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="submit-tips">
              <div className="tips-header">
                <Icons.Info />
                <h4>提交须知</h4>
              </div>
              <ul>
                <li>请确保提交的网站内容合法、健康。</li>
                <li>网站应与设计、开发、创意相关，便于站内用户检索。</li>
                <li>{serviceOptions[0]?.title || 'AI产品提交及增长服务'}：通常 1-3 个工作日内完成审核。</li>
                <li>{serviceOptions[1]?.title || '付费加热推广产品'}：创建订单后请在支付窗口完成支付。</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubmitPage;
