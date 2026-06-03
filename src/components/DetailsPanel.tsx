import { useMemo } from 'react';
import { useDataRuntime } from '../data/dataRuntimeContext';
import { useVizStore } from '../store/useVizStore';
import type { Film } from '../data/types';

const WINDOW_RADIUS = 2; // 转型窗口 = [sel−2, sel+2]

function formatVotes(votes: number): string {
  if (votes >= 1_000_000) {
    return `${(votes / 1_000_000).toFixed(1)}M`;
  }
  if (votes >= 1_000) {
    return `${(votes / 1_000).toFixed(1)}K`;
  }
  return `${votes}`;
}

/** 相对基线的方向标记：↑ 升 / ↓ 降 / · 平。 */
function deltaMark(value: number, baseline: number | null): { mark: string; tone: 'up' | 'down' | 'flat' } {
  if (baseline === null || baseline === 0) {
    return { mark: '·', tone: 'flat' };
  }
  const ratio = (value - baseline) / baseline;
  if (ratio > 0.05) {
    return { mark: '▲', tone: 'up' };
  }
  if (ratio < -0.05) {
    return { mark: '▼', tone: 'down' };
  }
  return { mark: '·', tone: 'flat' };
}

export function DetailsPanel() {
  const runtime = useDataRuntime();
  const detailsOpen = useVizStore((state) => state.detailsOpen);
  const selectedActorId = useVizStore((state) => state.selectedActorId);
  const selectedFilmIndex = useVizStore((state) => state.selectedFilmIndex);
  const closeDetails = useVizStore((state) => state.closeDetails);

  const detail = useMemo(() => {
    if (runtime.status !== 'ready' || selectedActorId === null || selectedFilmIndex === null) {
      return null;
    }
    const { indexes } = runtime;
    const actor = indexes.actorsById.get(selectedActorId);
    const films = indexes.filmsByActor.get(selectedActorId);
    if (!actor || !films || films.length === 0) {
      return null;
    }

    const t0Index = actor.t0Index;
    // 转型前基线：T=0 之前的作品，用于对比"评分↑/票房↓"签名。
    const baselineFilms = films.filter((film) => film.seqIndex < t0Index);
    const avg = (values: number[]) =>
      values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
    const baselineRating = avg(baselineFilms.map((film) => film.rating));
    const baselineVotes = avg(baselineFilms.map((film) => film.numVotes));

    const windowFilms = films
      .filter(
        (film) =>
          film.seqIndex >= selectedFilmIndex - WINDOW_RADIUS &&
          film.seqIndex <= selectedFilmIndex + WINDOW_RADIUS,
      )
      .sort((left, right) => left.seqIndex - right.seqIndex);

    const track = indexes.alignmentByActor.get(selectedActorId);
    const directorHeterogeneity =
      track && track.outcome !== 'none' ? track.covariatesAtT0.directorHeterogeneity : null;

    return {
      actor,
      pivotIndex: selectedFilmIndex,
      tau: selectedFilmIndex - t0Index,
      baselineRating,
      baselineVotes,
      windowFilms,
      directorHeterogeneity,
    };
  }, [runtime, selectedActorId, selectedFilmIndex]);

  if (!detailsOpen || !detail) {
    return null;
  }

  const { actor, pivotIndex, tau, baselineRating, baselineVotes, windowFilms, directorHeterogeneity } =
    detail;

  return (
    <aside className="details-panel" role="dialog" aria-label="转型作品微观数据">
      <header className="details-panel__header">
        <div>
          <h2 className="details-panel__title">{actor.name}</h2>
          <p className="details-panel__meta">
            cluster {actor.clusterId} · outcome {actor.outcome} · τ={tau}
            {directorHeterogeneity !== null
              ? ` · 导演异质性 ${directorHeterogeneity.toFixed(2)}`
              : ''}
          </p>
        </div>
        <button type="button" className="details-panel__close" onClick={closeDetails} aria-label="关闭">
          ×
        </button>
      </header>

      <p className="details-panel__hint">
        转型窗口 N{pivotIndex - WINDOW_RADIUS}–N{pivotIndex + WINDOW_RADIUS} · 相对 T=0 前基线（评分{' '}
        {baselineRating !== null ? baselineRating.toFixed(1) : '—'} · 票房{' '}
        {baselineVotes !== null ? formatVotes(baselineVotes) : '—'}）
      </p>

      <table className="details-panel__table">
        <thead>
          <tr>
            <th>作品</th>
            <th>年份</th>
            <th>主导类型</th>
            <th>评分</th>
            <th>票房</th>
          </tr>
        </thead>
        <tbody>
          {windowFilms.map((film: Film) => {
            const ratingDelta = deltaMark(film.rating, baselineRating);
            const votesDelta = deltaMark(film.numVotes, baselineVotes);
            const isPivot = film.seqIndex === pivotIndex;
            return (
              <tr key={film.seqIndex} className={isPivot ? 'details-panel__row--pivot' : ''}>
                <td className="details-panel__seq">N{film.seqIndex}</td>
                <td>{film.year}</td>
                <td>
                  <span className="details-panel__genre">{film.dominantGenre}</span>
                  {film.genres.length > 1 ? (
                    <span className="details-panel__genres-extra"> +{film.genres.length - 1}</span>
                  ) : null}
                </td>
                <td>
                  {film.rating.toFixed(1)}{' '}
                  <span className={`details-panel__delta details-panel__delta--${ratingDelta.tone}`}>
                    {ratingDelta.mark}
                  </span>
                </td>
                <td>
                  {formatVotes(film.numVotes)}{' '}
                  <span className={`details-panel__delta details-panel__delta--${votesDelta.tone}`}>
                    {votesDelta.mark}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </aside>
  );
}
