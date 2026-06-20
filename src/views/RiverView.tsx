import { useMemo } from 'react';
import { ChartTooltip } from '../components/common/ChartTooltip';
import type { DataBundle, DataIndexes, EntropyCurve, EntropyPoint } from '../data/types';
import { buildGenreTokenLookup, linearScale, pathFromBands, polylinePath } from './chartUtils';

interface RiverViewProps {
  bundle: DataBundle;
  indexes: DataIndexes;
  cohortActorIds: string[];
  isCohortMode: boolean;
  selectedActorId: string | null;
  selectedFilmIndex: number | null;
  onSpikeSelect: (actorId: string, filmIndex: number) => void;
}

interface SeriesBand {
  key: string;
  tokenIndex: number;
  isOther: boolean;
  points: Array<{ x: number; y0: number; y1: number }>;
}

interface XAxisTick {
  value: number;
  x: number;
}

interface YAxisTick {
  value: number;
  y: number;
}

interface CohortEntropyStats {
  n: number;
  mean: number;
}

const WIDTH = 620;
const HEIGHT = 320;
const MARGIN = { top: 16, right: 16, bottom: 22, left: 32 };
const WINDOW_SIZE = 3;
const MAX_COHORT_N = 30;
const CORE_GENRE_COUNT = 6;
const SPIKE_LIMIT = 5;
const SPIKE_BASELINE_WINDOW = 4;
const ONSET_SCORE_BONUS = 1.2;

export function RiverView({
  bundle,
  indexes,
  cohortActorIds,
  isCohortMode,
  selectedActorId,
  selectedFilmIndex,
  onSpikeSelect,
}: RiverViewProps) {
  const chart = useMemo(() => {
    // active selection 规则：brush/cohort 覆盖 cached 单选；brush 清空后再回退单演员。
    if (isCohortMode) {
      return buildCohortChart(bundle, indexes, cohortActorIds);
    }
    if (selectedActorId !== null) {
      return buildSingleActorChart(bundle, indexes, selectedActorId);
    }
    return buildSingleActorChart(bundle, indexes, null);
  }, [bundle, cohortActorIds, indexes, isCohortMode, selectedActorId]);

  if (!chart) {
    return (
      <div className="view-chart__empty">
        {isCohortMode
          ? '当前选区缺少 cohort 数据，无法渲染平均河流。'
          : '样例演员缺少 films/entropy 数据，无法渲染。'}
      </div>
    );
  }

  return (
    <figure className="view-chart view-chart--river">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Career River view">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="view-bg" rx={8} />

        <line
          x1={MARGIN.left}
          y1={chart.streamBottom}
          x2={WIDTH - MARGIN.right}
          y2={chart.streamBottom}
          className="view-axis"
        />
        <line
          x1={MARGIN.left}
          y1={chart.ratingBottom}
          x2={WIDTH - MARGIN.right}
          y2={chart.ratingBottom}
          className="view-axis view-axis--subtle"
        />
        <line
          x1={chart.ratingAxisX}
          y1={chart.ratingTop}
          x2={chart.ratingAxisX}
          y2={chart.ratingBottom}
          className="view-axis"
        />

        {chart.ratingTicks.map((tick) => (
          <g key={`rating-${tick.value}`}>
            <line
              x1={chart.ratingAxisX}
              y1={tick.y}
              x2={chart.ratingAxisX + 5}
              y2={tick.y}
              className="view-axis"
            />
            <text
              x={chart.ratingAxisX - 5}
              y={tick.y + 3}
              className="view-axis-tick"
              textAnchor="end"
            >
              {tick.value}
            </text>
          </g>
        ))}
        <text
          x={chart.ratingAxisX}
          y={chart.ratingTop - 8}
          className="view-axis-label view-axis-label--river"
        >
          IMDb rating
        </text>
        <text
          x={MARGIN.left}
          y={chart.streamTop - 7}
          className="view-axis-label view-axis-label--river"
        >
          genre share + entropy
        </text>

        {chart.series.map((band) => (
          <path
            key={band.key}
            d={pathFromBands(band.points)}
            className={`view-river-band${band.isOther ? ' view-river-band--other' : ''}`}
            style={
              band.isOther
                ? undefined
                : {
                    fill: `var(--genre-${band.tokenIndex})`,
                    stroke: `var(--genre-${band.tokenIndex})`,
                    strokeWidth: 0.6,
                  }
            }
          />
        ))}

        <path d={chart.entropyPath} className="view-entropy-line" />

        {chart.dots
          .filter((dot) => dot.actorId === null)
          .map(({ id, x, y, r }) => (
          <circle key={id} cx={x} cy={y} r={r} className="view-film-dot" />
          ))}

        {chart.clickableDots.map(({ id, actorId, seqIndex, x, y, r }) => {
          const isActive = selectedActorId === actorId && selectedFilmIndex === seqIndex;
          return (
            <circle
              key={`film-hit-${id}`}
              cx={x}
              cy={y}
              r={r}
              className={`view-film-dot view-film-dot--clickable ${
                isActive ? 'view-film-dot--active' : ''
              }`}
              role="button"
              aria-label={`Select film N${seqIndex}`}
              tabIndex={0}
              onClick={() => onSpikeSelect(actorId, seqIndex)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSpikeSelect(actorId, seqIndex);
                }
              }}
            />
          );
        })}

        {chart.spikes.map(({ id, actorId, seqIndex, x, y, kind }) => {
          const isActive = selectedActorId === actorId && selectedFilmIndex === seqIndex;
          const markerLabel = kind === 'onset' ? 'T0' : `N${seqIndex}`;
          return (
            <g
              key={`peak-${id}`}
              className="view-spike-hit"
              role="button"
              aria-label={`Select ${
                kind === 'onset' ? 'transition onset' : 'entropy spike'
              } N${seqIndex}`}
              tabIndex={0}
              onClick={() => onSpikeSelect(actorId, seqIndex)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSpikeSelect(actorId, seqIndex);
                }
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={7.5}
                className={`view-peak-ring ${
                  kind === 'onset' ? 'view-peak-ring--onset' : ''
                } ${isActive ? 'view-peak-ring--active' : ''}`}
              />
              <circle cx={x} cy={y} r={2.6} className="view-peak-core" />
              <text x={x} y={y - 11} className="view-peak-label" textAnchor="middle">
                {markerLabel}
              </text>
            </g>
          );
        })}

        {chart.xTicks.map((tick) => (
          <g key={`river-x-${tick.value}`}>
            <line
              x1={tick.x}
              y1={chart.ratingBottom}
              x2={tick.x}
              y2={chart.ratingBottom + 4}
              className="view-axis"
            />
            <text
              x={tick.x}
              y={chart.ratingBottom + 16}
              className="view-axis-tick"
              textAnchor="middle"
            >
              N{tick.value}
            </text>
          </g>
        ))}
      </svg>

      <ChartTooltip
        label={chart.captionLabel}
        detail={
          !isCohortMode && selectedActorId !== null && selectedFilmIndex !== null
            ? `选中 N=${selectedFilmIndex} · 已同步 C 的 τ 辅助线`
            : chart.captionDetail
        }
        tone={!isCohortMode && selectedActorId !== null ? 'active' : 'default'}
      />
    </figure>
  );
}

