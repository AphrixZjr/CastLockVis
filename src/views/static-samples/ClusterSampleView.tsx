import { useMemo, useState } from 'react';
import type { Actor } from '../../data/types';
import { buildGenreTokenLookup, linearScale, withPadding } from './chartUtils';

interface ClusterSampleViewProps {
  actors: Actor[];
  genres: string[];
}

const WIDTH = 620;
const HEIGHT = 320;
const MARGIN = { top: 20, right: 18, bottom: 34, left: 34 };

export function ClusterSampleView({ actors, genres }: ClusterSampleViewProps) {
  const [hoveredActorId, setHoveredActorId] = useState<string | null>(null);

  const genreTokenLookup = useMemo(() => buildGenreTokenLookup(genres), [genres]);

  const hoveredActor = useMemo(
    () => actors.find((actor) => actor.id === hoveredActorId) ?? null,
    [actors, hoveredActorId],
  );

  const chart = useMemo(() => {
    if (actors.length === 0) {
      return null;
    }

    const xValues = actors.map((actor) => actor.projection[0]);
    const yValues = actors.map((actor) => actor.projection[1]);
    const [xMin, xMax] = withPadding(Math.min(...xValues), Math.max(...xValues), 0.12);
    const [yMin, yMax] = withPadding(Math.min(...yValues), Math.max(...yValues), 0.12);

    const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    const points = actors.map((actor) => {
      const x = linearScale(actor.projection[0], xMin, xMax, MARGIN.left, MARGIN.left + innerWidth);
      const y = linearScale(actor.projection[1], yMin, yMax, MARGIN.top + innerHeight, MARGIN.top);
      const tokenIndex = genreTokenLookup.get(actor.dominantEarlyGenre) ?? 1;
      return { actor, x, y, tokenIndex };
    });

    const tickXs = Array.from({ length: 6 }, (_, index) => MARGIN.left + (innerWidth * index) / 5);
    const tickYs = Array.from({ length: 5 }, (_, index) => MARGIN.top + (innerHeight * index) / 4);

    return { points, tickXs, tickYs, innerWidth, innerHeight };
  }, [actors, genreTokenLookup]);

  if (!chart) {
    return <div className="sample-chart__empty">actors.json 为空，无法渲染静态散点。</div>;
  }

  return (
    <figure className="sample-chart sample-chart--cluster">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Genre-Space Cluster static sample">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="sample-bg" rx={8} />

        {chart.tickXs.map((x) => (
          <line key={`vx-${x}`} x1={x} y1={MARGIN.top} x2={x} y2={HEIGHT - MARGIN.bottom} className="sample-grid" />
        ))}
        {chart.tickYs.map((y) => (
          <line key={`hy-${y}`} x1={MARGIN.left} y1={y} x2={WIDTH - MARGIN.right} y2={y} className="sample-grid" />
        ))}

        <line
          x1={MARGIN.left}
          y1={HEIGHT - MARGIN.bottom}
          x2={WIDTH - MARGIN.right}
          y2={HEIGHT - MARGIN.bottom}
          className="sample-axis"
        />
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={HEIGHT - MARGIN.bottom} className="sample-axis" />

        {chart.points.map(({ actor, x, y, tokenIndex }) => {
          const isHovered = hoveredActorId === actor.id;
          return (
            <circle
              key={actor.id}
              cx={x}
              cy={y}
              r={isHovered ? 4.8 : 3}
              className={`sample-point ${isHovered ? 'sample-point--active' : ''}`}
              style={{ fill: `var(--genre-${tokenIndex})` }}
              onMouseEnter={() => setHoveredActorId(actor.id)}
              onMouseLeave={() => setHoveredActorId(null)}
            />
          );
        })}
      </svg>

      <figcaption className="sample-chart__caption">
        {hoveredActor
          ? `${hoveredActor.name} · cluster ${hoveredActor.clusterId} · early=${hoveredActor.dominantEarlyGenre}`
          : `Actors: ${actors.length} · clusters: ${new Set(actors.map((actor) => actor.clusterId)).size}`}
      </figcaption>
    </figure>
  );
}
