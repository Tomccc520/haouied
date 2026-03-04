/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-04
 */
/**
 * @file useDetailLayoutWidthMode.ts
 * @description 读取详情页布局宽度模式，供分类/标签等频道页复用一致的自适应宽度
 */

import { useEffect, useState } from 'react';
import publicSettingService, { DEFAULT_DETAIL_PAGE } from '../services/publicSettingService';

export type DetailLayoutWidthMode = 'contained' | 'wide' | 'fluid';

/**
 * 规范化详情页宽度模式，避免异常值导致页面宽度类名失效。
 */
const normalizeDetailLayoutWidthMode = (mode?: string): DetailLayoutWidthMode => {
  if (mode === 'wide' || mode === 'fluid') return mode;
  return 'contained';
};

/**
 * 获取“详情页布局宽度模式”，用于让分类页和标签页与详情页保持一致。
 */
export const useDetailLayoutWidthMode = (): DetailLayoutWidthMode => {
  const [layoutWidthMode, setLayoutWidthMode] = useState<DetailLayoutWidthMode>(
    normalizeDetailLayoutWidthMode(DEFAULT_DETAIL_PAGE.layoutWidthMode),
  );

  useEffect(() => {
    let mounted = true;
    const fetchLayoutWidthMode = async () => {
      try {
        const detailPageConfig = await publicSettingService.getDetailPageConfig();
        if (!mounted) return;
        setLayoutWidthMode(normalizeDetailLayoutWidthMode(detailPageConfig?.layoutWidthMode));
      } catch (error) {
        if (!mounted) return;
        setLayoutWidthMode(normalizeDetailLayoutWidthMode(DEFAULT_DETAIL_PAGE.layoutWidthMode));
      }
    };
    fetchLayoutWidthMode();
    return () => {
      mounted = false;
    };
  }, []);

  return layoutWidthMode;
};

export default useDetailLayoutWidthMode;
