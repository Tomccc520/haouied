/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
/**
 * @file ContentHubSwitch/index.tsx
 * @description 内容中心主切换组件（热门文章/榜单系统/每日热榜/最新上新）
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './index.css';

export interface ContentHubSwitchItem {
  key: string;
  label: string;
  to: string;
  description?: string;
}

interface ContentHubSwitchProps {
  items?: ContentHubSwitchItem[];
  className?: string;
  activeKey?: string;
  onChange?: (key: string, item: ContentHubSwitchItem) => void;
  preserveSearchOnLink?: boolean;
}

const DEFAULT_ITEMS: ContentHubSwitchItem[] = [
  { key: 'hot', label: '热门文章', to: '/p/hot?tab=hot', description: '编辑精选 + 热门阅读' },
  { key: 'rankings', label: '热门榜单', to: '/p/hot?tab=rankings', description: '按指标与周期查看' },
  { key: 'daily-hot', label: '每日热榜', to: '/p/hot?tab=daily-hot', description: '全网热点卡片速览' },
  { key: 'daily-new', label: '最新上新', to: '/p/hot?tab=daily-new', description: '近7日新收录站点' },
];

/**
 * 规范化路径，避免末尾斜杠造成激活态判断偏差。
 */
const normalizePathname = (pathname: string): string => {
  const text = String(pathname || '').trim();
  if (!text) return '/';
  if (text.length > 1 && text.endsWith('/')) return text.slice(0, -1);
  return text;
};

/**
 * 规范化 to 字段为 pathname + search，便于判断 query 路由的激活态。
 */
const normalizePathWithSearch = (to: string): string => {
  const text = String(to || '').trim();
  if (!text) return '/';
  try {
    const parsed = new URL(text, 'https://hao.uied.cn');
    return `${normalizePathname(parsed.pathname)}${parsed.search || ''}`;
  } catch (_error) {
    const [pathText, searchText = '' ] = text.split('?');
    const pathname = normalizePathname(pathText);
    return searchText ? `${pathname}?${searchText}` : pathname;
  }
};

/**
 * 内容中心大切换组件。
 */
const ContentHubSwitch: React.FC<ContentHubSwitchProps> = ({
  items,
  className,
  activeKey,
  onChange,
  preserveSearchOnLink = false,
}) => {
  const location = useLocation();
  const currentPathname = normalizePathname(location.pathname);
  const currentPathWithSearch = `${currentPathname}${location.search || ''}`;
  const itemRefMap = useRef<Map<string, HTMLAnchorElement | HTMLButtonElement | null>>(new Map());
  const list = useMemo(
    () => (Array.isArray(items) && items.length > 0 ? items : DEFAULT_ITEMS),
    [items],
  );

  /**
   * 移动端切换时自动滚动到激活项，避免标签被遮挡。
   */
  useEffect(() => {
    const resolvedActiveKey = String(activeKey || '').trim();
    const resolvedKey = resolvedActiveKey
      || list.find((item) => {
        const itemPath = normalizePathname(item.to);
        const itemPathWithSearch = normalizePathWithSearch(item.to);
        return itemPathWithSearch.includes('?')
          ? currentPathWithSearch === itemPathWithSearch
          : currentPathname === itemPath;
      })?.key
      || '';
    if (!resolvedKey) return;
    const targetNode = itemRefMap.current.get(resolvedKey);
    if (!targetNode) return;
    targetNode.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeKey, currentPathWithSearch, currentPathname, list]);

  return (
    <nav className={`content-hub-switch ${className || ''}`.trim()} aria-label="内容中心页面切换">
      {list.map((item) => {
        const itemPath = normalizePathname(item.to);
        const itemPathWithSearch = normalizePathWithSearch(item.to);
        const isActive = String(activeKey || '').trim()
          ? String(activeKey).trim() === item.key
          : (itemPathWithSearch.includes('?')
            ? currentPathWithSearch === itemPathWithSearch
            : currentPathname === itemPath);
        const sharedContent = (
          <>
            <span className="content-hub-switch__label">{item.label}</span>
            {item.description ? (
              <span className="content-hub-switch__desc">{item.description}</span>
            ) : null}
          </>
        );
        if (typeof onChange === 'function') {
          return (
            <button
              key={item.key}
              type="button"
              className={`content-hub-switch__item ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(item.key, item)}
              ref={(element) => {
                itemRefMap.current.set(item.key, element);
              }}
            >
              {sharedContent}
            </button>
          );
        }
        const to = preserveSearchOnLink && location.search
          ? `${item.to}${location.search}`
          : item.to;
        return (
          <Link
            key={item.key}
            to={to}
            className={`content-hub-switch__item ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            ref={(element) => {
              itemRefMap.current.set(item.key, element);
            }}
          >
            {sharedContent}
          </Link>
        );
      })}
    </nav>
  );
};

export default ContentHubSwitch;
