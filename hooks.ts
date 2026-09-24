import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaType, TmdbItem } from './types';
import { mediaOf } from './types';

/* ------------------------------------------------------------------ */
/*  Generic paged-list hook — fetch one page, or accumulate pages      */
/* ------------------------------------------------------------------ */

export function usePaged<T extends { id: number }>(
  fetcher: (page: number) => Promise<{ results: T[]; total_pages: number }>,
  deps: unknown[],
  fallback: T[] = [],
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const gen = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // reset + first page whenever deps change
  useEffect(() => {
    const g = ++gen.current;
    setLoading(true);
    setPage(1);
    fetcherRef
      .current(1)
      .then((res) => {
        if (gen.current !== g) return;
        setItems(dedupe(res.results));
        setTotalPages(res.total_pages);
      })
      .catch(() => {
        if (gen.current !== g) return;
        setItems(fallback as T[]);
        setTotalPages(1);
      })
      .finally(() => gen.current === g && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(() => {
    const next = page + 1;
    if (next > totalPages || loadingMore) return false;
    const g = gen.current;
    setLoadingMore(true);
    fetcherRef
      .current(next)
      .then((res) => {
        if (gen.current !== g) return;
        setItems((prev) => dedupe([...prev, ...res.results]));
        setPage(next);
        setTotalPages(res.total_pages);
      })
      .catch(() => undefined)
      .finally(() => gen.current === g && setLoadingMore(false));
    return true;
  }, [page, totalPages, loadingMore]);

  return { items, loading, loadMore, loadingMore, hasMore: page < totalPages };
}

function dedupe<T extends { id: number }>(list: T[]): T[] {
  const seen = new Set<number>();
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

/* ------------------------------------------------------------------ */
/*  My List — bookmarked titles persisted to localStorage              */
/* ------------------------------------------------------------------ */

export interface SavedItem extends TmdbItem {
  savedType: MediaType;
}

const KEY = 'flikuh1x:mylist';

function readList(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedItem[];
  } catch {
    return [];
  }
}

export function useMyList() {
  const [list, setList] = useState<SavedItem[]>(readList);

  const toggle = useCallback((item: TmdbItem) => {
    setList((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      const next = exists
        ? prev.filter((x) => x.id !== item.id)
        : [{ ...item, savedType: mediaOf(item) }, ...prev];
      try {
        localStorage.setItem(KEY, JSON.stringify(next.slice(0, 60)));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const has = useCallback((id: number) => list.some((x) => x.id === id), [list]);

  return { list, toggle, has };
}
