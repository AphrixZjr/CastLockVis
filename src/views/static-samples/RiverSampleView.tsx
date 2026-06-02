import { useMemo } from 'react';
import type { DataBundle, DataIndexes, Film } from '../../data/types';
import {
  buildGenreTokenLookup,
  linearScale,
  pathFromBands,
  polylinePath,
} from './chartUtils';

interface RiverSampleViewProps {
  bundle: DataBundle;
  indexes: DataIndexes;
}

interface SeriesBand {
  key: string;
  tokenIndex: number;
  points: Array<{ x: number; y0: number; y1: number }>;
}

const WIDTH = 620;
const HEIGHT = 320;
const MARGIN = { top: 16, right: 16, bottom: 22, left: 32 };
const WINDOW_SIZE = 3;

export function RiverSampleView({ bundle, indexes }: RiverSampleViewProps) {
  const chart = useMemo(() => {
    const actorsByFilmCount = [...bundle.actors].sort((left, right) => right.filmCount - left.filmCount);
    const sampleActor =
      actorsByFilmCount.find((actor) => actor.id === 'nm0000129') ??
      actorsByFilmCount.find((actor) => actor.filmCount >= 18) ??
      actorsByFilmCount[0];

    if (!sampleActor) {
      return null;
    }

    const films = indexes.filmsByActor.get(sampleActor.id) ?? [];
    const entropy = bundle.entropy.find((entry) => entry.actorId === sampleActor.id);
    if (films.length === 0 || !entropy || entropy.curve.length === 0) {
      return null;
    }

    const maxN = films[films.length - 1].seqIndex;
    const innerLeft = MARGIN.left;
    const innerRight = WIDTH - MARGIN.right;
    const streamTop = MARGIN.top + 8;
    const streamBottom = HEIGHT - 114;
    const ratingTop = HEIGHT - 92;
    const ratingBottom = HEIGHT - 30;

    const genreTokenLookup = buildGenreTokenLookup(bundle.genres);

    const dominantCounts = new Map<string, number>();
    films.forEach((film) => {
      dominantCounts.set(film.dominantGenre, (dominantCounts.get(film.dominantGenre) ?? 0) + 1);
    });

    const coreGenres = [...dominantCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([genre]) => genre);

    const seriesKeys = [...coreGenres, 'Other'];
    const series = new Map<string, SeriesBand>(
      seriesKeys.map((key) => [
        key,
        {
          key,
          tokenIndex: key === 'Other' ? 10 : genreTokenLookup.get(key) ?? 1,
          points: [],
        },
      ]),
    );

    for (let n = 1; n <= maxN; n += 1) {
      const currentFilms = films.slice(0, n);
      const windowFilms = currentFilms.slice(-WINDOW_SIZE);
      const windowTotal = windowFilms.length || 1;

      const proportions = new Map<string, number>();
      coreGenres.forEach((genre) => proportions.set(genre, 0));

      let otherCount = 0;
      windowFilms.forEach((film) => {
        if (proportions.has(film.dominantGenre)) {
          proportions.set(film.dominantGenre, (proportions.get(film.dominantGenre) ?? 0) + 1);
        } else {
          otherCount += 1;
        }
      });

      const x = linearScale(n, 1, maxN, innerLeft, innerRight);
      let cumulative = 0;

      for (const key of seriesKeys) {
        const value = key === 'Other' ? otherCount / windowTotal : (proportions.get(key) ?? 0) / windowTotal;
        const y0 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
        cumulative += value;
        const y1 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
        series.get(key)?.points.push({ x, y0, y1 });
      }
    }

    const maxEntropy = Math.max(...entropy.curve.map((point) => point.entropy), 0.01);
    const entropyPath = polylinePath(
      entropy.curve
        .filter((point) => point.n <= maxN)
        .map((point) => ({
          x: linearScale(point.n, 1, maxN, innerLeft, innerRight),
          y: linearScale(point.entropy, 0, maxEntropy, streamBottom, streamTop),
        })),
    );

    const voteValues = films.map((film) => film.numVotes);
    const voteMin = Math.min(...voteValues);
    const voteMax = Math.max(...voteValues);

    const dots = films.map((film) => {
      const voteRatio = voteMax === voteMin ? 0.5 : (film.numVotes - voteMin) / (voteMax - voteMin);
      return {
        film,
        x: linearScale(film.seqIndex, 1, maxN, innerLeft, innerRight),
        y: linearScale(film.rating, 0, 10, ratingBottom, ratingTop),
        r: 2 + Math.sqrt(voteRatio) * 5,
      };
    });

    return {
      sampleActor,
      maxN,
      streamTop,
      streamBottom,
      ratingTop,
      ratingBottom,
      series: [...series.values()],
      entropyPath,
      dots,
      highlightFilms: pickPeakFilms(dots),
    };
  }, [bundle, indexes]);

  if (!chart) {
    return <div className="sample-chart__empty">样例演员缺少 films/entropy 数据，无法渲染。</div>;
  }

  return (
    <figure className="sample-chart sample-chart--river">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Career River static sample">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="sample-bg" rx={8} />

        <line
          x1={MARGIN.left}
          y1={chart.streamBottom}
          x2={WIDTH - MARGIN.right}
          y2={chart.streamBottom}
          className="sample-axis"
        />
        <line
          x1={MARGIN.left}
          y1={chart.ratingBottom}
          x2={WIDTH - MARGIN.right}
          y2={chart.ratingBottom}
          className="sample-axis sample-axis--subtle"
        />

        {chart.series.map((band) => (
          <path
            key={band.key}
            d={pathFromBands(band.points)}
            className="sample-river-band"
            style={{
              fill: `var(--genre-${band.tokenIndex})`,
              stroke: `var(--genre-${band.tokenIndex})`,
              strokeWidth: 0.6,
            }}
          />
        ))}

        <path d={chart.entropyPath} className="sample-entropy-line" />

        {chart.dots.map(({ film, x, y, r }) => (
          <circle key={`${film.actorId}-${film.seqIndex}`} cx={x} cy={y} r={r} className="sample-film-dot" />
        ))}

        {chart.highlightFilms.map(({ film, x, y }) => (
          <g key={`peak-${film.seqIndex}`}>
            <circle cx={x} cy={y} r={7.5} className="sample-peak-ring" />
            <text x={x} y={y - 11} className="sample-peak-label" textAnchor="middle">
              N{film.seqIndex}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function pickPeakFilms(
  dots: Array<{ film: Film; x: number; y: number; r: number }>,
): Array<{ film: Film; x: number; y: number }> {
  if (dots.length <= 3) {
    return dots.map(({ film, x, y }) => ({ film, x, y }));
  }

  const sorted = [...dots].sort((left, right) => right.film.rating - left.film.rating);
  return sorted.slice(0, 3).map(({ film, x, y }) => ({ film, x, y }));
}
