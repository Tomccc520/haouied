/**
 * @file NotFoundPage.tsx
 * @description 404页面组件，当用户访问不存在的页面时显示
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */
import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

/**
 * 404页面组件
 * 当用户访问不存在的页面时显示
 * 
 * @version 1.0.0
 * @author UIED技术团队 (https://fsuied.com)
 */
const NotFoundPage: React.FC = () => {
  return (
    <Container maxWidth="md" className="not-found-container">
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          py: 8
        }}
      >
        <Typography variant="h1" component="h1" className="error-code">
          404
        </Typography>
        
        <Typography variant="h4" component="h2" gutterBottom className="error-title">
          页面未找到
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph className="error-message">
          抱歉，您访问的页面不存在。
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Button 
            component={Link} 
            to="/" 
            variant="contained" 
            color="primary" 
            size="large"
            className="back-home-button"
          >
            返回首页
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default NotFoundPage; 