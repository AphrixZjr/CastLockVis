import type {
  Actor,
  AlignmentTrack,
  DataBundle,
  DataIndexes,
  EntropyCurve,
  Film,
  MarkovMatrix,
  MarkovStage,
  Outcome,
} from './types';

const DATA_PATHS = {
  genres: 'data/genres.json',
  actors: 'data/actors.json',
  films: 'data/films.json',
  entropy: 'data/entropy.json',
  markov: 'data/markov.json',
  alignment: 'data/alignment.json',
} as const;

const OUTCOME_SET = new Set<Outcome>(['success', 'snapback', 'none']);
const MARKOV_STAGE_SET = new Set<MarkovStage>(['early', 'mid', 'late']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function createTypeError(resourceName: string, details: string): Error {
  return new Error(`[${resourceName}] shape validation failed: ${details}`);
}

async function fetchJson(resourcePath: string): Promise<unknown> {
  const url = `${import.meta.env.BASE_URL}${resourcePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed for ${resourcePath}: HTTP ${response.status}`);
  }
  return response.json();
}

function parseActors(raw: unknown): Actor[] {
  if (!Array.isArray(raw)) {
    throw createTypeError('actors.json', 'root is not an array');
  }

  return raw.map((entry, index) => {
    if (!isRecord(entry)) {
      throw createTypeError('actors.json', `index ${index} is not an object`);
    }

    const projection = entry.projection;
    if (
      !Array.isArray(projection) ||
      projection.length !== 2 ||
      typeof projection[0] !== 'number' ||
      typeof projection[1] !== 'number'
    ) {
      throw createTypeError('actors.json', `index ${index} has invalid projection`);
    }

    if (
      typeof entry.id !== 'string' ||
      typeof entry.name !== 'string' ||
      typeof entry.dominantEarlyGenre !== 'string' ||
      !isNumberArray(entry.earlyGenreVector) ||
      typeof entry.filmCount !== 'number' ||
      typeof entry.t0Index !== 'number' ||
      typeof entry.clusterId !== 'number' ||
      typeof entry.outcome !== 'string' ||
      !OUTCOME_SET.has(entry.outcome as Outcome)
    ) {
      throw createTypeError('actors.json', `index ${index} has invalid fields`);
    }

    return {
      id: entry.id,
      name: entry.name,
      dominantEarlyGenre: entry.dominantEarlyGenre,
      earlyGenreVector: entry.earlyGenreVector,
      filmCount: entry.filmCount,
      t0Index: entry.t0Index,
      outcome: entry.outcome as Outcome,
      projection: [projection[0], projection[1]],
      clusterId: entry.clusterId,
    };
  });
}

function parseFilms(raw: unknown): Film[] {
  if (!Array.isArray(raw)) {
    throw createTypeError('films.json', 'root is not an array');
  }

  return raw.map((entry, index) => {
    if (!isRecord(entry)) {
      throw createTypeError('films.json', `index ${index} is not an object`);
    }

    if (
      typeof entry.actorId !== 'string' ||
      typeof entry.seqIndex !== 'number' ||
      typeof entry.title !== 'string' ||
      typeof entry.year !== 'number' ||
      !isStringArray(entry.genres) ||
      typeof entry.dominantGenre !== 'string' ||
      typeof entry.rating !== 'number' ||
      typeof entry.numVotes !== 'number' ||
      typeof entry.directorId !== 'string'
    ) {
      throw createTypeError('films.json', `index ${index} has invalid fields`);
    }

    return {
      actorId: entry.actorId,
      seqIndex: entry.seqIndex,
      title: entry.title,
      year: entry.year,
      genres: entry.genres,
      dominantGenre: entry.dominantGenre,
      rating: entry.rating,
      numVotes: entry.numVotes,
      directorId: entry.directorId,
    };
  });
}

function parseEntropy(raw: unknown): EntropyCurve[] {
  if (!Array.isArray(raw)) {
    throw createTypeError('entropy.json', 'root is not an array');
  }

  return raw.map((entry, index) => {
    if (!isRecord(entry)) {
      throw createTypeError('entropy.json', `index ${index} is not an object`);
    }

    if (typeof entry.actorId !== 'string' || !Array.isArray(entry.curve)) {
      throw createTypeError('entropy.json', `index ${index} has invalid fields`);
    }

    const curve = entry.curve.map((point, pointIndex) => {
      if (
        !isRecord(point) ||
        typeof point.n !== 'number' ||
        typeof point.entropy !== 'number'
      ) {
        throw createTypeError(
          'entropy.json',
          `index ${index} curve[${pointIndex}] has invalid fields`,
        );
      }
      return { n: point.n, entropy: point.entropy };
    });

    return { actorId: entry.actorId, curve };
  });
}

