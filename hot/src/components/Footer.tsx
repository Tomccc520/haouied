/**
 * @file Footer.tsx
 * @description 页脚组件，显示网站底部信息和版权声明
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Typography, Link, IconButton, Collapse } from '@mui/material';
import { getSiteInfo } from '../services/api';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import './Footer.css'; // 添加CSS文件引入

/**
 * 页脚组件
 * 动态获取WordPress站点信息并显示在页脚
 * 
 * @version 2.0.0
 * @author UIED技术团队 (https://fsuied.com)
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [siteInfo, setSiteInfo] = useState<{
    name?: string;
    description?: string;
    url?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // 获取WordPress站点信息
  useEffect(() => {
    const fetchSiteInfo = async () => {
      try {
        const data = await getSiteInfo();
        setSiteInfo({
          name: data.name,
          description: data.description,
          url: data.url
        });
      } catch (error) {
        console.error('获取站点信息失败', error);
        // 设置默认信息
        setSiteInfo({
          name: 'UIED',
          description: 'UIED热榜',
          url: 'https://www.uied.cn'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSiteInfo();
  }, []);

  // 切换显示/隐藏详细信息
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Box 
      component="footer" 
      className="footer-container"
      sx={{
        backgroundImage: 'url(https://img.uied.cn/wp-content/themes/b2Jitheme/Center/Assets/images/footer-bg.svg)'
      }}
    >
      <div className="footer-main">
        <Container maxWidth="lg">
          {/* 移动端版本的简洁页脚 */}
          <div className="footer-mobile-view">
            {/* 移动端始终可见的二维码 */}
            <div className="qr-container mobile-qr">
              <div className="qr-item">
                <img 
                  width="80" 
                  height="80" 
                  alt="交流群" 
                  src="https://img.uied.cn/wp-content/footer/tomda-qr-code.jpg" 
                />
                <p className="qr-tips">交流群</p>
              </div>
              <div className="qr-item">
                <img 
                  width="80" 
                  height="80" 
                  alt="关注公众号" 
                  src="https://uied-1304770347.cos.ap-guangzhou.myqcloud.com/wp-content/uploads/2022/07/qrcode.webp" 
                />
                <p className="qr-tips">公众号</p>
              </div>
            </div>
            
            <Typography variant="body2" className="textwidget mobile-text-center">
              UIED热榜汇聚AI领域热门内容，提供大模型资讯、AI应用教程和免费工具导航
            </Typography>
            
            <button className="footer-toggle-btn" onClick={toggleExpanded}>
              {expanded ? (
                <>收起更多 <ExpandLessIcon fontSize="small" /></>
              ) : (
                <>查看更多 <ExpandMoreIcon fontSize="small" /></>
              )}
            </button>
            
            <Collapse in={expanded} timeout="auto">
              <Grid container spacing={2}>
                {/* 支持与服务 */}
                <Grid item xs={6}>
                  <Typography variant="h6" className="widget-title">
                    支持与服务
                  </Typography>
                  <ul className="footer-menu">
                    <li><Link href="/vips" target="_blank">开通VIP</Link></li>
                    <li><Link href="/protocol" target="_blank">网站协议</Link></li>
                    <li><Link href="/legal" target="_blank">法律声明</Link></li>
                  </ul>
                </Grid>
                
                {/* 关注我们 */}
                <Grid item xs={6}>
                  <Typography variant="h6" className="widget-title">
                    关注我们
                  </Typography>
                  <ul className="footer-menu">
                    <li><Link href="https://huaban.com/user/uied" target="_blank">花瓣画板</Link></li>
                    <li><Link href="https://www.zhihu.com/org/uiedyong-hu-ti-yan-jiao-liu-xue-xi" target="_blank">知乎主页</Link></li>
                    <li><Link href="http://hezuo.tomda.top/" target="_blank">商务合作</Link></li>
                  </ul>
                </Grid>
                
                {/* 设计文章 */}
                <Grid item xs={6}>
                  <Typography variant="h6" className="widget-title">
                    设计文章
                  </Typography>
                  <ul className="footer-menu">
                    <li><Link href="https://www.uied.cn/category/wenzhang/ui-wenzhang" target="_blank">UI文章</Link></li>
                    <li><Link href="https://www.uied.cn/category/wenzhang/ai" target="_blank">AIGC文章</Link></li>
                    <li><Link href="https://www.uied.cn/category/wenzhang/ganhuo" target="_blank">设计干货</Link></li>
                  </ul>
                </Grid>
                
                {/* 设计素材 */}
                <Grid item xs={6}>
                  <Typography variant="h6" className="widget-title">
                    设计素材
                  </Typography>
                  <ul className="footer-menu">
                    <li><Link href="https://www.uied.cn/category/ui/zujian" target="_blank">设计组件</Link></li>
                    <li><Link href="https://www.uied.cn/category/mockup" target="_blank">设计样机</Link></li>
                    <li><Link href="https://www.uied.cn/category/3d" target="_blank">三维素材</Link></li>
                  </ul>
                </Grid>
              </Grid>
            </Collapse>
          </div>
          
          {/* 桌面版的完整页脚 */}
          <div className="footer-desktop-view">
            <Grid container spacing={3}>
              {/* 关于UIED */}
              <Grid item xs={12} sm={6} md={3} lg={3}>
                <Typography variant="h6" className="widget-title">
                  UIED-AI热榜资讯平台
                </Typography>
                <Typography variant="body2" className="textwidget">
                  UIED热榜汇聚国内外AI领域热门内容，包括文心一言、通义千问、DeepSeek、豆包AI、智谱AI、MiniMax等国内大模型资讯，百度文心、阿里通义、讯飞星火等AI应用教程。提供AI绘画、AI对话、AI写作、AI编程等免费工具导航，涵盖文生图、图生图、AI音视频处理等实用技巧。每日更新国内AI技术趋势、设计资源、开发教程，助您把握AI发展方向。
                </Typography>
              </Grid>
              
              {/* 支持与服务 */}
              <Grid item xs={6} sm={6} md={2} lg={2}>
                <Typography variant="h6" className="widget-title">
                  支持与服务
                </Typography>
                <ul className="footer-menu">
                  <li><Link href="/vips" target="_blank">开通VIP</Link></li>
                  <li><Link href="/protocol" target="_blank">网站协议</Link></li>
                  <li><Link href="/legal" target="_blank">法律声明</Link></li>
                  <li><Link href="https://www.uied.cn/sitemap.xml" target="_blank">网站地图</Link></li>
                </ul>
              </Grid>
              
              {/* 关注我们 */}
              <Grid item xs={6} sm={6} md={2} lg={2}>
                <Typography variant="h6" className="widget-title">
                  关注我们
                </Typography>
                <ul className="footer-menu">
                  <li><Link href="https://huaban.com/user/uied" target="_blank">花瓣画板</Link></li>
                  <li><Link href="https://www.zhihu.com/org/uiedyong-hu-ti-yan-jiao-liu-xue-xi" target="_blank">知乎主页</Link></li>
                  <li><Link href="https://www.88sheji.cn/" target="_blank">设计导航</Link></li>
                  <li><Link href="http://hezuo.tomda.top/" target="_blank">商务合作</Link></li>
                </ul>
              </Grid>
              
              {/* 设计文章 */}
              <Grid item xs={6} sm={6} md={2} lg={2}>
                <Typography variant="h6" className="widget-title">
                  设计文章
                </Typography>
                <ul className="footer-menu">
                  <li><Link href="https://www.uied.cn/category/wenzhang/ui-wenzhang" target="_blank">UI文章</Link></li>
                  <li><Link href="https://www.uied.cn/category/wenzhang/ai" target="_blank">AIGC文章</Link></li>
                  <li><Link href="https://www.uied.cn/category/wenzhang/ganhuo" target="_blank">设计干货</Link></li>
                  <li><Link href="https://www.uied.cn/category/wenzhang/tool" target="_blank">效率工具</Link></li>
                </ul>
              </Grid>
              
              {/* 设计素材 */}
              <Grid item xs={6} sm={6} md={1.2} lg={1.2}>
                <Typography variant="h6" className="widget-title">
                  设计素材
                </Typography>
                <ul className="footer-menu">
                  <li><Link href="https://www.uied.cn/category/ui/zujian" target="_blank">设计组件</Link></li>
                  <li><Link href="https://www.uied.cn/category/mockup" target="_blank">设计样机</Link></li>
                  <li><Link href="https://www.uied.cn/category/3d" target="_blank">三维素材</Link></li>
                </ul>
              </Grid>
              
              {/* 关注交流 */}
              <Grid item xs={6} sm={6} md={1.8} lg={1.8}>
                <Typography variant="h6" className="widget-title">
                  关注交流
                </Typography>
                <div className="qr-container">
                  <div className="qr-item">
                    <img 
                      width="80" 
                      height="80" 
                      alt="交流群" 
                      src="https://img.uied.cn/wp-content/footer/tomda-qr-code.jpg" 
                    />
                    <p className="qr-tips">交流群</p>
                  </div>
                  <div className="qr-item">
                    <img 
                      width="80" 
                      height="80" 
                      alt="关注公众号" 
                      src="https://uied-1304770347.cos.ap-guangzhou.myqcloud.com/wp-content/uploads/2022/07/qrcode.webp" 
                    />
                    <p className="qr-tips">公众号</p>
                  </div>
                </div>
              </Grid>
            </Grid>
          </div>
        </Container>
      </div>
      
      {/* 友情链接 */}
      <div className="friend-links-container">
        <Container maxWidth="lg">
          <Typography variant="h6" className="friend-links-title">
            友情链接:
          </Typography>
          <span className="friend-links-list">
            <Link href="https://www.uied.cn/" target="_blank" className="friend-link">UIED学习平台</Link>
            {" \u00A0\u00A0\u00A0"}
            <Link href="https://uiedtool.com/" target="_blank" className="friend-link">UIED免费工具</Link>
            {" \u00A0\u00A0\u00A0"}
            <Link href="https://fsuied.com/" target="_blank" className="friend-link">UIED技术团队</Link>
            {" \u00A0\u00A0\u00A0"}
            <Link href="https://hot.uied.cn/" target="_blank" className="friend-link">UIED资讯热榜</Link>
            {" \u00A0\u00A0\u00A0"}
            <Link href="https://www.88sheji.cn/" target="_blank" className="friend-link">拜拜导航</Link>
            {" \u00A0\u00A0\u00A0"}
            <Link href="https://www.tomda.top/" target="_blank" className="friend-link">Tomda</Link>
          </span>
        </Container>
      </div>
      
      {/* 底部版权信息 */}
      <div className="footer-bottom">
        <Container maxWidth="lg">
          <div className="footer-copyright">
            <p className="copyright-desktop">
              版权所有 © {currentYear} <Link href="https://www.uied.cn" rel="home">UIED AI热榜资讯平台</Link> · 
              佛山市南海区迅捷腾达电子商务服务中心 ·
              <a rel="nofollow" target="_blank" href="https://beian.miit.gov.cn">粤ICP备2022056875号</a> ·
              <a rel="nofollow" target="_blank" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=44060502003482">
                <img src="https://img.uied.cn/wp-content/themes/b2/Assets/fontend/images/beian-ico.png" alt="备案图标" />
                粤公网安备44060502003482号
              </a>
            </p>
            
            <div className="copyright-mobile">
              <p>版权所有 © {currentYear} <Link href="https://www.uied.cn" rel="home">UIED AI热榜资讯平台</Link></p>
              <p>佛山市南海区迅捷腾达电子商务服务中心</p>
              <p><a rel="nofollow" target="_blank" href="https://beian.miit.gov.cn">粤ICP备2022056875号</a></p>
              <p>
                <a rel="nofollow" target="_blank" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=44060502003482">
                  <img src="https://img.uied.cn/wp-content/themes/b2/Assets/fontend/images/beian-ico.png" alt="备案图标" />
                  粤公网安备44060502003482号
                </a>
              </p>
            </div>
          </div>
        </Container>
      </div>
    </Box>
  );
};

export default Footer;