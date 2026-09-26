/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-04
 */
/**
 * @file changelogService.ts
 * @description 更新日志服务：从 GitHub Releases 同步并做本地缓存兜底
 */

export type ChangelogType = 'feature' | 'improve' | 'fix';
export type ChangelogScope = 'frontend' | 'backend' | 'fullstack';

export interface ChangelogChange {
  type: ChangelogType;
  text: string;
  scope?: ChangelogScope;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  changes: ChangelogChange[];
  releaseUrl?: string;
  source?: 'github' | 'local';
}

const RELEASE_API = 'https://api.github.com/repos/Tomccc520/haouied/releases';
const CACHE_KEY = 'uied_nav_changelog_cache_v1';
const CACHE_TTL = 10 * 60 * 1000;

/**
 * 读取浏览器缓存中的 Release 列表
 */
const readReleaseCache = (): ChangelogRelease[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as { data?: ChangelogRelease[]; timestamp?: number };
    const timestamp = Number(payload?.timestamp || 0);
    if (!timestamp || Date.now() - timestamp > CACHE_TTL) return null;
    return Array.isArray(payload?.data) ? payload.data : null;
  } catch {
    return null;
  }
};

/**
 * 写入 Release 列表到浏览器缓存
 */
const writeReleaseCache = (list: ChangelogRelease[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: list,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // localStorage 不可用时静默降级
  }
};

/**
 * 将 ISO 日期转换为 YYYY-MM-DD
 */
const formatReleaseDate = (isoLike: string): string => {
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

/**
 * 根据文本语义推断变更类型
 */
const inferChangeType = (text: string): ChangelogType => {
  const value = String(text || '').toLowerCase();
  if (/fix|修复|bug|错误|异常/.test(value)) return 'fix';
  if (/optimize|优化|refactor|重构|upgrade|升级|improve/.test(value)) return 'improve';
  return 'feature';
};

/**
 * 解析 Release body 为标准变更列表
 */
const parseReleaseBody = (body: string): ChangelogChange[] => {
  const lines = String(body || '')
    .split('\n')
    .map((line) => line.replace(/^[-*+\s]+/, '').trim())
    .filter(Boolean)
    .filter((line) => !/^#+\s*/.test(line));

  if (!lines.length) {
    return [
      {
        type: 'feature',
        text: '详见发布说明',
      },
    ];
  }

  return lines.slice(0, 12).map((line) => ({
    type: inferChangeType(line),
    text: line,
  }));
};

/**
 * 规范化单条 GitHub Release 数据
 */
const normalizeGitHubRelease = (item: any): ChangelogRelease | null => {
  if (!item || item.draft === true) return null;
  const version = String(item.tag_name || '').trim().replace(/^v/i, '');
  if (!version) return null;
  const title = String(item.name || item.tag_name || `版本 ${version}`).trim();
  const date = formatReleaseDate(item.published_at || item.created_at || '');
  return {
    version,
    date: date || formatReleaseDate(new Date().toISOString()),
    title,
    changes: parseReleaseBody(String(item.body || '')),
    releaseUrl: String(item.html_url || '').trim() || undefined,
    source: 'github',
  };
};

/**
 * 从 GitHub Releases 拉取更新记录（含缓存）
 */
export const fetchGitHubChangelog = async (
  options: { forceRefresh?: boolean; limit?: number } = {},
): Promise<ChangelogRelease[]> => {
  const forceRefresh = options.forceRefresh === true;
  const limit = Number.isFinite(Number(options.limit)) ? Math.max(1, Number(options.limit)) : 12;

  if (!forceRefresh) {
    const cached = readReleaseCache();
    if (cached && cached.length) return cached;
  }

  const response = await fetch(RELEASE_API, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub Release 请求失败：${response.status}`);
  }

  const list = (await response.json()) as any[];
  const normalized = (Array.isArray(list) ? list : [])
    .map(normalizeGitHubRelease)
    .filter((item): item is ChangelogRelease => Boolean(item))
    .slice(0, limit);

  if (normalized.length) {
    writeReleaseCache(normalized);
  }
  return normalized;
};
