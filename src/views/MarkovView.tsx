import { useEffect, useMemo, useState } from 'react';
import { ChartTooltip } from '../components/common/ChartTooltip';
import type { MarkovMatrix } from '../data/types';
import { linearScale } from './chartUtils';

interface MarkovViewProps {
  matrix: MarkovMatrix | null;
  emptyMessage?: string;
  fallbackGenres?: readonly string[];
}

const WIDTH = 360;
const HEIGHT = 340;
const MARGIN = { top: 10, right: 14, bottom: 78, left: 88 };
const CONTENT_OFFSET_X = -12;
const TOOLTIP_DELAY_MS = 180;
const TOOLTIP_WIDTH = 58;
const TOOLTIP_HEIGHT = 22;
const TOOLTIP_GAP = 6;

interface HoverCell {
  row: number;
  col: number;
  value: number;
  x: number;
  y: number;
}

export function MarkovView({
  matrix,
  emptyMessage = '当前 stage 无可用矩阵。',
  fallbackGenres = DEFAULT_MARKOV_GENRES,
}: MarkovViewProps) {
  const [hoverCell, setHoverCell] = useState<HoverCell | null>(null);
  const [tooltipCell, setTooltipCell] = useState<HoverCell | null>(null);

  const chart = useMemo(() => {
    if (matrix && matrix.genres.length === 0) {
      return null;
    }

    const genres = matrix?.genres ?? fallbackGenres;
    const n = genres.length;
    const gridSize = Math.min(
      WIDTH - MARGIN.left - MARGIN.right,
      HEIGHT - MARGIN.top - MARGIN.bottom,
    );
    const cellSize = gridSize / n;
    const matrixX =
      MARGIN.left + (WIDTH - MARGIN.left - MARGIN.right - gridSize) / 2 + CONTENT_OFFSET_X;
    const matrixY = MARGIN.top;

    const cells = Array.from({ length: n }, (_, rowIndex) =>
      Array.from({ length: n }, (_, colIndex) => {
        const value = matrix?.matrix[rowIndex]?.[colIndex] ?? 0.35;
        const x = matrixX + colIndex * cellSize;
        const y = matrixY + rowIndex * cellSize;
        return {
          row: rowIndex,
          col: colIndex,
          value,
          x,
          y,
          isDiagonal: rowIndex === colIndex,
          intensity: Math.round(linearScale(value, 0, 1, 8, 90)),
        };
      }),
    ).flat();

    return { genres, n, cellSize, matrixX, matrixY, cells };
  }, [fallbackGenres, matrix]);

  useEffect(() => {
    if (!hoverCell || matrix === null) {
      setTooltipCell(null);
      return undefined;
    }

    setTooltipCell(null);
    const timer = window.setTimeout(() => {
      setTooltipCell(hoverCell);
    }, TOOLTIP_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hoverCell, matrix]);

  if (!chart) {
    return <div className="view-chart__empty">{emptyMessage}</div>;
  }

  const isEmpty = matrix === null;
  const tooltipPosition =
    tooltipCell === null ? null : getCellTooltipPosition(tooltipCell, chart.cellSize);

  return (
    <figure className={`view-chart view-chart--markov${isEmpty ? ' view-chart--markov-empty' : ''}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Markov Transition view">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="view-bg" rx={8} />

        <g className={isEmpty ? 'view-markov-empty-grid' : undefined}>
          {chart.cells.map((cell) => (
            <rect
              key={`${cell.row}-${cell.col}`}
              x={cell.x}
              y={cell.y}
              width={chart.cellSize - 0.75}
              height={chart.cellSize - 0.75}
              className={`view-markov-cell ${cell.isDiagonal ? 'view-markov-cell--diag' : ''}`}
              style={{ opacity: isEmpty ? 0.28 : cell.intensity / 100 }}
              onMouseEnter={
                isEmpty
                  ? undefined
                  : () =>
                      setHoverCell({
                        row: cell.row,
                        col: cell.col,
                        value: cell.value,
                        x: cell.x,
                        y: cell.y,
                      })
              }
              onMouseLeave={isEmpty ? undefined : () => setHoverCell(null)}
            />
          ))}
        </g>

        {chart.genres.map((genre, index) => {
          const y = chart.matrixY + index * chart.cellSize + chart.cellSize * 0.65;
          return (
            <text
              key={`row-${genre}`}
              x={chart.matrixX - 8}
              y={y}
              className="view-matrix-label"
              textAnchor="end"
            >
              {shortGenre(genre)}
            </text>
          );
        })}

        {chart.genres.map((genre, index) => {
          const x = chart.matrixX + index * chart.cellSize + chart.cellSize * 0.55;
          const y = chart.matrixY + chart.n * chart.cellSize + 14;
          return (
            <text
              key={`col-${genre}`}
              x={x}
              y={y}
              className="view-matrix-label view-matrix-label--x"
              transform={`rotate(60 ${x} ${y})`}
              textAnchor="start"
            >
              {shortGenre(genre)}
            </text>
          );
        })}

        {tooltipCell && tooltipPosition && (
          <g
            className="view-markov-cell-tooltip"
            transform={`translate(${tooltipPosition.x} ${tooltipPosition.y})`}
            aria-hidden="true"
          >
            <rect width={TOOLTIP_WIDTH} height={TOOLTIP_HEIGHT} />
            <text x={TOOLTIP_WIDTH / 2} y={14} textAnchor="middle">
              p={tooltipCell.value.toFixed(3)}
            </text>
          </g>
        )}

        {isEmpty && (
          <g className="view-markov-empty-overlay" aria-hidden="true">
            <text
              x={chart.matrixX + (chart.n * chart.cellSize) / 2}
              y={chart.matrixY + chart.cellSize * 7.2}
              className="view-markov-empty-overlay__text"
              textAnchor="middle"
            >
              <tspan x={chart.matrixX + (chart.n * chart.cellSize) / 2}>
                Markov Transition Gate
              </tspan>
              <tspan x={chart.matrixX + (chart.n * chart.cellSize) / 2} dy="1.35em">
                仅在单演员模式 / 单聚类模式下可用
              </tspan>
            </text>
          </g>
        )}
      </svg>

      <ChartTooltip
        label={matrix ? `cohort ${matrix.cohortId} · stage ${matrix.stage}` : 'Markov unavailable'}
        detail={
          isEmpty
            ? emptyMessage
            : hoverCell && matrix
              ? `${matrix.genres[hoverCell.row]} → ${matrix.genres[hoverCell.col]}`
              : 'hover cell 查看转移概率'
        }
        tone={hoverCell && !isEmpty ? 'active' : 'default'}
      />
    </figure>
  );
}

const DEFAULT_MARKOV_GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Romance',
  'Thriller',
  'Crime',
] as const;

function shortGenre(genre: string): string {
  if (genre.length <= 7) {
    return genre;
  }
  return `${genre.slice(0, 6)}.`;
}

function getCellTooltipPosition(cell: HoverCell, cellSize: number): { x: number; y: number } {
  const rightX = cell.x + cellSize + TOOLTIP_GAP;
  const leftX = cell.x - TOOLTIP_WIDTH - TOOLTIP_GAP;
  const x = rightX + TOOLTIP_WIDTH <= WIDTH - 4 ? rightX : Math.max(4, leftX);

  const topY = cell.y - TOOLTIP_HEIGHT - TOOLTIP_GAP;
  const bottomY = cell.y + cellSize + TOOLTIP_GAP;
  const y = topY >= 4 ? topY : Math.min(HEIGHT - TOOLTIP_HEIGHT - 4, bottomY);

  return { x, y };
}
