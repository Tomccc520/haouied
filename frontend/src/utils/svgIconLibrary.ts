/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-04
 *
 * @file svgIconLibrary.ts
 * @description 前端 svg:key 图标库解析与渲染工具
 */

export interface SvgIconLibraryItem {
  key: string;
  label: string;
  svg: string;
}

/**
 * 清洗 SVG 字符串，避免注入脚本与内联事件。
 */
export const sanitizeSvgMarkup = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const sanitized = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
  if (!sanitized.toLowerCase().startsWith('<svg')) return '';
  return sanitized;
};

/**
 * 规范化图标库数组，过滤无效 key 或空 SVG。
 */
export const normalizeSvgIconLibrary = (value: unknown): SvgIconLibraryItem[] => {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item, index) => {
      const key = String((item as { key?: unknown })?.key || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40);
      if (!key) return null;
      const svg = sanitizeSvgMarkup((item as { svg?: unknown })?.svg);
      if (!svg) return null;
      const label = String((item as { label?: unknown })?.label || key).trim().slice(0, 40) || key;
      const sort = Number.isFinite(Number((item as { sort?: unknown })?.sort))
        ? Number((item as { sort?: unknown })?.sort)
        : index + 1;
      return { key, label, svg, sort };
    })
    .filter((item): item is SvgIconLibraryItem & { sort: number } => Boolean(item))
    .sort((a, b) => a.sort - b.sort)
    .map(({ key, label, svg }) => ({ key, label, svg }));
};

/**
 * 将图标库数组转换为 key => svg 的快速检索表。
 */
export const createSvgIconMap = (value: unknown): Record<string, string> => {
  const map: Record<string, string> = {};
  normalizeSvgIconLibrary(value).forEach((item) => {
    map[item.key] = item.svg;
  });
  return map;
};

/**
 * 解析图标字段中的 svg:key 令牌。
 */
export const parseSvgIconToken = (iconValue: unknown): string => {
  const raw = String(iconValue || '').trim();
  if (!/^svg:/i.test(raw)) return '';
  return raw.slice(4).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
};

/**
 * 按图标字段解析真实 SVG，未命中时返回空字符串。
 */
export const resolveSvgIconMarkup = (
  iconValue: unknown,
  svgIconMap: Record<string, string>
): string => {
  const key = parseSvgIconToken(iconValue);
  if (!key) return '';
  return String(svgIconMap[key] || '').trim();
};
