/**
 * @file RankingHeader.tsx
 * @description 热榜标题组件，显示UIED热榜标题和描述
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.1.0
 */
import React, { useState, useEffect } from 'react';
import styles from './RankingHeader.module.css';
import FallingText from './FallingText';

/**
 * 热榜标题组件
 * 包含UIED热榜标题和描述
 * 
 * 这个组件从AntRankingPage中抽离出来，现在在App级别使用
 * 为所有页面提供统一的标题展示
 * 
 * 设计特点：
 * - 简洁统一的颜色方案
 * - 清晰的视觉层次
 * - 响应式布局适配各种设备
 * - 标题添加了物理引擎驱动的文字下落动画效果
 * 
 * @returns {JSX.Element} 热榜标题组件
 * @version 1.1.0
 */
const RankingHeader: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检查是否为移动端设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始化检查
    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端仅显示前10个图标，大幅减少物理引擎计算量，解决卡顿问题；PC端显示全部
  const displayIcons = React.useMemo(() => isMobile ? AI_ICONS.slice(0, 10) : AI_ICONS, [isMobile]);

  // 移动端精简文字胶囊数量，减少物理引擎计算量
  const displayText = isMobile ? MOBILE_TEXT : FULL_TEXT;

  return (
    <header className={styles.rankingHeader}>
      <h2 className={styles.mainTitle}>
        <div className={styles.textContainer} style={{ height: isMobile ? '200px' : '260px' }}>
          <FallingText
            // 纯概念关键词，避免与图标品牌重复
            text={displayText}
            highlightWords={HIGHLIGHT_WORDS}
            highlightClass="highlighted"
            colorMap={COLOR_MAP}
            icons={displayIcons}
            trigger="auto"
            backgroundColor="transparent"
            wireframes={false}
            gravity={0.3}
            fontSize={isMobile ? '0.8rem' : '1rem'}
            iconSize={isMobile ? 32 : 42}
            mouseConstraintStiffness={1.2} // 显著增加刚度 (原0.8)，提升拖拽跟手度
            density={0.01}
            frictionAir={0.03}
            restitution={0.8}
            enableMouse={true} // 始终启用交互，内部通过智能触控逻辑解决滚动冲突
          />
        </div>
      </h2>
      <p className={styles.rankingDesc}>
        聚合国内外AI精选内容，探索AI技术前沿与应用
      </p>
    </header>
  );
};

// 定义静态常量，避免重渲染时重复创建对象导致物理引擎重建
const HIGHLIGHT_WORDS = ["UIED", "AIGC", "大模型", "Transformer", "Agent", "RAG", "LLM", "Prompt", "Embedding", "Fine-tuning", "Multimodal"];

const COLOR_MAP = {
  // 核心概念 - 科技蓝 (Tech Blue)
  "UIED": "highlighted",
  "AI": "highlighted",
  "生成式AI": "highlighted",
  "深度学习": "highlighted",
  "神经网络": "highlighted",
  "机器学习": "highlighted",
  "算法": "highlighted",
  "算力": "highlighted",
  "LLM": "highlighted",
  "Multimodal": "highlighted",

  // 创意与模型架构 - 创意紫 (Creative Purple)
  "Transformer": "highlight-purple",
  "AIGC": "highlight-purple",
  "Embedding": "highlight-purple",
  "Fine-tuning": "highlight-purple",

  // 智能体与应用 - 灵动绿 (Fresh Green)
  "Agent": "highlight-green",
  "智能体": "highlight-green",
  "RAG": "highlight-green",
  "知识库": "highlight-green",

  // 交互与提示 - 活力橙 (Warm Orange)
  "大模型": "highlight-orange",
  "Prompt": "highlight-orange",
  "提示词": "highlight-orange",
  "CoT": "highlight-orange",
  "RLHF": "highlight-orange",
};