function parseMarkov(raw: unknown): MarkovMatrix[] {
  if (!Array.isArray(raw)) {
    throw createTypeError('markov.json', 'root is not an array');
  }

  return raw.map((entry, index) => {
    if (!isRecord(entry)) {
      throw createTypeError('markov.json', `index ${index} is not an object`);
    }

    if (
      typeof entry.cohortId !== 'number' ||
      typeof entry.stage !== 'string' ||
      !MARKOV_STAGE_SET.has(entry.stage as MarkovStage) ||
      !isStringArray(entry.genres) ||
      !Array.isArray(entry.matrix)
    ) {
      throw createTypeError('markov.json', `index ${index} has invalid fields`);
    }

    const matrix = entry.matrix.map((row, rowIndex) => {
      if (!isNumberArray(row)) {
        throw createTypeError('markov.json', `index ${index} matrix[${rowIndex}] is invalid`);
      }
      return row;
    });

    return {
      cohortId: entry.cohortId,
      stage: entry.stage as MarkovStage,
      genres: entry.genres,
      matrix,
    };
  });
}

function parseAlignment(raw: unknown): AlignmentTrack[] {
  if (!Array.isArray(raw)) {
    throw createTypeError('alignment.json', 'root is not an array');
  }

  return raw.map((entry, index) => {
    if (!isRecord(entry)) {
      throw createTypeError('alignment.json', `index ${index} is not an object`);
    }

    if (
      typeof entry.actorId !== 'string' ||
      typeof entry.t0Index !== 'number' ||
      typeof entry.clusterId !== 'number' ||
      typeof entry.outcome !== 'string' ||
      !OUTCOME_SET.has(entry.outcome as Outcome) ||
      !Array.isArray(entry.points) ||
      !isRecord(entry.covariatesAtT0)
    ) {
      throw createTypeError('alignment.json', `index ${index} has invalid fields`);
    }

    const outcome = entry.outcome as Outcome;
    const covariates = entry.covariatesAtT0 as Record<string, unknown>;
    const numVotes = typeof covariates.numVotes === 'number' ? covariates.numVotes : null;
    const rating = typeof covariates.rating === 'number' ? covariates.rating : null;
    const directorHeterogeneity =
      typeof covariates.directorHeterogeneity === 'number'
        ? covariates.directorHeterogeneity
        : null;
    const hasNumericCovariates =
      numVotes !== null && rating !== null && directorHeterogeneity !== null;

    // `outcome=none` has no T=0 pivot by definition, so empty covariates are valid.
    if (outcome === 'none') {
      const emptyCovariates = Object.keys(covariates).length === 0;
      if (!emptyCovariates) {
        throw createTypeError(
          'alignment.json',
          `index ${index} outcome=none expects empty covariatesAtT0`,
        );
      }
    } else if (!hasNumericCovariates) {
      throw createTypeError(
        'alignment.json',
        `index ${index} outcome=${outcome} requires numeric covariatesAtT0`,
      );
    }

    const points = entry.points.map((point, pointIndex) => {
      if (
        !isRecord(point) ||
        typeof point.tau !== 'number' ||
        typeof point.entropy !== 'number'
      ) {
        throw createTypeError(
          'alignment.json',
          `index ${index} points[${pointIndex}] has invalid fields`,
        );
      }
      return { tau: point.tau, entropy: point.entropy };
    });

    return {
      actorId: entry.actorId,
      t0Index: entry.t0Index,
      outcome,
      points,
      covariatesAtT0: {
        numVotes,
        rating,
        directorHeterogeneity,
      },
      clusterId: entry.clusterId,
    };
  });
}

function parseGenres(raw: unknown): string[] {
  if (!isStringArray(raw)) {
    throw createTypeError('genres.json', 'root is not string[]');
  }
  return raw;
}

export function buildIndexes(bundle: DataBundle): DataIndexes {
  const actorsById = new Map(bundle.actors.map((actor) => [actor.id, actor]));
  const filmsByActor = new Map<string, Film[]>();
  const markovByClusterStage = new Map<string, MarkovMatrix>();
  const alignmentByActor = new Map<string, AlignmentTrack>();

  for (const film of bundle.films) {
    const current = filmsByActor.get(film.actorId);
    if (current) {
      current.push(film);
    } else {
      filmsByActor.set(film.actorId, [film]);
    }
  }

  for (const films of filmsByActor.values()) {
    films.sort((left, right) => left.seqIndex - right.seqIndex);
  }

  for (const entry of bundle.markov) {
    markovByClusterStage.set(`${entry.cohortId}:${entry.stage}`, entry);
  }

  for (const track of bundle.alignment) {
    alignmentByActor.set(track.actorId, track);
  }

  return { actorsById, filmsByActor, markovByClusterStage, alignmentByActor };
}

export async function loadDataBundle(): Promise<DataBundle> {
  const [rawGenres, rawActors, rawFilms, rawEntropy, rawMarkov, rawAlignment] =
    await Promise.all([
      fetchJson(DATA_PATHS.genres),
      fetchJson(DATA_PATHS.actors),
      fetchJson(DATA_PATHS.films),
      fetchJson(DATA_PATHS.entropy),
      fetchJson(DATA_PATHS.markov),
      fetchJson(DATA_PATHS.alignment),
    ]);

  return {
    genres: parseGenres(rawGenres),
    actors: parseActors(rawActors),
    films: parseFilms(rawFilms),
    entropy: parseEntropy(rawEntropy),
    markov: parseMarkov(rawMarkov),
    alignment: parseAlignment(rawAlignment),
  };
}
