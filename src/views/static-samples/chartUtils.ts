export function linearScale(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (domainMax === domainMin) {
    return (rangeMin + rangeMax) / 2;
  }
  const ratio = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + ratio * (rangeMax - rangeMin);
}

export function withPadding(min: number, max: number, paddingRatio = 0.08): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }
  const span = max - min;
  if (span === 0) {
    return [min - 1, max + 1];
  }
  const padding = span * paddingRatio;
  return [min - padding, max + padding];
}

export function buildGenreTokenLookup(genres: string[]): Map<string, number> {
  const lookup = new Map<string, number>();
  genres.forEach((genre, index) => {
    lookup.set(genre, index + 1);
  });
  return lookup;
}

export function pathFromBands(
  points: Array<{ x: number; y0: number; y1: number }>,
): string {
  if (points.length === 0) {
    return '';
  }

  const upper = points.map((point) => `${point.x},${point.y1}`);
  const lower = [...points].reverse().map((point) => `${point.x},${point.y0}`);

  return `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`;
}

export function polylinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return '';
  }
  return `M ${points.map((point) => `${point.x},${point.y}`).join(' L ')}`;
}
