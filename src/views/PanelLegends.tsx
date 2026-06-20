import { ChartLegend, GenreColorLegend } from '../components/common/ChartLegend';

export { GenreColorLegend };

export function ClusterLegend() {
  return (
    <ChartLegend
      items={[
        {
          id: 'cluster-shape',
          marker: (
            <svg className="legend-glyphs" viewBox="0 0 64 12" aria-hidden>
              <circle cx={6} cy={6} r={3.4} />
              <rect x={17} y={2.6} width={6.8} height={6.8} />
              <polygon points="33,2 36.4,9.6 29.6,9.6" />
              <polygon points="46,1.6 49.6,6 46,10.4 42.4,6" />
              <polygon points="58,1.6 60.2,5 63.6,5.6 61,8 61.6,11.4 58,9.8 54.4,11.4 55,8 52.4,5.6 55.8,5" />
            </svg>
          ),
          label: '形状 + 凸包 = 群落',
        },
        {
          id: 'cluster-fill',
          label: '填色 = 早期主导类型',
        },
      ]}
    />
  );
}

export function RiverLegend() {
  return (
    <ChartLegend
      items={[
        {
          id: 'river-band',
          marker: <span className="legend-river-band" aria-hidden />,
          label: '流层厚度 = 类型占比',
        },
        {
          id: 'river-entropy',
          marker: <span className="legend-line" aria-hidden />,
          label: '白线 = 香农熵',
        },
        {
          id: 'river-dot',
          marker: (
            <span className="legend-dot-row" aria-hidden>
              <span className="legend-dot legend-dot--sm" />
              <span className="legend-dot legend-dot--lg" />
            </span>
          ),
          label: '圆点: 纵坐标=rating, 半径=numVotes',
        },
      ]}
    />
  );
}

export function MarkovLegend() {
  return (
    <ChartLegend
      items={[
        {
          id: 'markov-ramp',
          marker: <span className="legend-ramp" aria-hidden />,
          label: '色深 = 转移概率',
        },
        {
          id: 'markov-diag',
          marker: <span className="legend-chip legend-chip--snap" aria-hidden />,
          label: '对角线红格 = 类型锁定',
        },
      ]}
    />
  );
}

export function AlignmentLegend() {
  return (
    <ChartLegend
      items={[
        {
          id: 'alignment-t0',
          marker: <span className="legend-vline" aria-hidden />,
          label: '虚线竖轴 =（转型起点）',
        },
        {
          id: 'alignment-y',
          label: '纵轴 = 类型偏离度',
        },
        {
          id: 'alignment-success',
          marker: <span className="legend-line legend-line--success" aria-hidden />,
          label: '绿线 = 成功转型',
        },
        {
          id: 'alignment-snapback',
          marker: <span className="legend-line legend-line--snap" aria-hidden />,
          label: '红线 = 回弹',
        },
        {
          id: 'alignment-none',
          marker: <span className="legend-line legend-line--none" aria-hidden />,
          label: '灰线 = 未检出',
        },
      ]}
    />
  );
}
