export type MediaType = 'movie' | 'tv';

export interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: MediaType | string;
  popularity?: number;
  original_language?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

export interface WatchCountry {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  ads?: WatchProvider[];
  free?: WatchProvider[];
}

export interface ItemDetail extends TmdbItem {
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres: Genre[];
  tagline?: string;
  status?: string;
  budget?: number;
  revenue?: number;
  homepage?: string;
  videos?: { results: Video[] };
  credits?: { cast: CastMember[] };
  similar?: { results: TmdbItem[] };
  'watch/providers'?: { results: Record<string, WatchCountry> };
}

export interface Paged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/* helpers */
export const itemTitle = (it: TmdbItem) => it.title || it.name || 'Untitled';
export const itemDate = (it: TmdbItem) => it.release_date || it.first_air_date || '';
export const itemYear = (it: TmdbItem) => {
  const d = itemDate(it);
  return d ? d.slice(0, 4) : '—';
};
export const mediaOf = (it: TmdbItem): MediaType =>
  it.media_type === 'tv' || (!it.media_type && !!it.name && !it.title) ? 'tv' : 'movie';
