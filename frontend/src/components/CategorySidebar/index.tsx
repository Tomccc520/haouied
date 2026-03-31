/**
 * @file CategorySidebar/index.tsx
 * @description 通用导航侧边栏组件 - 支持多种导航类型和Motion动效
 * @copyright 版权所有 (c) 2025 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.1.0 - 增加Motion动效支持
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { IconSearch } from '../UI/Icons/index';
import { NavMenuType } from '../../types';
import { IconComponent } from '../../types/icon';
import { resolveSvgIconMarkup } from '../../utils/svgIconLibrary';
import { 
  DesignIcons, 
  IconTool, 
  IconTools,
  IconDigital, 
  IconSystem, 
  IconDesignTeam, 
  IconCarUI,
  IconGameUI,
  IconMetaverse,
  IconAIDesign,
  IconOtherContent,
  IconEducation,
  IconLearning,
  IconInspiration,
  IconMaterial,
  IconFont,
  IconColor,
  IconPrint,
  IconGraphic,
  IconBrand,
  IconPhoto,
  IconArt,
  // 电商相关图标
  IconStore,
  IconCamera,
  IconLayout,
  IconMarketing,
  IconPlatform,
  IconLiveStreaming,
  IconBanner,
  IconPackage,
  IconIllustration,
  IconComponents,
  IconMockup,
  IconPalette,
  // 室内设计相关图标
  IconCAD,
  IconFurniture,
  IconTexture,
  IconLighting,
  IconProject,
  IconVR,
  Icon3D
} from '../UI/Icons';
import './index.css';
import './index.mobile.css'; // 引入独立的移动端样式

// 简单的外部链接图标组件
const ExternalLinkIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// 子分类接口定义
export interface SubNavItem {
  id: string;
  name: string;
  count?: number;
}

// 导航项接口定义（通用）
export interface NavItem {
  id: string;
  name: string;
  count?: number;
  icon?: IconComponent | string;
  color?: string;
  badge?: string; // 新增：徽章文本（如"新"、"热门"等）
  disabled?: boolean; // 新增：是否禁用
  subcategories?: SubNavItem[]; // 新增：子分类列表
  slug?: string; // 新增：分类slug，用于匹配静态数据
  }
  
  // 侧边栏配置接口
export interface SidebarConfig {
  title: string;                    // 侧边栏标题
  type: NavMenuType;               // 导航类型
  showSearch?: boolean;            // 是否显示搜索结果导航
  searchLabel?: string;            // 搜索结果标签
  searchIcon?: IconComponent; // 搜索图标
}

// 组件属性接口
export interface CategorySidebarProps {
  config: SidebarConfig;           // 侧边栏配置
  navItems: NavItem[];             // 导航项列表
  activeItem: string;              // 当前激活项ID
  onItemClick: (itemId: string) => void; // 导航项点击回调
  isSearchMode?: boolean;          // 是否为搜索模式
  searchResultsCount?: number;     // 搜索结果数量
  onExitSearchMode?: () => void;   // 退出搜索模式回调
  isSticky?: boolean;              // 是否启用固定定位
  className?: string;              // 自定义样式类
  // 新增：导航切换相关属性
  showNavSwitch?: boolean;         // 是否显示导航切换
  navSwitchItems?: NavSwitchItem[]; // 导航切换选项
  currentNavType?: NavMenuType;     // 当前导航类型
  onNavTypeChange?: (navType: NavMenuType) => void; // 导航类型切换回调
  // 新增：自定义徽章文本
  badgeText?: string;              // 自定义徽章文本，如果不传则使用type
  svgIconMap?: Record<string, string>; // 自定义 SVG 图标库（svg:key）
}

// 新增：导航切换项接口
export interface NavSwitchItem {
  type: NavMenuType;
  name: string;
  icon: IconComponent;
  description?: string;
}

// 默认图标映射 - 与后台 admin/src/config/icons.tsx 中的 availableIcons 保持一致
const defaultIconMap: Record<string, IconComponent> = {
  default: IconTool,
  
  // ============ 设计相关 ============
  inspiration: IconInspiration,
  ui: DesignIcons.UI,
  graphic: IconGraphic,
  template: DesignIcons.Template,
  material: IconMaterial,
  icons: DesignIcons.Icons,
  color: IconColor,
  font: IconFont,
  brand: IconBrand,
  prototype: DesignIcons.Prototype,
  kit: DesignIcons.Kit,
  animation: DesignIcons.Animation,
  '3d': Icon3D,
  print: IconPrint,
  art: IconArt,
  figma: DesignIcons.Figma,
  illustration: IconIllustration,
  components: IconComponents,
  mockup: IconMockup,
  palette: IconPalette,
  
  // ============ 媒体相关 ============
  image: DesignIcons.Image,
  photo: IconPhoto,
  video: DesignIcons.Video,
  audio: DesignIcons.Audio,
  camera: IconCamera,
  
  // ============ 技术相关 ============
  ai: DesignIcons.AI,
  code: DesignIcons.Code,
  developer: DesignIcons.Developer,
  web: DesignIcons.Web,
  mobile: DesignIcons.Mobile,
  plugin: DesignIcons.Plugin,
  data: DesignIcons.Data,
  analytics: DesignIcons.Analytics,
  visualization: DesignIcons.Visualization || IconDigital,
  gameui: IconGameUI,
  metaverse: IconMetaverse,
  digital: IconDigital,
  system: IconSystem,
  
  // ============ 商业相关 ============
  ecommerce: DesignIcons.Ecommerce,
  store: IconStore,
  marketing: IconMarketing,
  platform: IconPlatform,
  livestreaming: IconLiveStreaming,
  banner: IconBanner,
  package: IconPackage,
  
  // ============ 电商相关 ============
  layout: IconLayout,
  specs: DesignIcons.Specs,
  
  // ============ 室内设计 ============
  cad: IconCAD,
  furniture: IconFurniture,
  texture: IconTexture,
  lighting: IconLighting,
  project: IconProject,
  vr: IconVR,
  
  // ============ 通用图标 ============
  tool: IconTool,
  tools: IconTools,
  tutorial: DesignIcons.Tutorial,
  learn: DesignIcons.Learn,
  blog: DesignIcons.Blog,
  community: DesignIcons.Community,
  book: DesignIcons.Book,
  education: IconEducation,
  resource: DesignIcons.Resource,
  carui: IconCarUI,
  designteam: IconDesignTeam,
  aidesign: IconAIDesign,
  othercontent: IconOtherContent,
  learning: IconLearning,
  
  // ============ 兼容性映射（Heroicons/其他风格名称） ============
  'academic-cap': IconEducation,
  'briefcase': IconTools,
  'globe-alt': DesignIcons.Web,
  'shopping-cart': DesignIcons.Ecommerce,
  'music': DesignIcons.Audio,
  'Flag01': IconTools,  // Untitled UI 图标名称兼容
  
  // ============ 大写版本映射（兼容性） ============
  Inspiration: IconInspiration,
  UI: DesignIcons.UI,
  Graphic: IconGraphic,
  Template: DesignIcons.Template,
  Material: IconMaterial,
  Icons: DesignIcons.Icons,
  Color: IconColor,
  Font: IconFont,
  Brand: IconBrand,
  Prototype: DesignIcons.Prototype,
  Kit: DesignIcons.Kit,
  Animation: DesignIcons.Animation,
  '3D': Icon3D,
  Print: IconPrint,
  Art: IconArt,
  Figma: DesignIcons.Figma,
  Illustration: IconIllustration,
  Components: IconComponents,
  Mockup: IconMockup,
  Palette: IconPalette,
  Image: DesignIcons.Image,
  Photo: IconPhoto,
  Video: DesignIcons.Video,
  Audio: DesignIcons.Audio,
  Camera: IconCamera,
  AI: DesignIcons.AI,
  Code: DesignIcons.Code,
  Developer: DesignIcons.Developer,
  Web: DesignIcons.Web,
  Mobile: DesignIcons.Mobile,
  Plugin: DesignIcons.Plugin,
  Data: DesignIcons.Data,
  Analytics: DesignIcons.Analytics,
  Visualization: DesignIcons.Visualization || IconDigital,
  GameUI: IconGameUI,
  Metaverse: IconMetaverse,
  Digital: IconDigital,
  System: IconSystem,
  Ecommerce: DesignIcons.Ecommerce,
  Store: IconStore,
  Marketing: IconMarketing,
  Platform: IconPlatform,
  LiveStreaming: IconLiveStreaming,
  Banner: IconBanner,
  Package: IconPackage,
  Layout: IconLayout,
  Specs: DesignIcons.Specs,
  CAD: IconCAD,
  Furniture: IconFurniture,
  Texture: IconTexture,
  Lighting: IconLighting,
  Project: IconProject,
  VR: IconVR,
  Tool: IconTool,
  Tools: IconTools,
  Tutorial: DesignIcons.Tutorial,
  Learn: DesignIcons.Learn,
  Blog: DesignIcons.Blog,
  Community: DesignIcons.Community,
  Book: DesignIcons.Book,
  Education: IconEducation,
  Resource: DesignIcons.Resource,
  CarUI: IconCarUI,
  DesignTeam: IconDesignTeam,
  AIDesign: IconAIDesign,
  OtherContent: IconOtherContent,
  Learning: IconLearning
};

/**
 * 可作为兜底映射池的前台图标 key。
 * 当后台传入 el-icon/local-icon 且无法精确映射时，使用稳定哈希落到该列表，避免所有未知图标都显示成同一个默认图标。
 */
