/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-05
 */
/**
 * @file components/AdminShortcutHint/index.tsx
 * @description 前台空态下的管理员快捷配置提示
 */

import React, { useMemo } from 'react';
import { canShowAdminShortcut, resolveAdminShortcutUrl } from '../../utils/adminShortcut';
import './index.css';

interface AdminShortcutHintProps {
  adminPath?: string;
  description?: string;
  actionText?: string;
  className?: string;
}

/**
 * 管理员快捷配置提示组件。
 */
const AdminShortcutHint: React.FC<AdminShortcutHintProps> = ({
  adminPath = '',
  description = '如果你是站点管理员，可直接进入后台完成配置后再刷新查看。',
  actionText = '去后台配置',
  className = '',
}) => {
  const visible = useMemo(() => canShowAdminShortcut() && Boolean(String(adminPath || '').trim()), [adminPath]);
  const targetUrl = useMemo(() => resolveAdminShortcutUrl(adminPath), [adminPath]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`admin-shortcut-hint ${className}`.trim()}>
      <span className="admin-shortcut-hint__text">{description}</span>
      <a
        className="admin-shortcut-hint__link"
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {actionText}
      </a>
    </div>
  );
};

export default AdminShortcutHint;
