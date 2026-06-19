import type { ReactNode } from 'react';
import './ChartLegend.css';

export interface ChartLegendItem {
  id: string;
  label: ReactNode;
  marker?: ReactNode;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
}

interface GenreColorLegendProps {
  genres: string[];
  linkedQueueSlot?: ReactNode;
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <div className="chart-legend" aria-label="Chart legend">
      {items.map((item) => (
        <span key={item.id} className="chart-legend__item">
          {item.marker}
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function GenreColorLegend({ genres, linkedQueueSlot }: GenreColorLegendProps) {
  return (
    <section className="genre-legend-block" aria-label="Genre color legend">
      <div className="genre-legend-header">
        <h3 className="genre-legend-title">Genre Color Map (A/B Shared)</h3>
      </div>
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
      {linkedQueueSlot && <div className="genre-legend-linked-queue">{linkedQueueSlot}</div>}
    </section>
  );
}
