import { useEffect, useRef, useState } from 'react';
import './BrushLayer.css';

/** 框选/单击命中所需的最小点信息（结构兼容各视图的点对象）。 */
export interface BrushPoint {
  actor: { id: string };
  x: number;
  y: number;
}

export interface BrushLayerProps {
  /** 承载指针事件与坐标系的 SVG（由父视图渲染）。 */
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** 可被框选/单击命中的点（SVG viewBox 坐标）。 */
  points: BrushPoint[];
  /** 拖框结束：传出落在矩形内的 actorId 列表（可能为空，由父视图决定清空/设选）。 */
  onBrush: (actorIds: string[]) => void;
  /** 单击命中某点：传出该 actorId。 */
  onSelectPoint: (actorId: string) => void;
  /** 单击空白：父视图据此回到全局态。 */
  onClearBrush: () => void;
  /** 指针悬停命中的点，使用与单击相同的最近点命中规则。 */
  onHoverPoint?: (actorId: string | null) => void;
  /** 拖动小于该 SVG 单位视作单击。 */
  clickThreshold?: number;
  /** 单击命中点的半径（SVG 单位）。 */
  hitRadius?: number;
}

interface BrushRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 找到离 (x,y) 最近、且在命中半径内的点。 */
function nearestPoint(points: BrushPoint[], x: number, y: number, radius: number): BrushPoint | null {
  let best: BrushPoint | null = null;
  let bestDistSq = radius * radius;
  for (const point of points) {
    const dx = point.x - x;
    const dy = point.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = point;
    }
  }
  return best;
}

/** 把屏幕坐标换算到 SVG viewBox 坐标，兼容 width:100% 的等比缩放。 */
function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const local = point.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

/**
 * 通用框选层：在给定 SVG 上绑定指针拖框/单击逻辑，并绘制框选矩形。
 * 自身不接触 store —— 父视图把回调接到各自的 store action（同 Toggle / RangeSlider）。
 * 作为 `<svg>` 的子元素渲染（框选矩形需在 viewBox 坐标系内）。
 */
export function BrushLayer({
  svgRef,
  points,
  onBrush,
  onSelectPoint,
  onClearBrush,
  onHoverPoint,
  clickThreshold = 3,
  hitRadius = 8,
}: BrushLayerProps) {
  const [brushRect, setBrushRect] = useState<BrushRect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const rectRef = useRef<BrushRect | null>(null);

  // 把最新 props 收进 ref，使原生监听器保持稳定（只在 svgRef 变化时重绑）。
  const latest = useRef({
    points,
    onBrush,
    onSelectPoint,
    onClearBrush,
    onHoverPoint,
    clickThreshold,
    hitRadius,
  });
  latest.current = {
    points,
    onBrush,
    onSelectPoint,
    onClearBrush,
    onHoverPoint,
    clickThreshold,
    hitRadius,
  };

  const applyRect = (rect: BrushRect | null) => {
    rectRef.current = rect;
    setBrushRect(rect);
  };

  const emitHover = (local: { x: number; y: number }) => {
    const config = latest.current;
    const hit = nearestPoint(config.points, local.x, local.y, config.hitRadius);
    config.onHoverPoint?.(hit?.actor.id ?? null);
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const handleDown = (event: PointerEvent) => {
      const local = clientToSvg(svg, event.clientX, event.clientY);
      if (!local) {
        return;
      }
      emitHover(local);
      dragStart.current = local;
      applyRect({ x: local.x, y: local.y, w: 0, h: 0 });
      svg.setPointerCapture?.(event.pointerId);
    };

    const handleMove = (event: PointerEvent) => {
      const start = dragStart.current;
      if (!start) {
        return;
      }
      const local = clientToSvg(svg, event.clientX, event.clientY);
      if (!local) {
        return;
      }
      if (!start) {
        emitHover(local);
        return;
      }
      applyRect({
        x: Math.min(start.x, local.x),
        y: Math.min(start.y, local.y),
        w: Math.abs(local.x - start.x),
        h: Math.abs(local.y - start.y),
      });
    };

    const handleUp = () => {
      const start = dragStart.current;
      const rect = rectRef.current;
      dragStart.current = null;
      applyRect(null);
      if (!start || !rect) {
        return;
      }

      const config = latest.current;

      // 极小拖动 = 单击。命中点 → 单选；点空白 → 由父视图按当前 active 状态处理。
      if (rect.w < config.clickThreshold && rect.h < config.clickThreshold) {
        const hit = nearestPoint(config.points, start.x, start.y, config.hitRadius);
        if (hit) {
          config.onSelectPoint(hit.actor.id);
        } else {
          config.onClearBrush();
        }
        return;
      }

      // 拖框 = 群落选择，传出框内 ids（空列表交由父视图处理）。
      const ids = config.points
        .filter(
          (point) =>
            point.x >= rect.x &&
            point.x <= rect.x + rect.w &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.h,
        )
        .map((point) => point.actor.id);
      config.onBrush(ids);
    };

    const handleLeave = () => {
      latest.current.onHoverPoint?.(null);
    };

    svg.addEventListener('pointerdown', handleDown);
    svg.addEventListener('pointermove', handleMove);
    svg.addEventListener('pointerup', handleUp);
    svg.addEventListener('pointerleave', handleLeave);
    return () => {
      svg.removeEventListener('pointerdown', handleDown);
      svg.removeEventListener('pointermove', handleMove);
      svg.removeEventListener('pointerup', handleUp);
      svg.removeEventListener('pointerleave', handleLeave);
    };
  }, [svgRef]);

  if (!brushRect || brushRect.w <= 0 || brushRect.h <= 0) {
    return null;
  }

  return (
    <rect
      x={brushRect.x}
      y={brushRect.y}
      width={brushRect.w}
      height={brushRect.h}
      className="brush-layer__rect"
    />
  );
}
