/**
 * @file placeholderImages.ts
 * @description 站点内置占位图生成工具，避免默认数据依赖外部图片资源
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-13
 */

export interface PlaceholderImagePalette {
  backgroundStart: string;
  backgroundEnd: string;
  accent: string;
  text?: string;
}

export interface PlaceholderImageOptions {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  width?: number;
  height?: number;
  palette?: PlaceholderImagePalette;
}

const DEFAULT_PALETTE: PlaceholderImagePalette = {
  backgroundStart: '#EAF2FF',
  backgroundEnd: '#F7FAFF',
  accent: '#2563EB',
  text: '#0F172A',
};

/**
 * 转义 SVG 文本中的特殊字符，避免标题文案导致 SVG 结构破坏。
 */
const escapeSvgText = (value: string): string => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * 生成品牌风格的内置占位图，返回可直接用于 img/background-image 的 data URI。
 */
export const buildPlaceholderImage = (options: PlaceholderImageOptions): string => {
  const palette = {
    ...DEFAULT_PALETTE,
    ...(options.palette || {}),
  };
  const width = Math.max(320, Number(options.width || 1200));
  const height = Math.max(180, Number(options.height || 675));
  const title = escapeSvgText(String(options.title || 'UIED'));
  const subtitle = escapeSvgText(String(options.subtitle || '').trim());
  const eyebrow = escapeSvgText(String(options.eyebrow || 'UIED').trim());
  const textColor = palette.text || DEFAULT_PALETTE.text || '#0F172A';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.backgroundStart}"/>
          <stop offset="1" stop-color="${palette.backgroundEnd}"/>
        </linearGradient>
        <linearGradient id="accent" x1="${width * 0.1}" y1="${height * 0.15}" x2="${width * 0.9}" y2="${height * 0.85}" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.accent}" stop-opacity="0.22"/>
          <stop offset="1" stop-color="${palette.accent}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="28" fill="url(#bg)"/>
      <circle cx="${width - 128}" cy="${height * 0.26}" r="96" fill="url(#accent)"/>
      <circle cx="${width * 0.2}" cy="${height * 0.78}" r="84" fill="url(#accent)"/>
      <rect x="${width * 0.08}" y="${height * 0.18}" width="${Math.max(140, width * 0.18)}" height="30" rx="15" fill="${palette.accent}" fill-opacity="0.12"/>
      <text x="${width * 0.1}" y="${height * 0.205}" fill="${palette.accent}" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700" letter-spacing="1.2">${eyebrow}</text>
      <text x="${width * 0.1}" y="${height * 0.47}" fill="${textColor}" font-size="${Math.max(34, width * 0.038)}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">${title}</text>
      ${subtitle ? `<text x="${width * 0.1}" y="${height * 0.58}" fill="${textColor}" fill-opacity="0.72" font-size="${Math.max(18, width * 0.018)}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${subtitle}</text>` : ''}
      <path d="M${width * 0.1} ${height * 0.68}H${width * 0.34}" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round" stroke-opacity="0.72"/>
    </svg>
  `.replace(/\s+/g, ' ').trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

