import type { DataStore } from "@/lib/data/types";
import type { Episode, MovieWithStats } from "@/lib/types";

/**
 * Helper type: the resolved (awaited) return type of a `DataStore` method.
 *
 * ```ts
 * type Movies = StoreResult<"listMovies">; // MovieListResult
 * ```
 */
export type StoreResult<K extends keyof DataStore> = DataStore[K] extends (
  ...args: never[]
) => infer R
  ? Awaited<R>
  : never;

export type MovieDetail = MovieWithStats;
export type EpisodeList = Episode[];