interface RiverDot {
  id: string;
  seqIndex: number;
  actorId: string | null;
  x: number;
  y: number;
  r: number;
  rating: number;
}

interface ClickableRiverDot extends RiverDot {
  actorId: string;
}

interface RiverHighlight {
  id: string;
  actorId: string;
  seqIndex: number;
  x: number;
  y: number;
  kind: 'onset' | 'spike';
}

interface RiverChart {
  maxN: number;
  streamTop: number;
  streamBottom: number;
  ratingTop: number;
  ratingBottom: number;
  ratingAxisX: number;
  series: SeriesBand[];
  entropyPath: string;
  dots: RiverDot[];
  clickableDots: ClickableRiverDot[];
  spikes: RiverHighlight[];
  xTicks: XAxisTick[];
  ratingTicks: YAxisTick[];
  captionLabel: string;
  captionDetail: string;
}

function getChartLayout() {
  return {
    innerLeft: MARGIN.left,
    innerRight: WIDTH - MARGIN.right,
    streamTop: MARGIN.top + 8,
    streamBottom: HEIGHT - 114,
    ratingTop: HEIGHT - 92,
    ratingBottom: HEIGHT - 30,
    ratingAxisX: MARGIN.left - 12,
  };
}

function buildSingleActorChart(
  bundle: DataBundle,
  indexes: DataIndexes,
  targetActorId: string | null,
): RiverChart | null {
  const actorsByFilmCount = [...bundle.actors].sort(
    (left, right) => right.filmCount - left.filmCount,
  );
  // 选中演员优先；未选中（targetActorId=null）时回退到演示样例演员。
  const selectedActor =
    targetActorId !== null ? (indexes.actorsById.get(targetActorId) ?? null) : null;
  const sampleActor =
    selectedActor ??
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
  const { innerLeft, innerRight, streamTop, streamBottom, ratingTop, ratingBottom, ratingAxisX } =
    getChartLayout();
  const xTicks = buildCareerTicks(maxN).map((value) => ({
    value,
    x: linearScale(value, 1, maxN, innerLeft, innerRight),
  }));
  const ratingTicks = buildRatingTicks(ratingTop, ratingBottom);

  const genreTokenLookup = buildGenreTokenLookup(bundle.genres);

  const dominantCounts = new Map<string, number>();
  films.forEach((film) => {
    dominantCounts.set(film.dominantGenre, (dominantCounts.get(film.dominantGenre) ?? 0) + 1);
  });

  const coreGenres = [...dominantCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, CORE_GENRE_COUNT)
    .map(([genre]) => genre);

  const seriesKeys = [...coreGenres, 'Other'];
  const series = new Map<string, SeriesBand>(
    seriesKeys.map((key) => [
      key,
      {
        key,
        tokenIndex: key === 'Other' ? 0 : (genreTokenLookup.get(key) ?? 1),
        isOther: key === 'Other',
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
      const value =
        key === 'Other' ? otherCount / windowTotal : (proportions.get(key) ?? 0) / windowTotal;
      const y0 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
      cumulative += value;
      const y1 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
      series.get(key)?.points.push({ x, y0, y1 });
    }
  }

  const entropyPoints = entropy.curve.filter((point) => point.n <= maxN);
  const maxEntropy = Math.max(...entropyPoints.map((point) => point.entropy), 0.01);
  const entropyPath = polylinePath(
    entropyPoints.map((point) => ({
      x: linearScale(point.n, 1, maxN, innerLeft, innerRight),
      y: linearScale(point.entropy, 0, maxEntropy, streamBottom, streamTop),
    })),
  );
  const spikes = pickEntropySpikes(
    entropyPoints,
    sampleActor.id,
    (point) => ({
      x: linearScale(point.n, 1, maxN, innerLeft, innerRight),
      y: linearScale(point.entropy, 0, maxEntropy, streamBottom, streamTop),
    }),
    { t0Index: sampleActor.t0Index },
  );

  const voteValues = films.map((film) => film.numVotes);
  const voteMin = Math.min(...voteValues);
  const voteMax = Math.max(...voteValues);

  const dots = films.map((film) => {
    const voteRatio = voteMax === voteMin ? 0.5 : (film.numVotes - voteMin) / (voteMax - voteMin);
    return {
      id: `${film.actorId}-${film.seqIndex}`,
      seqIndex: film.seqIndex,
      actorId: film.actorId,
      x: linearScale(film.seqIndex, 1, maxN, innerLeft, innerRight),
      y: linearScale(film.rating, 0, 10, ratingBottom, ratingTop),
      r: 2 + Math.sqrt(voteRatio) * 5,
      rating: film.rating,
    };
  });
  const clickableDots = dots.filter((dot): dot is ClickableRiverDot => dot.actorId !== null);

  return {
    maxN,
    streamTop,
    streamBottom,
    ratingTop,
    ratingBottom,
    ratingAxisX,
    series: [...series.values()],
    entropyPath,
    dots,
    clickableDots,
    spikes,
    xTicks,
    ratingTicks,
    captionLabel: `单演员 · ${sampleActor.name} · films=${films.length}`,
    captionDetail:
      spikes.length > 0
        ? '横轴=N(作品序列) · 白线=Shannon entropy · 圆点 y=IMDb rating r=votes · 尖峰/影片可点击'
        : '横轴=N(作品序列) · 白线=Shannon entropy · 圆点 y=IMDb rating r=votes · 影片可点击',
  };
}

function buildCohortChart(
  bundle: DataBundle,
  indexes: DataIndexes,
  cohortActorIds: string[],
): RiverChart | null {
  const actorSet = new Set(cohortActorIds);
  const cohortFilmsByActor = cohortActorIds
    .map((actorId) => indexes.filmsByActor.get(actorId) ?? [])
    .filter((films) => films.length > 0);

  if (actorSet.size === 0 || cohortFilmsByActor.length === 0) {
    return null;
  }

  const entropyCurves = bundle.entropy.filter((curve) => actorSet.has(curve.actorId));
  const entropyStats = buildCohortEntropyStats(entropyCurves, MAX_COHORT_N);
  if (entropyStats.length === 0) {
    return null;
  }

  const maxFilmN = Math.max(...cohortFilmsByActor.map((films) => films[films.length - 1].seqIndex));
  const maxN = Math.min(MAX_COHORT_N, maxFilmN, entropyStats[entropyStats.length - 1].n);
  if (maxN < 1) {
    return null;
  }

  const { innerLeft, innerRight, streamTop, streamBottom, ratingTop, ratingBottom, ratingAxisX } =
    getChartLayout();
  const xTicks = buildCareerTicks(maxN).map((value) => ({
    value,
    x: linearScale(value, 1, maxN, innerLeft, innerRight),
  }));
  const ratingTicks = buildRatingTicks(ratingTop, ratingBottom);
  const genreTokenLookup = buildGenreTokenLookup(bundle.genres);
  const dominantCounts = new Map<string, number>();

  for (const films of cohortFilmsByActor) {
    for (const film of films.slice(0, maxN)) {
      dominantCounts.set(film.dominantGenre, (dominantCounts.get(film.dominantGenre) ?? 0) + 1);
    }
  }

  const coreGenres = [...dominantCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, CORE_GENRE_COUNT)
    .map(([genre]) => genre);
  const coreGenreSet = new Set(coreGenres);

  const seriesKeys = [...coreGenres, 'Other'];
  const series = new Map<string, SeriesBand>(
    seriesKeys.map((key) => [
      key,
      {
        key,
        tokenIndex: key === 'Other' ? 0 : (genreTokenLookup.get(key) ?? 1),
        isOther: key === 'Other',
        points: [],
      },
    ]),
  );
  const averageDots: RiverDot[] = [];

  for (let n = 1; n <= maxN; n += 1) {
    const totals = new Map<string, number>(seriesKeys.map((key) => [key, 0]));
    const ratings: number[] = [];
    const votes: number[] = [];
    let actorCountAtN = 0;

    for (const films of cohortFilmsByActor) {
      if (films.length < n) {
        continue;
      }
      actorCountAtN += 1;
      const windowFilms = films.slice(Math.max(0, n - WINDOW_SIZE), n);
      const windowTotal = windowFilms.length || 1;
      let otherCount = 0;

      for (const film of windowFilms) {
        if (coreGenreSet.has(film.dominantGenre)) {
          totals.set(film.dominantGenre, (totals.get(film.dominantGenre) ?? 0) + 1 / windowTotal);
        } else {
          otherCount += 1;
        }
      }
      totals.set('Other', (totals.get('Other') ?? 0) + otherCount / windowTotal);

      const filmAtN = films[n - 1];
      ratings.push(filmAtN.rating);
      votes.push(filmAtN.numVotes);
    }

    if (actorCountAtN === 0) {
      continue;
    }

    const x = linearScale(n, 1, maxN, innerLeft, innerRight);
    let cumulative = 0;

    for (const key of seriesKeys) {
      const value = (totals.get(key) ?? 0) / actorCountAtN;
      const y0 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
      cumulative += value;
      const y1 = linearScale(cumulative, 0, 1, streamBottom, streamTop);
      series.get(key)?.points.push({ x, y0, y1 });
    }

    const meanRating = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    const meanVotes = votes.reduce((sum, value) => sum + value, 0) / votes.length;
    averageDots.push({
      id: `cohort-${n}`,
      seqIndex: n,
      actorId: null,
      x,
      y: linearScale(meanRating, 0, 10, ratingBottom, ratingTop),
      r: Math.max(2.2, Math.min(6.5, 2 + Math.sqrt(meanVotes / 100000))),
      rating: meanRating,
    });
  }

  const visibleEntropyStats = entropyStats.filter((point) => point.n <= maxN);
  const maxEntropy = Math.max(...visibleEntropyStats.map((point) => point.mean), 0.01);
  const entropyPath = polylinePath(
    visibleEntropyStats.map((point) => ({
      x: linearScale(point.n, 1, maxN, innerLeft, innerRight),
      y: linearScale(point.mean, 0, maxEntropy, streamBottom, streamTop),
    })),
  );
  // TODO: Revisit whether this should become cohort distribution entropy; it is currently
  // the arithmetic mean of individual actor entropy curves at each career index.
  const spikes: RiverHighlight[] = [];

  return {
    maxN,
    streamTop,
    streamBottom,
    ratingTop,
    ratingBottom,
    ratingAxisX,
    series: [...series.values()],
    entropyPath,
    dots: averageDots,
    clickableDots: [],
    spikes,
    xTicks,
    ratingTicks,
    captionLabel: `cohort · actors=${actorSet.size} · N≤${maxN}`,
    captionDetail: '白线=总体 entropy 均值 · 圆点=平均 IMDb rating/votes · 概览模式',
  };
}

function buildCareerTicks(maxN: number): number[] {
  if (maxN <= 1) {
    return [1];
  }

  const ticks = [1];
  for (let value = 5; value <= maxN; value += 5) {
    ticks.push(value);
  }

  const last = ticks[ticks.length - 1];
  if (maxN - last >= 3) {
    ticks.push(maxN);
  }

  return ticks;
}

function buildRatingTicks(ratingTop: number, ratingBottom: number): YAxisTick[] {
  return [0, 5, 10].map((value) => ({
    value,
    y: linearScale(value, 0, 10, ratingBottom, ratingTop),
  }));
}

function buildCohortEntropyStats(
  curves: EntropyCurve[],
  maxN: number,
): CohortEntropyStats[] {
  const valuesByN = new Map<number, number[]>();

  for (const curve of curves) {
    for (const point of curve.curve) {
      if (point.n < 1 || point.n > maxN) {
        continue;
      }
      const values = valuesByN.get(point.n) ?? [];
      values.push(point.entropy);
      valuesByN.set(point.n, values);
    }
  }

  return [...valuesByN.entries()]
    .sort(([leftN], [rightN]) => leftN - rightN)
    .map(([n, values]) => {
      const sorted = [...values].sort((left, right) => left - right);
      const sum = sorted.reduce((total, value) => total + value, 0);
      return {
        n,
        mean: sum / sorted.length,
      };
    });
}

function pickEntropySpikes(
  points: EntropyPoint[],
  actorId: string | null,
  positionForPoint: (point: EntropyPoint) => { x: number; y: number },
  options: { t0Index?: number } = {},
  actorForPoint?: (point: EntropyPoint) => string | null,
): RiverHighlight[] {
  if (points.length === 0) {
    return [];
  }

  const entropyValues = points.map((point) => point.entropy);
  const entropyMin = Math.min(...entropyValues);
  const entropyMax = Math.max(...entropyValues);
  const entropyRange = Math.max(0.001, entropyMax - entropyMin);
  const candidateByN = new Map<
    number,
    { point: EntropyPoint; score: number; kind: RiverHighlight['kind'] }
  >();

  points.forEach((point, index) => {
    const previous = points[index - 1];
    const next = points[index + 1];
    if (!previous || !next) {
      return;
    }

    const isPeakOrPlateau =
      point.entropy >= previous.entropy &&
      point.entropy >= next.entropy &&
      (point.entropy > previous.entropy || point.entropy > next.entropy);
    if (!isPeakOrPlateau) {
      return;
    }

    const baselineStart = Math.max(0, index - SPIKE_BASELINE_WINDOW);
    const baseline = points.slice(baselineStart, index);
    const baselineMean =
      baseline.reduce((sum, entry) => sum + entry.entropy, 0) / Math.max(1, baseline.length);
    const localProminence = point.entropy - Math.max(previous.entropy, next.entropy);
    const baselineLift = point.entropy - baselineMean;
    const normalizedHeight = (point.entropy - entropyMin) / entropyRange;
    const score = baselineLift * 1.5 + localProminence + normalizedHeight * 0.25;

    if (baselineLift <= 0 && localProminence <= 0) {
      return;
    }

    candidateByN.set(point.n, { point, score, kind: 'spike' });
  });

  const onsetPoint =
    options.t0Index !== undefined && options.t0Index > 0
      ? points.find((point) => point.n === options.t0Index)
      : undefined;
  if (onsetPoint) {
    const existing = candidateByN.get(onsetPoint.n);
    candidateByN.set(onsetPoint.n, {
      point: onsetPoint,
      score: (existing?.score ?? 0) + ONSET_SCORE_BONUS,
      kind: 'onset',
    });
  }

  const sortedCandidates = [...candidateByN.values()].sort(
    (left, right) => right.score - left.score,
  );
  const onsetCandidate = onsetPoint ? candidateByN.get(onsetPoint.n) : undefined;
  const selectedCandidates = onsetCandidate
    ? [
        onsetCandidate,
        ...sortedCandidates
          .filter((candidate) => candidate.point.n !== onsetCandidate.point.n)
          .slice(0, SPIKE_LIMIT - 1),
      ]
    : sortedCandidates.slice(0, SPIKE_LIMIT);

  return selectedCandidates
    .sort((left, right) => left.point.n - right.point.n)
    .map(({ point, kind }) => {
      const resolvedActorId = actorForPoint?.(point) ?? actorId;
      if (!resolvedActorId) {
        return null;
      }
      const { x, y } = positionForPoint(point);
      return {
        id: `${resolvedActorId}-${point.n}`,
        actorId: resolvedActorId,
        seqIndex: point.n,
        x,
        y,
        kind,
      };
    })
    .filter((entry): entry is RiverHighlight => entry !== null);
}