const fallbackIconKeys: string[] = [
  'tool',
  'inspiration',
  'ui',
  'graphic',
  'template',
  'material',
  'icons',
  'color',
  'font',
  'brand',
  'image',
  'video',
  'audio',
  'ai',
  'code',
  'web',
  'mobile',
  'plugin',
  'data',
  'analytics',
  'education',
  'resource',
  'ecommerce',
  'marketing',
  'platform',
  'layout',
  'cad',
  'furniture',
  'project',
  'vr',
];

/**
 * 对字符串做稳定哈希，确保同一个未知图标值总是映射到同一个前台图标。
 */
const stableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * 将后台 icon-picker 的值（el-icon/local-icon）尽量映射为前台可识别图标 key。
 * 规则：先关键字别名，再哈希兜底，保证“改了图标”在前台有可见变化。
 */
const normalizeLegacyIconName = (iconName: string): string => {
  const raw = String(iconName || '').trim();
  if (!raw) return '';
  const lowerRaw = raw.toLowerCase();
  if (defaultIconMap[raw]) return raw;
  if (defaultIconMap[lowerRaw]) return lowerRaw;
  const compact = lowerRaw
    .replace(/^el-icon-/, '')
    .replace(/^local-icon-/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .trim();
  if (!compact) return '';
  if (defaultIconMap[compact]) return compact;

  const aliasEntries: Array<[RegExp, string]> = [
    [/(cpu|monitor|data|histogram|trend|pie|rank|chart|analysis)/, 'analytics'],
    [/(camera|photo|picture|image)/, 'image'],
    [/(video|film|movie|clapperboard)/, 'video'],
    [/(music|audio|mic|headset)/, 'audio'],
    [/(cart|shop|store|goods|bag)/, 'ecommerce'],
    [/(brush|pen|palette|color)/, 'palette'],
    [/(font|text|typography|word)/, 'font'],
    [/(code|bug|terminal|command|api)/, 'code'],
    [/(globe|world|earth|browser|link|internet)/, 'web'],
    [/(mobile|phone|device|tablet)/, 'mobile'],
    [/(book|read|school|education|learn|graduation)/, 'education'],
    [/(bulb|idea|light|spark|star)/, 'inspiration'],
    [/(layout|grid|module|component|template)/, 'layout'],
    [/(ai|robot|chip|bot)/, 'ai'],
    [/(cube|three|3d)/, '3d'],
    [/(game|joystick)/, 'gameui'],
    [/(project|plan|task|calendar)/, 'project'],
    [/(vr|virtual|ar)/, 'vr'],
    [/(home|house|building|office)/, 'platform'],
    [/(tool|wrench|setting|gear)/, 'tools'],
    [/(basketball|football|soccer|tennis|sport)/, 'tool'],
  ];

  for (const [pattern, mapped] of aliasEntries) {
    if (pattern.test(compact) && defaultIconMap[mapped]) {
      return mapped;
    }
  }

  const fallbackKey = fallbackIconKeys[stableHash(compact) % fallbackIconKeys.length];
  return defaultIconMap[fallbackKey] ? fallbackKey : 'default';
};

// 根据导航类型获取默认配置
const getDefaultConfig = (type: NavMenuType): Partial<SidebarConfig> => {
  switch (type) {
    case NavMenuType.DESIGN:
      return {
        title: '设计导航',
        showSearch: true,
        searchLabel: '搜索结果',
        searchIcon: IconSearch
      };
    case NavMenuType.AI:
      return {
        title: 'AI工具导航',
        showSearch: true,
        searchLabel: 'AI搜索结果',
        searchIcon: DesignIcons.AI
      };
    case NavMenuType.THREE_D:
      return {
        title: '3D工具导航',
        showSearch: true,
        searchLabel: '3D搜索结果',
        searchIcon: IconTool
      };
    case NavMenuType.ECOMMERCE:
      return {
        title: '电商工具导航',
        showSearch: true,
        searchLabel: '电商搜索结果',
        searchIcon: IconTool
      };
    case NavMenuType.INTERIOR:
      return {
        title: '室内设计导航',
        showSearch: true,
        searchLabel: '室内搜索结果',
        searchIcon: IconTool
      };
    case NavMenuType.FONT:
      return {
        title: '字体导航',
        showSearch: true,
        searchLabel: '字体搜索结果',
        searchIcon: DesignIcons.Font
      };
    case NavMenuType.TOOLS:
      return {
        title: '工具导航',
        showSearch: true,
        searchLabel: '工具搜索结果',
        searchIcon: IconTool
      };
    case NavMenuType.RESOURCES:
      return {
        title: '资源导航',
        showSearch: true,
        searchLabel: '资源搜索结果',
        searchIcon: DesignIcons.Resource
      };
    default:
      return {
        title: '导航',
        showSearch: false,
        searchIcon: IconSearch
      };
  }
};

/**
 * 获取导航项图标组件
 * @param icon 图标（组件或字符串）
 * @returns 图标组件
 */
const getIconComponent = (icon?: IconComponent | string): IconComponent => {
  if (!icon) return defaultIconMap.default;
  if (typeof icon === 'string') {
    const normalizedIcon = normalizeLegacyIconName(icon);
    // 尝试直接匹配
    const directMatch = defaultIconMap[icon];
    if (directMatch) return directMatch;
    
    // 尝试小写匹配
    const lowerMatch = defaultIconMap[icon.toLowerCase()];
    if (lowerMatch) return lowerMatch;

    // 兼容后台 el-icon/local-icon 的历史值
    const normalizedMatch = defaultIconMap[normalizedIcon];
    if (normalizedMatch) return normalizedMatch;
    
    // 尝试大写匹配
    const upperMatch = defaultIconMap[icon.toUpperCase()];
    if (upperMatch) return upperMatch;
    
    return defaultIconMap.default;
  }
  return icon;
};

/**
 * 通用导航侧边栏组件
 * @param props 组件属性
 * @returns 侧边栏JSX元素
 */
const CategorySidebar: React.FC<CategorySidebarProps> = ({
  config,
  navItems,
  activeItem,
  onItemClick,
  isSearchMode = false,
  searchResultsCount = 0,
  onExitSearchMode,
  isSticky = false,
  className = '',
  // 新增参数
  showNavSwitch = false,
  navSwitchItems = [],
  currentNavType,
  onNavTypeChange,
  badgeText,
  svgIconMap = {}
}) => {
  /**
   * 侧栏是否启用吸顶，默认关闭。
   */
  const shouldUseSticky = isSticky === true;

  // 合并默认配置
  const finalConfig = { ...getDefaultConfig(config.type), ...config };
  const SearchIcon = finalConfig.searchIcon || IconSearch;
  
  const sidebarRef = useRef<HTMLElement>(null);
  
  // 记录最后一次选中的项目，用于调试比较
  const lastActiveItemRef = useRef<string | null>(null);
  
  // 在activeItem变化时，确保对应的导航项可见（滚动到视图）
  useEffect(() => {
    if (activeItem !== lastActiveItemRef.current) {
      lastActiveItemRef.current = activeItem;
      
      if (activeItem) {
        const navItem = document.querySelector(`.category-nav-item[data-item="${activeItem}"]`);
        if (navItem instanceof HTMLElement) {
          setTimeout(() => {
            navItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        }
      }
    }
  }, [activeItem]);

  /**
   * 根据是否启用吸顶返回侧栏类名：
   * - sticky：桌面端随页面滚动并限制可视高度
   * - static：小屏降级为普通文档流
   */
  const getSidebarClass = () => {
    const baseClass = 'category-sidebar';
    if (!shouldUseSticky) return `${baseClass} static`;
    return `${baseClass} sticky`;
  };

  // 处理导航项点击 - 直接使用传入的函数，不做任何修改
  const handleItemClick = useCallback((itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId);
    }
  }, [onItemClick]);

  return (
    <aside 
      ref={sidebarRef} 
      className={`${getSidebarClass()} ${className}`}
      style={shouldUseSticky ? undefined : { position: 'static', top: 'auto' }}
    >
      <div className="sidebar-header">
        {/* 只显示标题，不提供导航切换功能 */}
        <h3 className="sidebar-header-title">
          {finalConfig.title}
          <div className="sidebar-type-badge" data-type={config.type}>
            {badgeText || config.type.toUpperCase()}
          </div>
        </h3>
      </div>
      
      <nav className="category-nav">
        {/* 搜索结果导航项 - 修改为跳转到独立搜索页面 */}
        {isSearchMode && finalConfig.showSearch && (
          <button
            className={`category-nav-item search-item ${activeItem === 'search-results' ? 'active' : ''}`}
            onClick={() => handleItemClick('search-page')} // 修改为跳转到搜索页面
          >
            <div className="category-nav-icon">
              <SearchIcon size={18} />
            </div>
            <span className="category-nav-name">查看搜索页面</span>
            <span className="category-nav-count">{searchResultsCount}</span>
            <div className="category-nav-external">
              <ExternalLinkIcon size={14} />
            </div>
          </button>
        )}
        
        {/* 导航项列表 */}
        {navItems.map(item => {
          /**
           * 优先解析 svg:key 图标库，未命中时回退内置图标组件。
           */
          const svgMarkup = typeof item.icon === 'string'
            ? resolveSvgIconMarkup(item.icon, svgIconMap)
            : '';
          const IconComponent = svgMarkup ? null : getIconComponent(item.icon);
          
          const isActive = activeItem === item.id;
          const isDisabled = item.disabled;
          
          return (
            <div key={item.id} className="category-nav-group">
              <button
                className={`category-nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && handleItemClick(item.id)}
                data-item={item.id}
                style={{ '--item-color': item.color } as React.CSSProperties}
                disabled={isDisabled}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="category-nav-icon">
                  {svgMarkup ? (
                    <span
                      className="category-nav-icon-svg"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: svgMarkup }}
                    />
                  ) : (
                    IconComponent ? <IconComponent size={18} /> : null
                  )}
                </div>
                <span className="category-nav-name">{item.name}</span>
                
                {/* 计数显示 */}
                {typeof item.count === 'number' && (
                  <span className="category-nav-count">{item.count}</span>
                )}
                
                {/* 徽章显示 */}
                {item.badge && (
                  <span className="category-nav-badge">{item.badge}</span>
                )}
              </button>
              
              {/* 子分类列表已移除 - 不再在侧边栏显示子分类 */}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

// 导出类型和组件
export default CategorySidebar; 
