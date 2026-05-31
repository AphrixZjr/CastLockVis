import type { AlignmentTrack, EntropyCurve, EntropyPoint } from '../data/types';
import type { AlignmentFilters } from '../store/useVizStore';

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

export function filterAlignmentTracks(
  tracks: AlignmentTrack[],
  filters: AlignmentFilters,
): AlignmentTrack[] {
  const [dhMin, dhMax] = filters.directorHeterogeneity;
  const [ratingMin, ratingMax] = filters.rating;
  const [votesMin, votesMax] = filters.numVotes;

  return tracks.filter((track) => {
    const { directorHeterogeneity, rating, numVotes } = track.covariatesAtT0;

    if (directorHeterogeneity === null || rating === null || numVotes === null) {
      return false;
    }

    return (
      directorHeterogeneity >= dhMin &&
      directorHeterogeneity <= dhMax &&
      rating >= ratingMin &&
      rating <= ratingMax &&
      numVotes >= votesMin &&
      numVotes <= votesMax
    );
  });
}
