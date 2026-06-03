import { useMemo } from 'react';
import type { Actor, DataBundle, DataIndexes, Film } from '../../data/types';
import {
  getCohortActorIds,
  getCohortAverageEntropy,
  getCohortGenreBands,
} from '../../store/selectors';
import { useVizStore } from '../../store/useVizStore';
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

interface FilmDot {
  film: Film;
  x: number;
  y: number;
  r: number;
}

interface SingleChart {
  mode: 'single';
  sampleActor: Actor;
  maxN: number;
  streamTop: number;
  streamBottom: number;
  ratingTop: number;
  ratingBottom: number;
  series: SeriesBand[];
  entropyPath: string;
  dots: FilmDot[];
  highlightFilms: Array<{ film: Film; x: number; y: number }>;
}

interface CohortChart {
  mode: 'cohort';
  cohortSize: number;
  maxN: number;
  streamTop: number;
  streamBottom: number;
  series: SeriesBand[];
  entropyPath: string;
}

type RiverChart = SingleChart | CohortChart;

const WIDTH = 620;
const HEIGHT = 320;
const MARGIN = { top: 16, right: 16, bottom: 22, left: 32 };
const WINDOW_SIZE = 3;
const MAX_SEQ = 30; // 与 entropy.json 的 n=1..30 对齐

export function RiverSampleView({ bundle, indexes }: RiverSampleViewProps) {
  const brushedActorIds = useVizStore((state) => state.brushedActorIds);
  const selectedActorId = useVizStore((state) => state.selectedActorId);
  const selectedFilmIndex = useVizStore((state) => state.selectedFilmIndex);
  const selectActor = useVizStore((state) => state.selectActor);
  const selectSpike = useVizStore((state) => state.selectSpike);
  const openDetails = useVizStore((state) => state.openDetails);
  const closeDetails = useVizStore((state) => state.closeDetails);

  // 仅清除尖峰（作品序号）与详情，保留当前演员——B 仍停在该演员。
  const clearSpike = () => {
    selectSpike(null);
    closeDetails();
  };

  const chart = useMemo<RiverChart | null>(() => {
    // 优先级：单选某演员（链路：A 单击 / B 尖峰）> 群落框选（链路 1）> 默认演员。
    if (selectedActorId !== null) {
      return buildSingleChart(bundle, indexes, selectedActorId);
    }
    if (brushedActorIds.size > 0) {
      const cohortActorIds = getCohortActorIds(
        bundle.actors.map((actor) => actor.id),
        brushedActorIds,
      );
      return buildCohortChart(bundle, indexes, cohortActorIds);
    }
    return buildSingleChart(bundle, indexes, null);
  }, [bundle, indexes, brushedActorIds, selectedActorId]);

  if (!chart) {
    return <div className="sample-chart__empty">样例演员缺少 films/entropy 数据，无法渲染。</div>;
  }

  return (
    <figure className="sample-chart sample-chart--river">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Career River static sample">
        {/* 点击空白背景清除尖峰/详情，但保留当前演员 */}
        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          className="sample-bg"
          rx={8}
          onClick={clearSpike}
        />

        <line
          x1={MARGIN.left}
          y1={chart.streamBottom}
          x2={WIDTH - MARGIN.right}
          y2={chart.streamBottom}
          className="sample-axis"
        />
        {chart.mode === 'single' && (
          <line
            x1={MARGIN.left}
            y1={chart.ratingBottom}
            x2={WIDTH - MARGIN.right}
            y2={chart.ratingBottom}
            className="sample-axis sample-axis--subtle"
          />
        )}

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

        {chart.mode === 'single' &&
          chart.dots.map(({ film, x, y, r }) => (
            <circle
              key={`${film.actorId}-${film.seqIndex}`}
              cx={x}
              cy={y}
              r={r}
              className="sample-film-dot sample-film-dot--clickable"
              onClick={(event) => {
                event.stopPropagation();
                const isSelected =
                  selectedActorId === film.actorId && selectedFilmIndex === film.seqIndex;
                if (isSelected) {
                  clearSpike(); // 再点同一尖峰：清除作品序号/详情，保留演员
                  return;
                }
                selectActor(film.actorId);
                selectSpike(film.seqIndex);
                openDetails();
              }}
            >
              <title>{`N${film.seqIndex} · rating ${film.rating} · votes ${film.numVotes}`}</title>
            </circle>
          ))}

        {/* 选中尖峰高亮环（与链路 2 联动一致） */}
        {chart.mode === 'single' &&
          selectedActorId === chart.sampleActor.id &&
          chart.dots
            .filter((dot) => dot.film.seqIndex === selectedFilmIndex)
            .map((dot) => (
              <circle
                key={`selected-${dot.film.seqIndex}`}
                cx={dot.x}
                cy={dot.y}
                r={9}
                className="sample-peak-ring sample-peak-ring--selected"
              />
            ))}

        {chart.mode === 'single' &&
          chart.highlightFilms.map(({ film, x, y }) => (
            <g key={`peak-${film.seqIndex}`}>
              <circle cx={x} cy={y} r={7.5} className="sample-peak-ring" />
              <text x={x} y={y - 11} className="sample-peak-label" textAnchor="middle">
                N{film.seqIndex}
              </text>
            </g>
          ))}
      </svg>

      <figcaption className="sample-chart__caption">
        {chart.mode === 'cohort'
          ? `群落平均态 · cohort n=${chart.cohortSize} · 平均熵衰减 + 平均类型流带`
          : `单演员 ${chart.sampleActor.name} · N=${chart.maxN} · 框选 A 切换群落平均态`}
      </figcaption>
    </figure>
  );
}

