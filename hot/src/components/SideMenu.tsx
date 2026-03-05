/**
 * @file SideMenu.tsx
 * @description 侧边导航菜单组件
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.1.0
 */

import React from 'react';
import { FileTextOutlined, HomeOutlined, RobotOutlined, DesktopOutlined, StarOutlined, UserOutlined, CrownOutlined, TeamOutlined, ReadOutlined, AppstoreOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import './SideMenu.css';

/**
 * 侧边导航菜单组件
 * 包含最新文章、热门文章、AI实时文章、设计文章、优秀作者、圈子和返回主站
 */
const SideMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // 菜单配置
  const menuItems = [
    {
      path: '/',
      icon: <FileTextOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: '最新文章',
      isActive: currentPath === '/' || currentPath === '/ant-ranking'
    },
    {
      path: '/hot-articles',
      icon: <StarOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: '热门文章',
      isActive: currentPath === '/hot-articles'
    },
    {
      path: '/ai-realtime',
      icon: <RobotOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: 'AI实时文章',
      isActive: currentPath === '/ai-realtime'
    },
    {
      path: '/ai-products',
      icon: <TrophyOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: 'AI产品榜单',
      isActive: currentPath === '/ai-products'
    },
    {
      path: '/design-realtime',
      icon: <DesktopOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: '设计文章',
      isActive: currentPath === '/design-realtime'
    },
    {
      path: '/design-resources',
      icon: <AppstoreOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: '设计素材',
      isActive: currentPath === '/design-resources'
    },
    {
      path: '/top-authors',
      icon: <CrownOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: '优秀作者',
      isActive: currentPath === '/top-authors'
    },
    {
      path: '/circles',
      icon: <ReadOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: '学习圈子',
      isActive: currentPath === '/circles'
    },
    {
      path: 'https://www.uied.cn',
      icon: <HomeOutlined className="icon" style={{ fontSize: '16px' }} />,
      label: '返回主站',
      isExternal: true
    }
  ];

  // 菜单项点击处理
  const handleMenuClick = (path: string, isExternal?: boolean) => {
    if (isExternal) {
      window.location.href = path;
    } else {
      navigate(path);
    }
  };

  return (
    <div className="side-menu">
      <ul className="side-menu-list">
        {menuItems.map((item, index) => (
          <li 
            key={item.path}
            className={`side-menu-item ${item.isActive ? 'active' : ''}`}
            onClick={() => handleMenuClick(item.path, item.isExternal)}
          >
            {item.icon} {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SideMenu; 