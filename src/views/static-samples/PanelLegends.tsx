export function ClusterLegend() {
  return (
    <div className="panel-legend-grid">
      <span className="legend-item">
        <span className="legend-dot legend-dot--active" />
        <span>hover: 点放大 + 描边高亮</span>
      </span>
      <span className="legend-item">颜色映射见上方共享图例</span>
    </div>
  );
}

interface GenreColorLegendProps {
  genres: string[];
}

export function GenreColorLegend({ genres }: GenreColorLegendProps) {
  return (
    <section className="genre-legend-block" aria-label="Genre color legend">
      <h3 className="genre-legend-title">Genre Color Map (A/B Shared)</h3>
      <div className="genre-legend-grid">
        {genres.map((genre, index) => (
          <span key={genre} className="genre-legend-item">
            <span
              className="genre-legend-chip"
              style={{ backgroundColor: `var(--genre-${index + 1})` }}
              aria-hidden
            />
            <span className="genre-legend-name">{genre}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

export function RiverLegend() {
  return (
    <div className="panel-legend-grid">
      <span className="legend-item">
        <span className="legend-river-band" />
        <span>流层厚度 = 类型占比（滑窗，颜色见共享图例）</span>
      </span>
      <span className="legend-item">
        <span className="legend-line" />
        <span>白线 = Shannon entropy</span>
      </span>
      <span className="legend-item">
        <span className="legend-dot-row">
          <span className="legend-dot legend-dot--sm" />
          <span className="legend-dot legend-dot--lg" />
        </span>
        <span>圆点: y=rating, 半径=numVotes</span>
      </span>
    </div>
  );
}

export function MarkovLegend() {
  return (
    <div className="panel-legend-grid">
      <span className="legend-item">
        <span className="legend-ramp" />
        <span>色深 = 转移概率（低→高）</span>
      </span>
      <span className="legend-item">
        <span className="legend-chip legend-chip--snap" />
        <span>对角线红格 = 类型锁定（stay）</span>
      </span>
    </div>
  );
}

export function AlignmentLegend() {
  return (
    <div className="panel-legend-grid">
      <span className="legend-item">
        <span className="legend-vline" />
        <span>虚线竖轴 = T=0（转型起点）</span>
      </span>
      <span className="legend-item">
        <span className="legend-line legend-line--success" />
        <span>绿线 = success</span>
      </span>
      <span className="legend-item">
        <span className="legend-line legend-line--snap" />
        <span>红线 = snapback</span>
      </span>
    </div>
  );
}
