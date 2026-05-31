export type Outcome = 'success' | 'snapback' | 'none';

export type MarkovStage = 'early' | 'mid' | 'late';

export interface Actor {
  id: string;
  name: string;
  dominantEarlyGenre: string;
  earlyGenreVector: number[];
  filmCount: number;
  t0Index: number;
  outcome: Outcome;
  projection: [number, number];
  clusterId: number;
}

export interface Film {
  actorId: string;
  seqIndex: number;
  title: string;
  year: number;
  genres: string[];
  dominantGenre: string;
  rating: number;
  numVotes: number;
  directorId: string;
}

export interface EntropyPoint {
  n: number;
  entropy: number;
}

export interface EntropyCurve {
  actorId: string;
  curve: EntropyPoint[];
}

export interface MarkovMatrix {
  cohortId: number;
  stage: MarkovStage;
  genres: string[];
  matrix: number[][];
}

export interface AlignmentPoint {
  tau: number;
  entropy: number;
}

export interface AlignmentCovariates {
  numVotes: number | null;
  rating: number | null;
  directorHeterogeneity: number | null;
}

export interface AlignmentTrack {
  actorId: string;
  t0Index: number;
  outcome: Outcome;
  points: AlignmentPoint[];
  covariatesAtT0: AlignmentCovariates;
  clusterId: number;
}

export interface DataBundle {
  genres: string[];
  actors: Actor[];
  films: Film[];
  entropy: EntropyCurve[];
  markov: MarkovMatrix[];
  alignment: AlignmentTrack[];
}

export interface DataIndexes {
  actorsById: Map<string, Actor>;
  filmsByActor: Map<string, Film[]>;
  markovByClusterStage: Map<string, MarkovMatrix>;
  alignmentByActor: Map<string, AlignmentTrack>;
}
