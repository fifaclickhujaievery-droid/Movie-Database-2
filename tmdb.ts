import type { Genre, ItemDetail, MediaType, Paged, TmdbItem } from './types';

const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

export const img = (path: string | null | undefined, size: string = 'w500') =>
  path ? `${IMG}/${size}${path}` : '';

export const backdrop = (path: string | null | undefined) => img(path, 'original');

/* ------------------------------------------------------------------ */
/*  Low-level fetch                                                    */
/* ------------------------------------------------------------------ */

export class TmdbError extends Error {}

export async function tmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams({ api_key: API_KEY, language: 'en-US' });
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const res = await fetch(`${BASE}${path}?${qs.toString()}`);
  if (!res.ok) throw new TmdbError(`TMDB ${res.status}`);
  return res.json() as Promise<T>;
}

export const getDetail = (type: MediaType, id: number) =>
  tmdb<ItemDetail>(`/${type}/${id}`, { append_to_response: 'videos,credits,similar,watch/providers' });

export const searchMulti = (query: string, page = 1) =>
  tmdb<Paged<TmdbItem>>('/search/multi', { query, page, include_adult: 'false' });

export const discover = (type: MediaType, genreId: number | null, page = 1) =>
  tmdb<Paged<TmdbItem>>(`/discover/${type}`, {
    page,
    sort_by: 'popularity.desc',
    ...(genreId ? { with_genres: genreId } : {}),
  });

/* ------------------------------------------------------------------ */
/*  Genre maps (TMDB canonical ids)                                    */
/* ------------------------------------------------------------------ */

export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export const TV_GENRES: Genre[] = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];

const GENRE_NAME = new Map<number, string>(
  [...MOVIE_GENRES, ...TV_GENRES].map((g) => [g.id, g.name]),
);
export const genreName = (id: number) => GENRE_NAME.get(id) ?? '';

/* ------------------------------------------------------------------ */
/*  Trailer helpers                                                    */
/* ------------------------------------------------------------------ */

export function trailerKey(detail: ItemDetail | null | undefined): string | null {
  const vids = detail?.videos?.results ?? [];
  const yt = vids.filter((v) => v.site === 'YouTube');
  const pick =
    yt.find((v) => v.type === 'Trailer' && /official/i.test(v.name)) ||
    yt.find((v) => v.type === 'Trailer') ||
    yt.find((v) => v.type === 'Teaser') ||
    yt[0];
  return pick ? pick.key : null;
}

/* ------------------------------------------------------------------ */
/*  Fallback catalogue (used only if the network/API is unreachable)   */
/* ------------------------------------------------------------------ */

const F = (
  id: number,
  title: string,
  overview: string,
  poster_path: string,
  backdrop_path: string,
  vote_average: number,
  year: number,
  genre_ids: number[],
  media_type: MediaType = 'movie',
): TmdbItem => ({
  id,
  title: media_type === 'movie' ? title : undefined,
  name: media_type === 'tv' ? title : undefined,
  overview,
  poster_path,
  backdrop_path,
  vote_average,
  vote_count: 0,
  release_date: media_type === 'movie' ? `${year}-01-01` : undefined,
  first_air_date: media_type === 'tv' ? `${year}-01-01` : undefined,
  genre_ids,
  media_type,
  popularity: 0,
});

