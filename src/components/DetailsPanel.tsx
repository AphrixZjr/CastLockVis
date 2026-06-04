import { useDataRuntime } from '../data/dataRuntimeContext';
import { useVizStore } from '../store/useVizStore';
import type { Actor, AlignmentTrack, DataIndexes, Film } from '../data/types';
import './DetailsPanel.css';

interface DetailContext {
  actor: Actor | null;
  film: Film | null;
  previousFilm: Film | null;
  nextFilm: Film | null;
  alignment: AlignmentTrack | null;
}

// 视觉/内容沿用 main（main 版 DetailsPanel），但外壳改为订阅 Zustand store，
// 与 feat/s4-linking 的「视图自取 store」架构一致：不再由 App 透传 props。
export function DetailsPanel() {
  const runtime = useDataRuntime();
  const detailsOpen = useVizStore((state) => state.detailsOpen);
  const selectedActorId = useVizStore((state) => state.selectedActorId);
  const selectedFilmIndex = useVizStore((state) => state.selectedFilmIndex);
  const closeDetails = useVizStore((state) => state.closeDetails);

  if (!detailsOpen || runtime.status !== 'ready') {
    return null;
  }

  const details = getDetailContext(runtime.indexes, selectedActorId, selectedFilmIndex);
  const ratingDelta = diff(details.film?.rating, details.previousFilm?.rating);
  const votesDelta = diff(details.film?.numVotes, details.previousFilm?.numVotes);

  return (
    <aside className="details-panel" aria-label="Selected transformation details">
      <header className="details-panel__header">
        <div>
          <h2 className="details-panel__title">Transformation Detail</h2>
          <p className="details-panel__subtitle">
            {details.actor?.name ?? selectedActorId ?? 'No actor selected'}
          </p>
        </div>
        <button
          className="details-panel__close"
          type="button"
          onClick={closeDetails}
          aria-label="Close details"
        >
          Close
        </button>
      </header>

      {!details.film ? (
        <div className="details-panel__empty">No film found for the selected spike.</div>
      ) : (
        <>
          <section className="details-panel__section">
            <h3 className="details-panel__section-title">Selected Work</h3>
            <dl className="details-grid">
              <DetailTerm label="seqIndex" value={`N${details.film.seqIndex}`} />
              <DetailTerm label="title" value={details.film.title} />
              <DetailTerm label="year" value={details.film.year} />
              <DetailTerm label="genre" value={details.film.dominantGenre} />
              <DetailTerm label="director" value={details.film.directorId} />
            </dl>
          </section>

          <section className="details-panel__section">
            <h3 className="details-panel__section-title">Local Signal</h3>
            <div className="signal-grid">
              <SignalCard
                label="rating"
                value={details.film.rating.toFixed(1)}
                delta={ratingDelta}
              />
              <SignalCard
                label="numVotes"
                value={formatNumber(details.film.numVotes)}
                delta={votesDelta}
              />
              <SignalCard
                label="outcome"
                value={details.alignment?.outcome ?? details.actor?.outcome ?? 'none'}
              />
            </div>
          </section>

          <section className="details-panel__section">
            <h3 className="details-panel__section-title">T=0 Covariates</h3>
            <dl className="details-grid">
              <DetailTerm
                label="t0Index"
                value={details.alignment?.t0Index ?? details.actor?.t0Index ?? 'n/a'}
              />
              <DetailTerm
                label="cluster"
                value={details.alignment?.clusterId ?? details.actor?.clusterId ?? 'n/a'}
              />
              <DetailTerm
                label="rating@T0"
                value={
                  details.alignment?.covariatesAtT0.rating === null ||
                  details.alignment?.covariatesAtT0.rating === undefined
                    ? 'n/a'
                    : details.alignment.covariatesAtT0.rating.toFixed(1)
                }
              />
              <DetailTerm
                label="votes@T0"
                value={
                  details.alignment?.covariatesAtT0.numVotes === null ||
                  details.alignment?.covariatesAtT0.numVotes === undefined
                    ? 'n/a'
                    : formatNumber(details.alignment.covariatesAtT0.numVotes)
                }
              />
              <DetailTerm
                label="directorHet"
                value={details.alignment?.covariatesAtT0.directorHeterogeneity ?? 'n/a'}
              />
            </dl>
          </section>

          <section className="details-panel__section details-panel__section--compact">
            <h3 className="details-panel__section-title">Neighbor Works</h3>
            <p className="details-panel__neighbor">
              prev: {formatNeighbor(details.previousFilm)} · next:{' '}
              {formatNeighbor(details.nextFilm)}
            </p>
          </section>
        </>
      )}
    </aside>
  );
}

function getDetailContext(
  indexes: DataIndexes,
  actorId: string | null,
  filmIndex: number | null,
): DetailContext {
  if (!actorId || filmIndex === null) {
    return { actor: null, film: null, previousFilm: null, nextFilm: null, alignment: null };
  }

  const films = indexes.filmsByActor.get(actorId) ?? [];
  return {
    actor: indexes.actorsById.get(actorId) ?? null,
    film: films.find((film) => film.seqIndex === filmIndex) ?? null,
    previousFilm: films.find((film) => film.seqIndex === filmIndex - 1) ?? null,
    nextFilm: films.find((film) => film.seqIndex === filmIndex + 1) ?? null,
    alignment: indexes.alignmentByActor.get(actorId) ?? null,
  };
}

function DetailTerm({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function SignalCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div className="signal-card">
      <span className="signal-card__label">{label}</span>
      <strong className="signal-card__value">{value}</strong>
      {delta !== undefined && delta !== null && (
        <span
          className={`signal-card__delta ${delta >= 0 ? 'signal-card__delta--up' : 'signal-card__delta--down'}`}
        >
          {delta >= 0 ? '+' : ''}
          {Number.isInteger(delta) ? formatNumber(delta) : delta.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function diff(current: number | undefined, previous: number | undefined): number | null {
  if (current === undefined || previous === undefined) {
    return null;
  }
  return current - previous;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatNeighbor(film: Film | null): string {
  if (!film) {
    return 'n/a';
  }
  return `N${film.seqIndex} ${film.dominantGenre} ${film.rating.toFixed(1)}`;
}
