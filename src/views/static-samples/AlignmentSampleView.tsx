import { useMemo, useState } from 'react';
import type { AlignmentPoint, AlignmentTrack } from '../../data/types';
import { linearScale, polylinePath } from './chartUtils';

interface AlignmentSampleViewProps {
  tracks: AlignmentTrack[];
}

/** 视图 C 的 y 轴可在「类型偏离度 dist」(默认) 与「类型熵 entropy」之间切换，便于调试对比。 */
type YAxisMode = 'dist' | 'entropy';

const Y_AXIS_META: Record<YAxisMode, { label: string; accessor: (p: AlignmentPoint) => number; anchorZero: boolean }> = {
  dist: { label: '类型偏离度（距舒适圈）', accessor: (p) => p.dist, anchorZero: true },
  entropy: { label: '类型熵 (entropy)', accessor: (p) => p.entropy, anchorZero: false },
};

const WIDTH = 620;
const HEIGHT = 320;
const MARGIN = { top: 18, right: 20, bottom: 30, left: 34 };

export function AlignmentSampleView({ tracks }: AlignmentSampleViewProps) {
  const [yAxis, setYAxis] = useState<YAxisMode>('dist');

  const chart = useMemo(() => {
    const drawable = tracks.filter((track) => track.points.length > 0);
    const pivotTracks = drawable.filter((track) => track.outcome !== 'none');
    const noneTracks = drawable.filter((track) => track.outcome === 'none');
    if (pivotTracks.length === 0) {
      return null;
    }

    const { label: yLabel, accessor, anchorZero } = Y_AXIS_META[yAxis];
    // 坐标域覆盖所有可绘轨迹（含 none 背景），保证淡灰线与分叉线同尺度。
    const taus = drawable.flatMap((track) => track.points.map((point) => point.tau));
    const yVals = drawable.flatMap((track) => track.points.map(accessor));

    const tauMin = Math.min(...taus);
    const tauMax = Math.max(...taus);
    // dist 锚定 0（=贴着早期舒适圈）在底部，让“重新固化”落回低位；entropy 用数据自身范围。
    const yMin = anchorZero ? 0 : Math.min(...yVals);
    const yMax = Math.max(yMin + 0.1, Math.max(...yVals));

    const x = (tau: number) =>
      linearScale(tau, tauMin, tauMax, MARGIN.left, WIDTH - MARGIN.right);
    const y = (value: number) =>
      linearScale(value, yMin, yMax, HEIGHT - MARGIN.bottom, MARGIN.top);

    const toItem = (track: AlignmentTrack) => ({
      id: `${track.actorId}-${track.outcome}`,
      outcome: track.outcome,
      path: polylinePath(track.points.map((point) => ({ x: x(point.tau), y: y(accessor(point)) }))),
    });
    const lineItems = pivotTracks.map(toItem);
    const noneItems = noneTracks.map(toItem);

    const summary = summarizeByOutcome(pivotTracks);
    const t0x = x(0);
    const xTicks = buildLinearTicks(tauMin, tauMax, 9).map((value) => ({
      value,
      x: x(value),
    }));
    const yTicks = buildLinearTicks(yMin, yMax, 6).map((value) => ({
      value,
      y: y(value),
    }));

    return {
      tauMin,
      tauMax,
      lineItems,
      noneItems,
      summary,
      t0x,
      xTicks,
      yTicks,
      yLabel,
    };
  }, [tracks, yAxis]);

  if (!chart) {
    return <div className="sample-chart__empty">alignment.json 无可用分叉轨迹。</div>;
  }

  return (
    <figure className="sample-chart sample-chart--alignment">
      <div className="sample-chart__controls" role="group" aria-label="视图 C 纵轴切换">
        <span className="sample-chart__controls-label">纵轴</span>
        <button
          type="button"
          className={`sample-axis-toggle${yAxis === 'dist' ? ' is-active' : ''}`}
          aria-pressed={yAxis === 'dist'}
          onClick={() => setYAxis('dist')}
        >
          类型偏离度
        </button>
        <button
          type="button"
          className={`sample-axis-toggle${yAxis === 'entropy' ? ' is-active' : ''}`}
          aria-pressed={yAxis === 'entropy'}
          onClick={() => setYAxis('entropy')}
        >
          熵
        </button>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Transformation Alignment static sample">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="sample-bg" rx={8} />

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={Math.max(0, chart.t0x - MARGIN.left)}
          height={HEIGHT - MARGIN.top - MARGIN.bottom}
          className="sample-alignment-zone sample-alignment-zone--left"
        />

        <line x1={chart.t0x} y1={MARGIN.top} x2={chart.t0x} y2={HEIGHT - MARGIN.bottom} className="sample-t0-axis" />
        <text x={chart.t0x + 6} y={MARGIN.top + 12} className="sample-t0-label">
          T=0
        </text>

        {chart.yTicks.map((tick) => (
          <g key={`y-${tick.value}`}>
            <line
              x1={MARGIN.left - 4}
              y1={tick.y}
              x2={MARGIN.left}
              y2={tick.y}
              className="sample-axis"
            />
            <text
              x={MARGIN.left - 8}
              y={tick.y + 3}
              className="sample-axis-tick"
              textAnchor="end"
            >
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {chart.xTicks.map((tick) => (
          <g key={`x-${tick.value}`}>
            <line
              x1={tick.x}
              y1={HEIGHT - MARGIN.bottom}
              x2={tick.x}
              y2={HEIGHT - MARGIN.bottom + 4}
              className="sample-axis"
            />
            <text
              x={tick.x}
              y={HEIGHT - MARGIN.bottom + 15}
              className="sample-axis-tick"
              textAnchor="middle"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {chart.lineItems.map((item) => (
          <path
            key={item.id}
            d={item.path}
            className={`sample-track sample-track--${item.outcome}`}
          />
        ))}

        {/* none 在最上层薄薄一层灰，避免被密集的彩色分叉线整片盖住 */}
        {chart.noneItems.map((item) => (
          <path key={item.id} d={item.path} className="sample-track sample-track--none" />
        ))}

        <line
          x1={MARGIN.left}
          y1={HEIGHT - MARGIN.bottom}
          x2={WIDTH - MARGIN.right}
          y2={HEIGHT - MARGIN.bottom}
          className="sample-axis sample-axis--subtle"
        />
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={HEIGHT - MARGIN.bottom}
          className="sample-axis sample-axis--subtle"
        />
        <text
          x={(MARGIN.left + WIDTH - MARGIN.right) / 2}
          y={HEIGHT - 4}
          className="sample-axis-label"
          textAnchor="middle"
        >
          tau = seqIndex - t0Index
        </text>
        <text
          x={12}
          y={(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}
          className="sample-axis-label"
          transform={`rotate(-90 12 ${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2})`}
          textAnchor="middle"
        >
          {chart.yLabel}
        </text>
      </svg>

      <figcaption className="sample-chart__caption">
        τ 范围 [{chart.tauMin}, {chart.tauMax}] · success={chart.summary.success} · snapback=
        {chart.summary.snapback}
      </figcaption>
    </figure>
  );
}

function buildLinearTicks(min: number, max: number, count: number): number[] {
  if (max <= min) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  const ticks: number[] = [];
  for (let i = 0; i < count; i += 1) {
    ticks.push(Number((min + step * i).toFixed(2)));
  }
  return ticks;
}

function summarizeByOutcome(tracks: AlignmentTrack[]) {
  return tracks.reduce(
    (acc, track) => {
      if (track.outcome === 'success') {
        acc.success += 1;
      }
      if (track.outcome === 'snapback') {
        acc.snapback += 1;
      }
      return acc;
    },
    { success: 0, snapback: 0 },
  );
}
