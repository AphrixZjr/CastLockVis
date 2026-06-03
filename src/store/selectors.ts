import {
  averageCohortGenreBands,
  averageEntropyCurves,
  filterAlignmentTracks,
} from '../lib/aggregate';
import type { DataBundle, DataIndexes, EntropyCurve, MarkovMatrix } from '../data/types';
import type { AlignmentFilters } from './useVizStore';

export function getCohortActorIds(
  allActorIds: string[],
  brushedActorIds: Set<string>,
): string[] {
  if (brushedActorIds.size === 0) {
    return allActorIds;
  }
  return allActorIds.filter((actorId) => brushedActorIds.has(actorId));
}

export function getCohortEntropyCurves(
  bundle: DataBundle,
  cohortActorIds: string[],
): EntropyCurve[] {
  const actorSet = new Set(cohortActorIds);
  return bundle.entropy.filter((curve) => actorSet.has(curve.actorId));
}

export function getCohortAverageEntropy(
  bundle: DataBundle,
  cohortActorIds: string[],
) {
  return averageEntropyCurves(getCohortEntropyCurves(bundle, cohortActorIds));
}

export function getDominantClusterId(
  indexes: DataIndexes,
  cohortActorIds: string[],
): number | null {
  if (cohortActorIds.length === 0) {
    return null;
  }

  const counts = new Map<number, number>();
  for (const actorId of cohortActorIds) {
    const actor = indexes.actorsById.get(actorId);
    if (!actor) {
      continue;
    }
    counts.set(actor.clusterId, (counts.get(actor.clusterId) ?? 0) + 1);
  }

  let bestCluster: number | null = null;
  let maxCount = -1;
  for (const [clusterId, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      bestCluster = clusterId;
    }
  }
  return bestCluster;
}

export function getMarkovMatrixForCohort(
  indexes: DataIndexes,
  stage: MarkovMatrix['stage'],
  clusterId: number | null,
): MarkovMatrix | null {
  if (clusterId === null) {
    return null;
  }
  return indexes.markovByClusterStage.get(`${clusterId}:${stage}`) ?? null;
}

export function getCohortGenreBands(
  indexes: DataIndexes,
  cohortActorIds: string[],
  maxN: number,
) {
  return averageCohortGenreBands(indexes.filmsByActor, cohortActorIds, maxN);
}

export function getFilteredAlignmentTracks(
  bundle: DataBundle,
  filters: AlignmentFilters,
) {
  return filterAlignmentTracks(bundle.alignment, filters);
}

