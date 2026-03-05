import { useRef, useState, useEffect } from "react";
import Matter from "matter-js";
import "./FallingText.css";

interface FallingTextProps {
  text?: string;
  highlightWords?: string[];
  highlightClass?: string;
  trigger?: "auto" | "hover" | "click" | "scroll";
  backgroundColor?: string;
  wireframes?: boolean;
  gravity?: number;
  mouseConstraintStiffness?: number;
  fontSize?: string;
  wordSpacing?: string;
  density?: number;
  frictionAir?: number;
  restitution?: number;
  colorMap?: Record<string, string>;
  iconSize?: number; // 新增属性：图标尺寸
  icons?: Array<{
    key: string;
    src: string;
    alt?: string;
    className?: string;
  }>;
}

const FallingText = ({
  text = '',
  highlightWords = [],
  highlightClass = "highlighted",
  trigger = "auto",
  backgroundColor = "transparent",
  wireframes = false,
  gravity = 1,
  mouseConstraintStiffness = 0.2,
  fontSize = "1rem",
  wordSpacing = "2px",
  density = 0.001,
  frictionAir = 0.02,
  restitution = 0.5,
  colorMap = {},
  icons = [],
  iconSize = 42, // 默认图标尺寸
  enableMouse = true // 新增属性：是否启用鼠标/触摸交互
}: FallingTextProps & { enableMouse?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [effectStarted, setEffectStarted] = useState(false);

  useEffect(() => {
    if (!textRef.current) return;
    const words = text.split(" ");
    const textHTML = words
      .map((word) => {
        if (!word.trim()) return ''; // 跳过空字符串
        
        // 首先检查是否在colorMap中有精确匹配
        if (colorMap[word]) {
          return `<span class="word ${colorMap[word]}">${word}</span>`;
        }
        
        // 然后检查部分匹配
        const colorKey = Object.keys(colorMap).find(key => 
          word.includes(key) || key.includes(word)
        );
        
        if (colorKey) {
          return `<span class="word ${colorMap[colorKey]}">${word}</span>`;
        }
        
        // 最后检查默认高亮
        const isHighlighted = highlightWords.some((hw) => 
          word.includes(hw) || hw.includes(word)
        );
        
        return `<span class="word ${isHighlighted ? highlightClass : ""}">${word}</span>`;
      })
      .filter(html => html !== '') // 过滤掉空内容
      .join(" ");

    // 生成图标HTML
    const iconsHTML = icons.map(icon => {
      return `<img 
        src="${icon.src}" 
        alt="${icon.alt || icon.key}" 
        class="word icon-item ${icon.className || ''}" 
        style="height: ${iconSize}px; width: ${iconSize}px; vertical-align: middle; object-fit: contain;"
        data-key="${icon.key}"
        loading="eager"
      />`;
    }).join(" ");
    
    // 混合文本和图标
    textRef.current.innerHTML = textHTML + (textHTML && iconsHTML ? " " : "") + iconsHTML;
  }, [text, highlightWords, highlightClass, colorMap, icons, iconSize]);

  useEffect(() => {
    if (trigger === "auto") {
      setEffectStarted(true);
      return;
    }
    if (trigger === "scroll" && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setEffectStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger]);

  useEffect(() => {
    if (!effectStarted) return;

    const {
      Engine,
      Render,
      World,
      Bodies,
      Runner,
      Mouse,
      MouseConstraint,
      Common
    } = Matter;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect || !containerRef.current || !canvasContainerRef.current || !textRef.current) return;
    
    const width = containerRect.width;
    const height = containerRect.height;

    if (width <= 0 || height <= 0) {
      return;
    }

    const engine = Engine.create({
      gravity: { x: 0, y: gravity, scale: 0.001 },
      positionIterations: 4, // 降低迭代次数以优化性能 (默认6)
      velocityIterations: 2, // 降低迭代次数以优化性能 (默认4)
    });
    const world = engine.world;
    
    const canvasEle = canvasRef.current;
    const containerEle = containerRef.current;
    
    if (!canvasEle || !containerEle) return;
    
    // 仅在调试模式下创建和运行渲染器，大幅节省性能
    let render: Matter.Render | null = null;
    
    if (wireframes) {
      render = Render.create({
        element: containerEle,
        engine: engine,
        canvas: canvasEle,
        options: {
          width: containerEle.clientWidth,
          height: containerEle.clientHeight,
          background: backgroundColor,
          wireframes: wireframes,
          showSleeping: false,
        },
      });
    }
    
    // 创建边界
    const wallThickness = 50;
    const offset = 5;
    
    // 设置更宽的物理边界以确保文字不会溢出
    const ground = Bodies.rectangle(
      containerEle.clientWidth / 2,
      containerEle.clientHeight + wallThickness / 2 - offset,
      containerEle.clientWidth + wallThickness * 2,
      wallThickness,
      { isStatic: true, render: { visible: false } }
    );
    
    const leftWall = Bodies.rectangle(
      -wallThickness / 2 + offset,
      containerEle.clientHeight / 2,
      wallThickness,
      containerEle.clientHeight * 2,
      { isStatic: true, render: { visible: false } }
    );
    
    const rightWall = Bodies.rectangle(
      containerEle.clientWidth + wallThickness / 2 - offset,
      containerEle.clientHeight / 2,
      wallThickness,
      containerEle.clientHeight * 2,
      { isStatic: true, render: { visible: false } }
    );
    
    World.add(world, [ground, leftWall, rightWall]);

    const wordSpans = textRef.current.querySelectorAll(".word");
    const totalWords = wordSpans.length;
    
    // 计算每个单词占据的区域大小，使分布更均匀
    const gridCols = Math.ceil(Math.sqrt(totalWords));
    const gridRows = Math.ceil(totalWords / gridCols);
    // 增加边距，防止生成在边界上
    const padding = 20;
    const safeWidth = containerEle.clientWidth - padding * 2;
    const safeHeight = containerEle.clientHeight - padding * 2;
    const cellWidth = safeWidth / gridCols;
    const cellHeight = safeHeight / gridRows;

    const wordBodies = Array.from(wordSpans).map((elem, index) => {
      const rect = elem.getBoundingClientRect();
      
      let width = rect.width;
      let height = rect.height;
      
      // 如果是图片且尚未加载完成导致宽度为0，给予默认尺寸
      if (elem.tagName === 'IMG' && width === 0) {
        width = iconSize;
        height = iconSize;
      }
      
      // 确定网格位置
      const gridX = index % gridCols;
      const gridY = Math.floor(index / gridCols);
      
      // 添加一点随机偏移，使分布不那么机械
      const randomOffsetX = (Math.random() - 0.5) * (cellWidth * 0.5);
      const randomOffsetY = (Math.random() - 0.5) * (cellHeight * 0.5);
      
      // 计算初始位置，确保在安全区域内
      const x = padding + (gridX + 0.5) * cellWidth + randomOffsetX;
      const y = padding + (gridY + 0.5) * cellHeight + randomOffsetY;

      const body = Bodies.rectangle(x, y, width, height, {
        render: { fillStyle: "transparent" },
        restitution: restitution,
        frictionAir: frictionAir,
        friction: 0.2,
        density: density,
        chamfer: { radius: 10 }, // 增加圆角半径，使碰撞更平滑
      });

      // 给予随机初始速度，但幅度较小
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2
      });
      
      // 给予轻微的角速度
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.02);
      
      return { elem, body };
    });

    wordBodies.forEach(({ elem, body }) => {
      (elem as HTMLElement).style.position = "absolute";
      (elem as HTMLElement).style.left = "0";
      (elem as HTMLElement).style.top = "0";
      (elem as HTMLElement).style.transform = `translate(${body.position.x}px, ${body.position.y}px) translate(-50%, -50%)`;
      (elem as HTMLElement).style.willChange = "transform";
    });

    let mouse: Matter.Mouse | null = null;
    let mouseConstraint: Matter.MouseConstraint | null = null;
    let handleTouchStart: ((e: TouchEvent) => void) | null = null;

    if (enableMouse) {
      mouse = Mouse.create(containerRef.current);
      mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: mouseConstraintStiffness,
          render: { visible: false },
        },
      });
      if (render) {
        render.mouse = mouse;
      }
      
      // 移除默认的滚轮事件监听，允许页面滚动
      mouse.element.removeEventListener("wheel", (mouse as any).mousewheel);
      mouse.element.removeEventListener("DOMMouseScroll", (mouse as any).mousewheel);

      // 智能触控逻辑：
      // 1. 设置 touch-action: auto 允许浏览器处理默认滚动
      containerRef.current.style.touchAction = 'auto';

      // 2. 拦截 touchstart 事件
      // 如果点击的是图标/文字 (.word)，阻止默认行为 -> 交给 Matter.js 处理拖拽
      // 如果点击的是背景，不阻止 -> 交给浏览器处理滚动
      handleTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.word')) {
          e.preventDefault();
        }
      };

      containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    }

    World.add(world, [
      ...(mouseConstraint ? [mouseConstraint] : []),
      ...wordBodies.map((wb) => wb.body),
    ]);

    const runner = Runner.create();
    Runner.run(runner, engine);
    if (render) {
      Render.run(render);
    }

    const updatePositions = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        // 只有当元素还存在时才更新
        if (elem) {
          // 使用 Math.round 避免子像素渲染开销
          (elem as HTMLElement).style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
        }
      });
    };

    // 使用 Matter.js 的事件循环来同步 DOM，而不是手动的 requestAnimationFrame
    Matter.Events.on(engine, 'afterUpdate', updatePositions);

    return () => {
      // 移除事件监听
      Matter.Events.off(engine, 'afterUpdate', updatePositions);
      
      if (handleTouchStart && containerRef.current) {
        containerRef.current.removeEventListener('touchstart', handleTouchStart);
      }

      if (render) {
        Render.stop(render);
        if (render.canvas && canvasContainerRef.current) {
          try {
            canvasContainerRef.current.removeChild(render.canvas);
          } catch (e) {
            // 忽略移除失败的错误，可能已经被移除了
          }
        }
      }
      Runner.stop(runner);
      
      World.clear(world, false);
      Engine.clear(engine);
    };
  }, [
    effectStarted,
    gravity,
    wireframes,
    backgroundColor,
    mouseConstraintStiffness,
    density,
    frictionAir,
    restitution,
    enableMouse
  ]);

  const handleTrigger = () => {
    if (!effectStarted && (trigger === "click" || trigger === "hover")) {
      setEffectStarted(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="falling-text-container"
      onClick={trigger === "click" ? handleTrigger : undefined}
      onMouseOver={trigger === "hover" ? handleTrigger : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={textRef}
        className="falling-text-target"
        style={{
          fontSize: fontSize,
          lineHeight: 1.4,
          wordSpacing: wordSpacing,
        }}
      />
      <div ref={canvasContainerRef} className="falling-text-canvas">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default FallingText; 