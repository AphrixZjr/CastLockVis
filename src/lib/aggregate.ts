import type { AlignmentTrack, EntropyCurve, EntropyPoint, Film } from '../data/types';
import type { AlignmentFilters } from '../store/useVizStore';

export interface GenreBandSeries {
  /** 类型名，或聚合尾部的 'Other'。 */
  key: string;
  /** 各序号位置(n=1..maxN)上该类型在 cohort 中的平均占比，proportions[n-1]。 */
  proportions: number[];
}

/**
 * 群落平均类型流带：对每个作品序号 n，统计 cohort 中"第 n 部电影"的 `dominantGenre`
 * 分布，得到各类型占比。取累计 `dominantGenre` 最多的 `coreCount` 个类型，其余归入 'Other'。
 * 这只是对 films.json 既有 `dominantGenre` 标签的占比汇总（与单演员河流图同一类计算），
 * 不做任何统计重算——符合「前端只汇总/筛选」约束。
 */
export function averageCohortGenreBands(
  filmsByActor: Map<string, Film[]>,
  cohortActorIds: string[],
  maxN: number,
  coreCount = 6,
): { series: GenreBandSeries[]; maxN: number } {
  const totalCounts = new Map<string, number>();
  const perPosition: Array<Map<string, number>> = Array.from({ length: maxN }, () => new Map());
  const presentCount = new Array<number>(maxN).fill(0);

  for (const actorId of cohortActorIds) {
    const films = filmsByActor.get(actorId);
    if (!films) {
      continue;
    }
    for (const film of films) {
      if (film.seqIndex < 1 || film.seqIndex > maxN) {
        continue;
      }
      const idx = film.seqIndex - 1;
      perPosition[idx].set(film.dominantGenre, (perPosition[idx].get(film.dominantGenre) ?? 0) + 1);
      presentCount[idx] += 1;
      totalCounts.set(film.dominantGenre, (totalCounts.get(film.dominantGenre) ?? 0) + 1);
    }
  }

  const coreGenres = [...totalCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, coreCount)
    .map(([genre]) => genre);

  const series: GenreBandSeries[] = [...coreGenres, 'Other'].map((key) => ({
    key,
    proportions: new Array<number>(maxN).fill(0),
  }));

  for (let n = 0; n < maxN; n += 1) {
    const total = presentCount[n] || 1;
    let coreSum = 0;
    series.forEach((band) => {
      if (band.key === 'Other') {
        return;
      }
      const count = perPosition[n].get(band.key) ?? 0;
      coreSum += count;
      band.proportions[n] = count / total;
    });
    const other = series[series.length - 1];
    other.proportions[n] = (presentCount[n] - coreSum) / total;
  }

  return { series, maxN };
}

export function averageEntropyCurves(curves: EntropyCurve[]): EntropyPoint[] {
  if (curves.length === 0) {
    return [];
  }

  const sums = new Map<number, { sum: number; count: number }>();
  for (const curve of curves) {
    for (const point of curve.curve) {
      const current = sums.get(point.n);
      if (current) {
        current.sum += point.entropy;
        current.count += 1;
      } else {
        sums.set(point.n, { sum: point.entropy, count: 1 });
      }
    }
  }

  return Array.from(sums.entries())
    .map(([n, { sum, count }]) => ({ n, entropy: sum / count }))
    .sort((left, right) => left.n - right.n);
}

/**
 * 单条对齐轨迹是否通过当前控制变量过滤器。`none` 轨迹无 T=0 协变量，恒为 false
 * （视图 C 把它们当淡灰上下文，不参与绿/红重分层）。
 */
export function alignmentTrackInFilter(
  track: AlignmentTrack,
  filters: AlignmentFilters,
): boolean {
  if (track.outcome === 'none') {
    return false;
  }
  const [dhMin, dhMax] = filters.directorHeterogeneity;
  const [ratingMin, ratingMax] = filters.rating;
  const [votesMin, votesMax] = filters.numVotes;
  const { directorHeterogeneity, rating, numVotes } = track.covariatesAtT0;
  return (
    directorHeterogeneity >= dhMin &&
    directorHeterogeneity <= dhMax &&
    rating >= ratingMin &&
    rating <= ratingMax &&
    numVotes >= votesMin &&
    numVotes <= votesMax
  );
}

export function filterAlignmentTracks(
  tracks: AlignmentTrack[],
  filters: AlignmentFilters,
): AlignmentTrack[] {
  return tracks.filter((track) => alignmentTrackInFilter(track, filters));
}