function buildSingleChart(
  bundle: DataBundle,
  indexes: DataIndexes,
  targetActorId: string | null,
): SingleChart | null {
  let sampleActor =
    targetActorId !== null ? indexes.actorsById.get(targetActorId) ?? null : null;
  if (!sampleActor) {
    const actorsByFilmCount = [...bundle.actors].sort(
      (left, right) => right.filmCount - left.filmCount,
    );
    sampleActor =
      actorsByFilmCount.find((actor) => actor.id === 'nm0000129') ??
      actorsByFilmCount.find((actor) => actor.filmCount >= 18) ??
      actorsByFilmCount[0] ??
      null;
  }

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
    mode: 'single',
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
}

function buildCohortChart(
  bundle: DataBundle,
  indexes: DataIndexes,
  cohortActorIds: string[],
): CohortChart | null {
  const avgEntropy = getCohortAverageEntropy(bundle, cohortActorIds);
  if (avgEntropy.length === 0) {
    return null;
  }

  const maxN = Math.min(MAX_SEQ, Math.max(...avgEntropy.map((point) => point.n)));
  if (maxN < 1) {
    return null;
  }

  const innerLeft = MARGIN.left;
  const innerRight = WIDTH - MARGIN.right;
  const streamTop = MARGIN.top + 8;
  // 群落态无评分圆点，流带可占满纵向空间。
  const streamBottom = HEIGHT - 30;

  const genreTokenLookup = buildGenreTokenLookup(bundle.genres);
  const bands = getCohortGenreBands(indexes, cohortActorIds, maxN);

  const series: SeriesBand[] = bands.series.map((band) => ({
    key: band.key,
    tokenIndex: band.key === 'Other' ? 10 : genreTokenLookup.get(band.key) ?? 1,
    points: [],
  }));

  for (let n = 1; n <= maxN; n += 1) {
    const x = linearScale(n, 1, maxN, innerLeft, innerRight);
    let cumulative = 0;
    bands.series.forEach((band, index) => {
      const value = band.proportions[n - 1];
      const y0 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
      cumulative += value;
      const y1 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
      series[index].points.push({ x, y0, y1 });
    });
  }

  const maxEntropy = Math.max(...avgEntropy.map((point) => point.entropy), 0.01);
  const entropyPath = polylinePath(
    avgEntropy
      .filter((point) => point.n <= maxN)
      .map((point) => ({
        x: linearScale(point.n, 1, maxN, innerLeft, innerRight),
        y: linearScale(point.entropy, 0, maxEntropy, streamBottom, streamTop),
      })),
  );

  return {
    mode: 'cohort',
    cohortSize: cohortActorIds.length,
    maxN,
    streamTop,
    streamBottom,
    series,
    entropyPath,
  };
}

function pickPeakFilms(dots: FilmDot[]): Array<{ film: Film; x: number; y: number }> {
  if (dots.length <= 3) {
    return dots.map(({ film, x, y }) => ({ film, x, y }));
  }

  const sorted = [...dots].sort((left, right) => right.film.rating - left.film.rating);
  return sorted.slice(0, 3).map(({ film, x, y }) => ({ film, x, y }));
}
