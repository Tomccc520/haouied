/**
 * @file config/index.ts
 * @description 配置文件
 */
import React from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';
import { RankTab } from '../types';

// 菜单项配置
export const menuItems = [
  {
    key: 'latest',
    title: '最新文章',
    icon: React.createElement(ClockCircleOutlined),
    description: '最新发布的内容',
    category: 'ranking'
  }
];

// 标签页配置
export const tabs = [
  {
    key: 'latest',
    title: '最新文章',
    icon: React.createElement(ClockCircleOutlined),
    description: '最新发布的内容',
    category: 'ranking',
    dataType: 'latest-posts'
  }
] as RankTab[]; 