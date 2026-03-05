/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
/**
 * @file FallingText.tsx
 * @description 基于 Matter.js 的关键词与图标物理引擎动画
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Matter from 'matter-js';
import './FallingText.css';

interface FallingTextIconItem {
  key: string;
  src: string;
  alt?: string;
  className?: string;
}

interface FallingTextProps {
  text?: string;
  highlightWords?: string[];
  highlightClass?: string;
  backgroundColor?: string;
  gravity?: number;
  mouseConstraintStiffness?: number;
  density?: number;
  frictionAir?: number;
  restitution?: number;
  colorMap?: Record<string, string>;
  iconSize?: number;
  icons?: FallingTextIconItem[];
  enableMouse?: boolean;
}

/**
 * 物理引擎文本组件。
 */
const FallingText: React.FC<FallingTextProps> = ({
  text = '',
  highlightWords = [],
  highlightClass = 'highlighted',
  backgroundColor = 'transparent',
  gravity = 0.3,
  mouseConstraintStiffness = 1.2,
  density = 0.01,
  frictionAir = 0.03,
  restitution = 0.8,
  colorMap = {},
  icons = [],
  iconSize = 42,
  enableMouse = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  /**
   * 预计算词条列表，避免每次渲染都 split。
   */
  const wordRows = useMemo(() => {
    return text
      .split(' ')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [text]);

  useEffect(() => {
    if (!textRef.current) return;

    /**
     * 根据关键词映射生成文本节点样式类。
     */
    const buildWordClass = (word: string): string => {
      if (colorMap[word]) return colorMap[word];
      const matchKey = Object.keys(colorMap).find((key) => word.includes(key) || key.includes(word));
      if (matchKey) return colorMap[matchKey];
      const isHighlighted = highlightWords.some((key) => word.includes(key) || key.includes(word));
      return isHighlighted ? highlightClass : '';
    };

    const htmlRows: string[] = [];
    wordRows.forEach((word) => {
      const cssClass = buildWordClass(word);
      htmlRows.push(`<span class="word ${cssClass}">${word}</span>`);
    });
    icons.forEach((icon) => {
      htmlRows.push(
        `<img src="${icon.src}" alt="${icon.alt || icon.key}" class="word icon-item ${icon.className || ''}" style="height:${iconSize}px;width:${iconSize}px;" data-key="${icon.key}" loading="eager" />`,
      );
    });

    textRef.current.innerHTML = htmlRows.join(' ');
  }, [colorMap, highlightClass, highlightWords, iconSize, icons, wordRows]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /**
     * 同步容器尺寸，供物理引擎初始化与重建使用。
     */
    const syncContainerSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(0, Math.round(rect.width));
      const height = Math.max(0, Math.round(rect.height));
      setContainerSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    syncContainerSize();
    const timer = window.setTimeout(syncContainerSize, 120);
    let rafId = 0;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(syncContainerSize);
      })
      : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', syncContainerSize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', syncContainerSize);
      resizeObserver?.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const textContainer = textRef.current;
    if (!container || !textContainer) return;
    if (containerSize.width <= 0 || containerSize.height <= 0) return;
    textContainer.classList.remove('falling-text-target--fallback');

    try {
      const {
        Engine,
        World,
        Bodies,
        Runner,
        Mouse,
        MouseConstraint,
        Events,
        Body,
      } = Matter;

      const engine = Engine.create({
        gravity: { x: 0, y: gravity, scale: 0.001 },
        positionIterations: 4,
        velocityIterations: 2,
      });
      const world = engine.world;

      /**
       * 物理边界，防止元素飞出容器。
       */
      const width = containerSize.width;
      const height = containerSize.height;
      const wallThickness = 64;
      const ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width + wallThickness * 2, wallThickness, { isStatic: true });
      const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
      const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
      World.add(world, [ ground, leftWall, rightWall ]);

      const wordElements = Array.from(textContainer.querySelectorAll('.word')) as HTMLElement[];
      const total = wordElements.length;
      const gridCols = Math.max(1, Math.ceil(Math.sqrt(total)));
      const gridRows = Math.max(1, Math.ceil(total / gridCols));
      const padding = 20;
      const safeWidth = Math.max(1, width - padding * 2);
      const safeHeight = Math.max(1, height - padding * 2);
      const cellWidth = safeWidth / gridCols;
      const cellHeight = safeHeight / gridRows;

      const bodies = wordElements.map((element, index) => {
        const elementRect = element.getBoundingClientRect();
        const elementWidth = Math.max(20, elementRect.width || iconSize);
        const elementHeight = Math.max(20, elementRect.height || iconSize);

        const gridX = index % gridCols;
        const gridY = Math.floor(index / gridCols);
        const randomOffsetX = (Math.random() - 0.5) * (cellWidth * 0.5);
        const randomOffsetY = (Math.random() - 0.5) * (cellHeight * 0.5);
        const x = padding + (gridX + 0.5) * cellWidth + randomOffsetX;
        const y = padding + (gridY + 0.5) * cellHeight + randomOffsetY;

        const body = Bodies.rectangle(x, y, elementWidth, elementHeight, {
          restitution,
          frictionAir,
          friction: 0.2,
          density,
          chamfer: { radius: 10 },
        });

        Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
        });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.02);

        element.style.position = 'absolute';
        element.style.left = '0';
        element.style.top = '0';
        element.style.willChange = 'transform';

        return { element, body };
      });

      World.add(world, bodies.map((item) => item.body));

      let mouseConstraint: Matter.MouseConstraint | null = null;
      let touchStartHandler: ((event: TouchEvent) => void) | null = null;
      if (enableMouse) {
        const mouse = Mouse.create(container);
        mouseConstraint = MouseConstraint.create(engine, {
          mouse,
          constraint: {
            stiffness: mouseConstraintStiffness,
            render: { visible: false },
          },
        });
        World.add(world, mouseConstraint);
        if ((mouse as any).mousewheel) {
          mouse.element.removeEventListener('wheel', (mouse as any).mousewheel);
          mouse.element.removeEventListener('DOMMouseScroll', (mouse as any).mousewheel);
        }
        container.style.touchAction = 'auto';
        touchStartHandler = (event: TouchEvent) => {
          const target = event.target as HTMLElement;
          if (target.closest('.word')) {
            event.preventDefault();
          }
        };
        container.addEventListener('touchstart', touchStartHandler, { passive: false });
      }

      const runner = Runner.create();
      Runner.run(runner, engine);

      /**
       * 每帧将物理坐标同步到 DOM。
       */
      const syncPositions = () => {
        bodies.forEach(({ element, body }) => {
          const x = Math.round(body.position.x);
          const y = Math.round(body.position.y);
          element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
        });
      };
      Events.on(engine, 'afterUpdate', syncPositions);

      return () => {
        Events.off(engine, 'afterUpdate', syncPositions);
        if (touchStartHandler) {
          container.removeEventListener('touchstart', touchStartHandler);
        }
        Runner.stop(runner);
        World.clear(world, false);
        Engine.clear(engine);
      };
    } catch (error) {
      /**
       * 兜底：物理引擎异常时改为静态流式展示，避免整块空白。
       */
      console.error('[FallingText] 物理引擎初始化失败，已降级为静态模式:', error);
      textContainer.classList.add('falling-text-target--fallback');
      const fallbackWords = Array.from(textContainer.querySelectorAll('.word')) as HTMLElement[];
      fallbackWords.forEach((element) => {
        element.style.position = 'static';
        element.style.left = 'auto';
        element.style.top = 'auto';
        element.style.transform = 'none';
      });
      return undefined;
    }
  }, [
    backgroundColor,
    containerSize.height,
    containerSize.width,
    density,
    enableMouse,
    frictionAir,
    gravity,
    iconSize,
    icons,
    mouseConstraintStiffness,
    restitution,
    wordRows,
  ]);

  return (
    <div className="falling-text-container" ref={containerRef}>
      <div className="falling-text-target" ref={textRef} />
    </div>
  );
};

export default FallingText;
