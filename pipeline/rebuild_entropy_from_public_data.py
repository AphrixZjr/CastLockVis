"""Rebuild full-length entropy.json from existing public data.

This is a lightweight repair path for cases where the original cleaned CSV is
not available. It mirrors pipeline_json_expert.py's entropy calculation using
public/data/films.json and public/data/genres.json:

  - compute genre IDF over unique titleId documents;
  - distribute each film's ALPHA update across all valid genre tags by IDF;
  - emit one EMA Shannon entropy point for every actor film seqIndex.
"""

from __future__ import annotations

from collections import Counter, defaultdict
import json
import math
from pathlib import Path


ALPHA = 0.25
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False)


def film_genre_weights(tags: list[str], valid_genres: set[str], idf: dict[str, float]):
    weights = {genre: idf[genre] for genre in tags if genre in valid_genres}
    total = sum(weights.values())
    if total <= 0:
        return {}
    return {genre: value / total for genre, value in weights.items()}


def main() -> None:
    genres: list[str] = load_json(DATA_DIR / "genres.json")
    films: list[dict] = load_json(DATA_DIR / "films.json")
    valid_genres = set(genres)

    unique_title_genres: dict[str, set[str]] = {}
    for film in films:
        title_id = film.get("titleId")
        if not title_id:
            title_id = f"{film['actorId']}:{film['seqIndex']}:{film.get('title', '')}"
        unique_title_genres.setdefault(title_id, set()).update(
            genre for genre in film.get("genres", []) if genre in valid_genres
        )

    n_docs = len(unique_title_genres)
    doc_freq = Counter(
        genre for genre_set in unique_title_genres.values() for genre in genre_set
    )
    idf = {
        genre: math.log(n_docs / doc_freq[genre])
        for genre in genres
        if doc_freq[genre] > 0
    }

    films_by_actor: dict[str, list[dict]] = defaultdict(list)
    for film in films:
        films_by_actor[film["actorId"]].append(film)

    entropy_entries = []
    for actor_id in sorted(films_by_actor):
        actor_films = sorted(films_by_actor[actor_id], key=lambda film: film["seqIndex"])
        genre_weights = {genre: 0.0 for genre in genres}
        curve = []

        for film in actor_films:
            for genre in genre_weights:
                genre_weights[genre] *= 1 - ALPHA

            share = film_genre_weights(film.get("genres", []), valid_genres, idf)
            for genre, fraction in share.items():
                genre_weights[genre] += ALPHA * fraction

            total_weight = sum(genre_weights.values())
            entropy = (
                -sum(
                    (weight / total_weight) * math.log2(weight / total_weight)
                    for weight in genre_weights.values()
                    if weight > 0.001
                )
                if total_weight > 0
                else 0
            )
            curve.append({"n": film["seqIndex"], "entropy": round(entropy, 3)})

        entropy_entries.append({"actorId": actor_id, "curve": curve})

    save_json(DATA_DIR / "entropy.json", entropy_entries)
    print(
        f"Rebuilt entropy.json for {len(entropy_entries)} actors "
        f"from {len(films)} film rows."
    )


if __name__ == "__main__":
    main()
