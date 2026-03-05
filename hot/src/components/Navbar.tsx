
/**
 * @file Navbar.tsx
 * @description 顶部导航栏组件，负责站点顶部的主要导航
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.3.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box, 
  useTheme, 
  useMediaQuery,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import BoltIcon from '@mui/icons-material/Bolt';

/**
 * 顶部导航栏组件
 * 负责站点顶部的主要导航
 * 
 * @version 1.3.0
 * @author UIED技术团队 (https://fsuied.com)
 */
const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // 子菜单锚点（用于桌面端悬停展开 AIGC 二级菜单）
  const [submenuAnchorEl, setSubmenuAnchorEl] = useState<null | HTMLElement>(null);
  // 当前打开二级菜单的索引
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // 控制导航栏显示/隐藏的滚动监听
  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 200) { // 向下滚动且超过200px时隐藏
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  // 定义导航菜单项
  const menuItems = [
    { text: '返回主站', link: 'https://www.uied.cn', external: true },
    { text: '快讯', link: 'https://uiedtool.com/tools/ai-news', external: true },
    // 新增 Design 菜单（含二级菜单），父级点击默认跳转到“设计文章”
    {
      text: 'Design',
      link: 'https://www.uied.cn/category/wenzhang/ui-wenzhang',
      external: true,
      children: [
        { text: '设计文章', link: 'https://www.uied.cn/category/wenzhang/ui-wenzhang', external: true },
        { text: '设计导航', link: 'https://hao.uied.cn/', external: true },
        { text: '设计工具', link: 'https://uiedtool.com/', external: true },
        { text: '设计资讯', link: 'https://hot.uied.cn/', external: true },
        { text: '设计交流', link: 'https://www.uied.cn/wechat', external: true },
      ]
    },
    { text: '摸鱼', label: '偷学', labelType: 'info', link: 'https://www.uied.cn/circle', external: true },
    { text: '导航', link: 'https://www.88sheji.cn/', external: true },
    // AIGC 增加二级菜单（桌面端下拉，移动端同级展开）
    { 
      text: 'AIGC', 
      label: 'New', 
      labelType: 'shop', 
      link: 'https://www.uied.cn/aigc', 
      external: true,
      // children 为二级菜单项
      children: [
        { text: 'AI文章', link: 'https://www.uied.cn/category/aigc/ai', external: true },
        { text: 'AI资讯', link: 'https://hot.uied.cn/ai-realtime', external: true },
        { text: 'AI工具', link: 'https://hao.uied.cn/ai', external: true },
        { text: 'AI交流', link: 'https://www.uied.cn/wechat', external: true },
        { text: 'AI知识库', link: 'https://dfz3y4k04g.feishu.cn/wiki/ZjddwTFpWivK6ukwBoDc5DoHnVt', external: true },
      ]
    },
    { text: '投稿', link: 'https://www.uied.cn/tougao', external: true },
    { text: '技术团队', link: 'https://fsuied.com/', external: true },
    { text: 'GPT-', label: '可生图', labelType: 'info', link: 'https://nf.video/mbx1u6/?gid=18', external: true },
    { text: '在线工具', label: '免费', labelType: 'shop', link: 'https://uiedtool.com/', external: true },
  ];

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // 打开二级菜单（桌面端悬停）
  const handleOpenSubmenu = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setSubmenuAnchorEl(event.currentTarget);
    setOpenSubmenuIndex(index);
  };

  // 关闭二级菜单
  const handleCloseSubmenu = () => {
    setSubmenuAnchorEl(null);
    setOpenSubmenuIndex(null);
  };

  const handleNavItemClick = (link: string, external: boolean) => {
    if (external) {
      window.open(link, '_blank');
    } else {
      window.location.href = link;
    }
    handleClose();
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0} 
      sx={{ 
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease-in-out',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#fff',
          opacity: 0.8,
          zIndex: -1
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -20,
          right: 0,
          bottom: 0,
          left: 0,
          background: 'url(https://img.uied.cn/wp-content/themes/b2Jitheme/Center/Assets/images/one_header.png) no-repeat top center / 1400px',
          zIndex: 9,
          pointerEvents: 'none'
        },
        zIndex: 2000,
      }}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        padding: { xs: '0.5rem 1rem', sm: '0.5rem 2rem' },
        maxWidth: '1230px',
        margin: '0 auto',
        width: '100%',
        minHeight: { xs: '56px', sm: '64px' }
      }}>
        {/* 左侧Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src="/logo-3.svg"
            alt="UIED Logo"
            sx={{
              height: '32px',
              width: 'auto',
              cursor: 'pointer'
            }}
            onClick={() => window.location.href = '/'}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={() => window.location.href = '/'}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1976d2',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                '&::after': {
                  content: '"•"',
                  opacity: 0.5,
                  fontSize: '12px'
                }
              }}
            >
              Trending
            </Typography>
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#666',
                ml: 0.8
              }}
            >
              Top 50
            </Typography>
          </Box>
        </Box>

        {/* 右侧导航和按钮 */}
        {isMobile ? (
          <div>
            <IconButton
              edge="end"
              aria-label="menu"
              onClick={handleMenu}
              sx={{ color: '#333' }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{ 
                mt: '45px',
                zIndex: 2001,
                '& .MuiPaper-root': {
                  minWidth: '200px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden'
                },
                '& .MuiList-root': {
                  padding: '8px'
                }
              }}
            >
              {menuItems.map((item, index) => (
                <Box key={index}>
                  {/* 父级项（移动端作为分组标题，可点击跳转父链接） */}
                  <MenuItem 
                    onClick={() => handleNavItemClick(item.link, item.external)}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      color: '#333',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.03)'
                      }
                    }}
                  >
                    <span>{item.text}</span>
                    {item.label && (
                      <Chip 
                        label={item.label} 
                        size="small" 
                        sx={{ 
                          height: '20px', 
                          fontSize: '11px',
                          ml: 1,
                          fontWeight: 600,
                          backgroundColor: item.labelType === 'info' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(255, 77, 79, 0.08)',
                          color: item.labelType === 'info' ? '#0056f3' : '#ff4d4f',
                          border: item.labelType === 'info' 
                            ? '1px solid rgba(0, 86, 243, 0.2)' 
                            : '1px solid rgba(255, 77, 79, 0.2)',
                          '& .MuiChip-label': {
                            px: 1
                          }
                        }}
                      />
                    )}
                  </MenuItem>
                  {/* 子级项（若存在 children，则在移动端同级展开展示） */}
                  {Array.isArray((item as any).children) && (item as any).children.map((sub: any, subIndex: number) => (
                    <MenuItem
                      key={`sub-${index}-${subIndex}`}
                      onClick={() => handleNavItemClick(sub.link, !!sub.external)}
                      sx={{
                        ml: 1,
                        borderRadius: '8px',
                        color: '#333',
                        fontSize: '13px',
                        fontWeight: 500,
                        padding: '8px 16px',
                        opacity: 0.9,
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.03)'
                        }
                      }}
                    >
                      {sub.text}
                    </MenuItem>
                  ))}
                </Box>
              ))}
            </Menu>
          </div>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {menuItems.map((item, index) => (
              <Box 
                key={index}
                sx={{ position: 'relative' }}
                onMouseEnter={(e) => {
                  if ((item as any).children) {
                    handleOpenSubmenu(e as any, index);
                  }
                }}
                onMouseLeave={handleCloseSubmenu}
              >
                <Button 
                  onClick={() => handleNavItemClick(item.link, item.external)}
                  sx={{ 
                    color: '#333',
                    fontWeight: 500,
                    textTransform: 'none',
                    position: 'relative',
                    opacity: 0.9,
                    fontSize: '16px',
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  {item.text}
                  {item.label && (
                    <Chip 
                      label={item.label} 
                      size="small" 
                      sx={{ 
                        height: '18px', 
                        fontSize: '11px',
                        ml: 0.5,
                        position: 'absolute',
                        top: '-8px',
                        right: '-12px',
                        backgroundColor: item.labelType === 'info' ? 'transparent' : '#ff4d4f',
                        background: item.labelType === 'info' ? 'linear-gradient(to right, #0056f3 0%, #2b76ff 100%)' : '#ff4d4f',
                        color: '#fff'
                      }}
                    />
                  )}
                </Button>
                {/* 二级菜单（仅当存在 children 且处于 hover 时显示） */}
                {Array.isArray((item as any).children) && (
                  <Menu
                    anchorEl={submenuAnchorEl}
                    open={openSubmenuIndex === index}
                    onClose={handleCloseSubmenu}
                    MenuListProps={{ onMouseLeave: handleCloseSubmenu }}
                    sx={{ 
                      mt: '8px',
                      '& .MuiPaper-root': {
                        minWidth: '180px',
                        borderRadius: '12px',
                        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(0, 0, 0, 0.06)'
                      }
                    }}
                  >
                    {(item as any).children.map((sub: any, subIndex: number) => (
                      <MenuItem
                        key={`desktop-sub-${index}-${subIndex}`}
                        onClick={() => handleNavItemClick(sub.link, !!sub.external)}
                        sx={{
                          fontSize: '14px',
                          padding: '8px 12px',
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.04)'
                          }
                        }}
                      >
                        {sub.text}
                      </MenuItem>
                    ))}
                  </Menu>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 