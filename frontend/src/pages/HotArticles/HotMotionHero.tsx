/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
/**
 * @file HotMotionHero.tsx
 * @description 热门文章页顶部物理引擎头图
 */

import React, { useEffect, useMemo, useState } from 'react';
import FallingText from './FallingText';
import './HotMotionHero.css';

interface IconToken {
  key: string;
  src: string;
  alt: string;
}

interface HotMotionHeroProps {
  description?: string;
}

const HIGHLIGHT_WORDS = [ 'UIED', 'AIGC', '大模型', 'Transformer', 'Agent', 'RAG', 'LLM', 'Prompt', 'Embedding', 'Fine-tuning', 'Multimodal' ];
const COLOR_MAP: Record<string, string> = {
  UIED: 'highlighted',
  AI: 'highlighted',
  生成式AI: 'highlighted',
  深度学习: 'highlighted',
  神经网络: 'highlighted',
  机器学习: 'highlighted',
  算法: 'highlighted',
  算力: 'highlighted',
  LLM: 'highlighted',
  Multimodal: 'highlighted',
  Transformer: 'highlight-purple',
  AIGC: 'highlight-purple',
  Embedding: 'highlight-purple',
  'Fine-tuning': 'highlight-purple',
  Agent: 'highlight-green',
  智能体: 'highlight-green',
  RAG: 'highlight-green',
  知识库: 'highlight-green',
  大模型: 'highlight-orange',
  Prompt: 'highlight-orange',
  提示词: 'highlight-orange',
  CoT: 'highlight-orange',
  RLHF: 'highlight-orange',
};

const FULL_TEXT = 'UIED AI AIGC 大模型 生成式AI 神经网络 Transformer 机器学习 深度学习 智能体 Agent RAG 知识库 算力 算法 提示词 Prompt Embedding Fine-tuning LLM Multimodal CoT RLHF';
const MOBILE_TEXT = 'UIED AI AIGC 大模型 生成式AI 智能体 Agent';

const ICON_TOKENS: IconToken[] = [
  { key: 'openai', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/openai.svg', alt: 'OpenAI' },
  { key: 'deepseek', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/deepseek-color.svg', alt: 'DeepSeek' },
  { key: 'claude', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/claude-color.svg', alt: 'Claude' },
  { key: 'gemini', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/gemini-color.svg', alt: 'Gemini' },
  { key: 'qwen', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/qwen-color.svg', alt: '通义千问' },
  { key: 'kimi', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/kimi.svg', alt: 'Kimi' },
  { key: 'doubao', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/doubao-color.svg', alt: '豆包' },
  { key: 'wenxin', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/wenxin.svg', alt: '文心一言' },
  { key: 'zhipu', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/zhipu-color.svg', alt: '智谱AI' },
  { key: 'spark', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/spark.svg', alt: '讯飞星火' },
  { key: 'hunyuan', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/hunyuan.svg', alt: '混元' },
  { key: 'moonshot', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/moonshot.svg', alt: 'Moonshot' },
  { key: 'stability', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/stability-color.svg', alt: 'Stable Diffusion' },
  { key: 'midjourney', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/midjourney.svg', alt: 'Midjourney' },
  { key: 'perplexity', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/perplexity-color.svg', alt: 'Perplexity' },
  { key: 'mistral', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/mistral-color.svg', alt: 'Mistral' },
  { key: 'runway', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/runway.svg', alt: 'Runway' },
  { key: 'suno', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/suno.svg', alt: 'Suno' },
  { key: 'huggingface', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/huggingface.svg', alt: 'HuggingFace' },
  { key: 'modelscope', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/modelscope.svg', alt: 'ModelScope' },
  { key: 'luma', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/luma.svg', alt: 'Luma' },
  { key: 'pika', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/pika.svg', alt: 'Pika' },
  { key: 'kling', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/kling.svg', alt: '可灵' },
  { key: 'hailuo', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/hailuo.svg', alt: '海螺AI' },
  { key: 'minimax', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/minimax.svg', alt: 'MiniMax' },
  { key: 'yi', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/yi.svg', alt: 'Yi' },
  { key: 'baichuan', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/baichuan.svg', alt: '百川' },
  { key: 'internlm', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/internlm.svg', alt: '书生浦语' },
  { key: 'tiangong', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/tiangong.svg', alt: '天工' },
  { key: 'civitai', src: 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/civitai.svg', alt: 'Civitai' },
];

/**
 * 计算当前是否移动端，避免小屏幕元素过多导致拥挤和卡顿。
 */
const useMobileState = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

/**
 * 顶部动效头图组件（物理引擎版）。
 */
const HotMotionHero: React.FC<HotMotionHeroProps> = ({ description }) => {
  const isMobile = useMobileState();
  const displayIcons = useMemo(() => (isMobile ? ICON_TOKENS.slice(0, 12) : ICON_TOKENS), [isMobile]);
  const displayText = isMobile ? MOBILE_TEXT : FULL_TEXT;

  return (
    <section className="hot-motion-hero" aria-label="热门文章动效头图">
      <div className="hot-motion-hero__canvas">
        <FallingText
          text={displayText}
          highlightWords={HIGHLIGHT_WORDS}
          highlightClass="highlighted"
          colorMap={COLOR_MAP}
          icons={displayIcons}
          gravity={0.3}
          iconSize={isMobile ? 32 : 42}
          mouseConstraintStiffness={1.2}
          density={0.01}
          frictionAir={0.03}
          restitution={0.8}
          enableMouse={true}
        />
      </div>
      <p className="hot-motion-hero__desc">{description || '聚合国内外AI精选内容，探索AI技术前沿与应用'}</p>
    </section>
  );
};

export default HotMotionHero;