export const FALLBACK: Record<string, TmdbItem[]> = {
  trending: [
    F(157336, 'Interstellar', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\u2019s survival.', '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', '/xJHokMbljvjADYdit5fK5VQsXEG.jpg', 8.4, 2014, [12, 18, 878]),
    F(27205, 'Inception', 'A skilled thief who steals secrets from deep within the subconscious is given one last job: plant an idea inside a target\u2019s mind.', '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg', 8.4, 2010, [28, 878, 12]),
    F(155, 'The Dark Knight', 'Batman raises the stakes in his war on crime, but the Joker\u2019s reign of chaos thrusts Gotham into anarchy.', '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', '/hqkIcbrOHL86UncnHIsHVcVmzue.jpg', 8.5, 2008, [18, 28, 80]),
    F(438631, 'Dune', 'Paul Atreides travels to the most dangerous planet in the universe to ensure the future of his family and his people.', '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', '/iopYFB1b6Bh7FWZh3onQhph1sih.jpg', 8.0, 2021, [878, 12]),
    F(872585, 'Oppenheimer', 'The story of J. Robert Oppenheimer and the creation of the atomic bomb.', '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', '/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg', 8.1, 2023, [18, 36]),
    F(496243, 'Parasite', 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg', 8.5, 2019, [35, 53, 18]),
    F(475557, 'Joker', 'A failed comedian, isolated and disregarded by society, begins a slow descent into madness as he transforms into the criminal mastermind known as the Joker.', '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', '/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg', 8.1, 2019, [80, 18, 53]),
    F(680, 'Pulp Fiction', 'The lives of two mob hitmen, a boxer, a gangster\u2019s wife and a pair of diner bandits intertwine in four tales of violence and redemption.', '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', 8.5, 1994, [53, 80]),
    F(238, 'The Godfather', 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.', '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg', 8.7, 1972, [18, 80]),
    F(129, 'Spirited Away', 'A young girl wanders into a world ruled by gods, witches and spirits, and must find her way back to save her parents.', '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', '/bSXfU4dwZyBA1vMmXvejdRXBvuF.jpg', 8.5, 2001, [16, 10751, 14]),
    F(550, 'Fight Club', 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.', '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', 8.4, 1999, [18]),
    F(13, 'Forrest Gump', 'The presidencies of Kennedy and Johnson, the Vietnam War and other historical events unfold from the perspective of an Alabama man with an extraordinary heart.', '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', '/gh8zb4IhmPbjye3uQdpYEd9th5L.jpg', 8.5, 1994, [35, 18, 10749]),
    F(299534, 'Avengers: Endgame', 'After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos\u2019 actions and restore balance to the universe.', '/or06FN3Dka5tukK1e9sl16pB3iy.jpg', '/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg', 8.2, 2019, [12, 878, 28]),
    F(693134, 'Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg', 8.2, 2024, [878, 12]),
  ],
  movies: [
    F(278, 'The Shawshank Redemption', 'Imprisoned for a crime he did not commit, banker Andy Dufresne forms an unlikely friendship and discovers hope in the darkest places.', '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', 8.7, 1994, [18, 80]),
    F(238, 'The Godfather', 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.', '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg', 8.7, 1972, [18, 80]),
    F(240, 'The Godfather Part II', 'The early life and career of Vito Corleone is portrayed while his son, Michael, expands and tightens his grip on the family crime syndicate.', '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', '/kGzFbGhp99zva6oZODW5atUtnqi.jpg', 8.6, 1974, [18, 80]),
    F(155, 'The Dark Knight', 'Batman raises the stakes in his war on crime, but the Joker\u2019s reign of chaos thrusts Gotham into anarchy.', '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', '/hqkIcbrOHL86UncnHIsHVcVmzue.jpg', 8.5, 2008, [18, 28, 80]),
    F(120, 'The Lord of the Rings: The Fellowship of the Ring', 'A young hobbit inherits a mysterious ring and sets out with eight companions to destroy it before darkness consumes Middle-earth.', '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', '/vRQnzOn4HjIMX4LBq9nHhFXbsSu.jpg', 8.4, 2001, [12, 14, 28]),
    F(389, '12 Angry Men', 'A jury holdout attempts to prevent a miscarriage of justice by forcing his colleagues to reconsider the evidence.', '/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg', '/qqHQsStMc6lUIfodHfFYtYoNQxL.jpg', 8.5, 1957, [18]),
    F(424, 'Schindler\u2019s List', 'The true story of a businessman who saved the lives of more than a thousand Jewish refugees during the Holocaust.', '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', '/loRmRzQXZeqG78TqZuyvSlEQfZb.jpg', 8.6, 1993, [18, 36, 10752]),
    F(27205, 'Inception', 'A skilled thief who steals secrets from deep within the subconscious is given one last job: plant an idea inside a target\u2019s mind.', '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg', 8.4, 2010, [28, 878, 12]),
    F(769, 'GoodFellas', 'The true story of Henry Hill, a half-Irish, half-Sicilian Brooklyn kid who is adopted by neighbourhood gangsters at an early age.', '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', '/sw7mordbZxgITU877yTpZCud90M.jpg', 8.5, 1990, [18, 80]),
    F(680, 'Pulp Fiction', 'The lives of two mob hitmen, a boxer, a gangster\u2019s wife and a pair of diner bandits intertwine in four tales of violence and redemption.', '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', 8.5, 1994, [53, 80]),
    F(122, 'The Lord of the Rings: The Return of the King', 'Gandalf and Aragorn lead the World of Men against Sauron\u2019s army to draw his gaze from Frodo and Sam as they approach Mount Doom.', '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', '/lXhgCODAbBXL5buk9yEmTpOoOgR.jpg', 8.5, 2003, [12, 14, 28]),
    F(429, 'The Good, the Bad and the Ugly', 'A bounty hunting scam joins two men in an uneasy alliance against a third in a race to find a fortune in gold buried in a remote cemetery.', '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg', '/x4biAVdPVCghBlsVIzB6NmbghIz.jpg', 8.5, 1966, [37]),
    F(497, 'The Green Mile', 'The lives of guards on Death Row are affected by one of their charges: a gentle giant with a mysterious gift.', '/velWPhVMQeQKcxggNEU8YmIo52R.jpg', '/l6hQWH9eDksNJNiXWYRkWqikOdu.jpg', 8.5, 1999, [14, 18, 80]),
    F(637, 'Life Is Beautiful', 'A Jewish father uses a fertile imagination to shield his son from the horrors of internment in a Nazi concentration camp.', '/74hLDKjD5aGYOotO6esUVaeISa2.jpg', '/bORe0eI72D874TMawOOFvqWS6eb.jpg', 8.5, 1997, [35, 18]),
  ],
  tv: [
    F(1396, 'Breaking Bad', 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine to secure his family\u2019s future.', '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', 8.9, 2008, [18], 'tv'),
    F(1399, 'Game of Thrones', 'Nine noble families wage war against each other in order to gain control over the mythical land of Westeros.', '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg', '/suopoADq0k8YZr4dQXcU6pToj6s.jpg', 8.4, 2011, [10765, 18, 10759], 'tv'),
    F(100088, 'The Last of Us', 'Twenty years after modern civilization has been destroyed, Joel is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.', '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg', '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg', 8.6, 2023, [18], 'tv'),
    F(76479, 'The Boys', 'A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers.', '/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg', '/mGVrXeIjyecj6TKmwPVpHlscEmw.jpg', 8.5, 2019, [10765, 10759], 'tv'),
    F(66732, 'Stranger Things', 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.', '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg', 8.6, 2016, [18, 10765, 9648], 'tv'),
    F(60059, 'Better Call Saul', 'The trials and tribulations of criminal lawyer Jimmy McGill in the years leading up to his fateful run-in with Walter White.', '/fC2HDm5t0kHl7mTm7mMRj79L79S.jpg', '/iJspU5DiXVB3NGlKrBQGYW5X4fJ.jpg', 8.7, 2015, [18, 80], 'tv'),
    F(94605, 'Arcane', 'Amid the escalating conflict between utopian Piltover and oppressed Zaun, two sisters fight on rival sides of a war of magic and technology.', '/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg', '/rkB4LyZc1NhJnHIeBpj0cERZDX2.jpg', 8.7, 2021, [16, 10765, 10759, 18], 'tv'),
    F(94997, 'House of the Dragon', 'The Targaryen dynasty at the absolute apex of its power, with more than 10 dragons under their yoke.', '/x2LsRsRwbYd7ADPfHAd1GOiO7CG.jpg', '/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg', 8.4, 2022, [10765, 18, 10759], 'tv'),
    F(2316, 'The Office', 'A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior and tedium.', '/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg', '/q3ZjUfuYGdgqXCsP3MKfLr9QrFB.jpg', 8.6, 2005, [35], 'tv'),
    F(60625, 'Rick and Morty', 'Rick, an alcoholic sociopath and scientist, drags his timid grandson Morty on insanely dangerous adventures across the universe.', '/8kOWDBK6XlPUzckuHDo3wwVRFwt.jpg', '/oqgk4pA5uSKhy0JYSdME50BbneZ.jpg', 8.7, 2013, [16, 35, 10765, 10759], 'tv'),
    F(106379, 'Fallout', 'Two hundred years after the apocalypse, the gentle denizens of luxury fallout shelters are forced to return to the irradiated wasteland their ancestors left behind.', '/AnsSKR9LuK0T9bAOcPVA3PUvyWj.jpg', '/wil0bHrM2pjtVUn2O3kyAResBj1.jpg', 8.3, 2024, [878, 18, 28], 'tv'),
    F(87108, 'Chernobyl', 'The story of the brave men and women who sacrificed to save Europe from unimaginable disaster at the Chernobyl Nuclear Power Plant.', '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg', '/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg', 8.7, 2019, [18], 'tv'),
    F(82856, 'The Mandalorian', 'The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.', '/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg', '/9ijMGlJKqcslswWUzTEwScm82Gs.jpg', 8.4, 2019, [10765, 10759], 'tv'),
    F(110316, 'Alice in Borderland', 'An aimless gamer and his two friends find themselves in a parallel Tokyo, where they are forced to compete in sadistic games to survive.', '/20mOwAAPvZFw4Ptv5yyVrnshLgy.jpg', '/bKxiLRPVWe2gsZXCwt6Tzx5owM.jpg', 8.1, 2020, [18, 9648, 10765], 'tv'),
  ],
};

export const fallbackPage = (key: keyof typeof FALLBACK): Paged<TmdbItem> => ({
  page: 1,
  results: FALLBACK[key] ?? [],
  total_pages: 1,
  total_results: (FALLBACK[key] ?? []).length,
});
