/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-05
 */
/**
 * @file SectionHeader/index.tsx
 * @description 通用区块标题组件 - 仅负责展示标题、描述与可选的下落文字动画
 */

import React from 'react';
import './index.css';
import FallingText from './FallingText';

interface SectionHeaderProps {
  title?: string;
  description?: string;
  fallingText?: string;
  highlightWords?: string[];
  colorMap?: Record<string, string>;
  enableAnimation?: boolean;
  backgroundImage?: string;
  className?: string;
  showBackground?: boolean;
}

/**
 * 规范化下落文字的高亮词数组，避免空值进入动画组件。
 */
const normalizeHighlightWords = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

/**
 * 规范化颜色映射，避免把非法值注入动画层。
 */
const normalizeColorMap = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};
  return Object.keys(value as Record<string, unknown>).reduce<Record<string, string>>((accumulator, key) => {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String((value as Record<string, unknown>)[key] || '').trim();
    if (!normalizedKey || !normalizedValue) return accumulator;
    accumulator[normalizedKey] = normalizedValue;
    return accumulator;
  }, {});
};

/**
 * 通用区块标题组件
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  fallingText,
  highlightWords,
  colorMap,
  enableAnimation = true,
  backgroundImage = '/bg.jpg',
  className = '',
  showBackground = true
}) => {
  const resolvedTitle = String(title || '').trim() || '发现优质工具与资源';
  const resolvedDescription = String(description || '').trim() || '通过统一配置展示区块标题、说明与关键词动画。';
  const resolvedFallingText = String(fallingText || '').trim() || resolvedTitle;
  const resolvedHighlightWords = normalizeHighlightWords(highlightWords);
  const resolvedColorMap = normalizeColorMap(colorMap);

  return (
    <header className={`hero-section-header ${className} ${showBackground ? 'with-background' : ''}`}>
      {showBackground && (
        <div
          className="hero-section-header-bg"
          style={{
            backgroundImage: `url(${backgroundImage})`
          }}
        >
          <div className="hero-section-header-overlay" />
        </div>
      )}

      <h2 className="hero-main-title">
        <div className="hero-text-container">
          {enableAnimation ? (
            <FallingText
              text={resolvedFallingText}
              highlightWords={resolvedHighlightWords}
              highlightClass="highlighted"
              colorMap={resolvedColorMap}
              trigger="hover"
              backgroundColor="transparent"
              wireframes={false}
              gravity={0.3}
              fontSize="1.6rem"
              mouseConstraintStiffness={0.8}
              density={0.01}
              frictionAir={0.03}
              restitution={0.8}
            />
          ) : (
            <span>{resolvedTitle}</span>
          )}
        </div>
      </h2>
      {resolvedDescription && (
        <p className="hero-section-desc">
          {resolvedDescription}
        </p>
      )}
    </header>
  );
};

export default SectionHeader;