const FULL_TEXT = "UIED AI AIGC 大模型 生成式AI 神经网络 Transformer 机器学习 深度学习 智能体 Agent RAG 知识库 算力 算法 提示词 Prompt Embedding Fine-tuning LLM Multimodal CoT RLHF";
const MOBILE_TEXT = "UIED AI AIGC 大模型 生成式AI 智能体 Agent"; // 进一步精简，避免拥挤遮挡

// 定义AI图标列表
// 使用 icons-static-svg 通常是彩色品牌原色，确保视觉丰富
const AI_ICONS = [
  // 第一梯队：全球顶级模型 (混合排序)
  { key: 'openai', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/openai.svg', alt: 'OpenAI' },
  { key: 'deepseek', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/deepseek-color.svg', alt: 'DeepSeek' },
  { key: 'claude', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/claude-color.svg', alt: 'Claude' },
  { key: 'midjourney', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/midjourney.svg', alt: 'Midjourney' },
  { key: 'wenxin', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/wenxin.svg', alt: '文心一言' },
  
  // 第二梯队：国产头部模型
  { key: 'kimi', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/kimi.svg', alt: 'Kimi' },
  { key: 'doubao', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/doubao-color.svg', alt: '豆包' },
  { key: 'qwen', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/qwen-color.svg', alt: '通义千问' },
  { key: 'zhipu', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/zhipu-color.svg', alt: '智谱AI' },
  { key: 'jimeng', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/jimeng-color.svg', alt: '即梦AI' },
  
  // 第三梯队：国际知名模型
  { key: 'gemini', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/gemini-color.svg', alt: 'Gemini' },
  { key: 'stability', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/stability-color.svg', alt: 'Stable Diffusion' },
  { key: 'copilot', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/copilot-color.svg', alt: 'Copilot' },
  
  // 第四梯队：其他优秀国产模型
  { key: 'hunyuan', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/hunyuan.svg', alt: '混元' },
  { key: 'minimax', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/minimax.svg', alt: 'MiniMax' },
  { key: 'spark', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/spark.svg', alt: '讯飞星火' },
  { key: 'baichuan', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/baichuan.svg', alt: '百川' },
  { key: 'yi', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/yi.svg', alt: 'Yi (零一万物)' },
  { key: 'sensenova', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/sensenova.svg', alt: '商汤日日新' },
  { key: 'stepfun', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/stepfun.svg', alt: '阶跃星辰' },
  { key: 'internlm', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/internlm.svg', alt: '书生·浦语' },
  { key: 'tiangong', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/tiangong.svg', alt: '天工' },
  // 第五梯队：新锐/垂直领域模型
  { key: 'perplexity', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/perplexity-color.svg', alt: 'Perplexity' },
  { key: 'mistral', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/mistral-color.svg', alt: 'Mistral' },
  { key: 'runway', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/runway.svg', alt: 'Runway' },
  { key: 'suno', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/suno.svg', alt: 'Suno' },
  { key: 'udio', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/udio.svg', alt: 'Udio' },
  { key: 'kling', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/kling.svg', alt: '可灵' },
  { key: 'hailuo', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/hailuo.svg', alt: '海螺AI' },
  { key: 'moonshot', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/moonshot.svg', alt: '月之暗面' },
  
  // 第六梯队：创意/平台/工具
  { key: 'modelscope', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/modelscope.svg', alt: '魔搭社区' },
  { key: 'huggingface', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/huggingface.svg', alt: 'HuggingFace' },
  { key: 'civitai', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/civitai.svg', alt: 'Civitai' },
  { key: 'luma', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/luma.svg', alt: 'Luma' },
  { key: 'pika', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/pika.svg', alt: 'Pika' },
  { key: 'tripo', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/tripo.svg', alt: 'Tripo' },
  { key: 'vidu', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/vidu.svg', alt: 'Vidu' },
];

// 确保组件被正确导出
export default React.memo(RankingHeader); 