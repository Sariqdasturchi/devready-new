import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useCachedQuery
 * ─────────────────────────────────────────────────────────────────────────
 * Superadmin panelidagi barcha sahifalar (Dashboard, Users, Mentors, Blogs,
 * Submissions, Tasks, Settings) uchun umumiy "stale-while-revalidate" keshi.
 *
 * Muammo: har safar sahifaga o'tilganda (masalan Users -> Mentors -> Users)
 * komponent qayta mount bo'lib, useEffect qayta ishga tushadi va butun sahifa
 * "Yuklanmoqda..." holatiga qaytadi — foydalanuvchi tajribasi buziladi.
 *
 * Yechim: fetch natijalari modul darajasidagi Map ichida saqlanadi (SPA hayoti
 * davomida yashaydi). Sahifaga qaytilganda avval keshdagi ma'lumot DARHOV
 * ko'rsatiladi (loading=false), so'ng orqa fonda (fon rejimida) yangilanadi
 * (refreshing=true). Bir xil key uchun bir vaqtda faqat bitta tarmoq so'rovi
 * yuboriladi (parallel chaqiruvlar birlashtiriladi).
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export interface UseCachedQueryOptions {
  /** Necha millisekund ichida kesh "yangi" hisoblanadi va qayta so'rov yuborilmaydi. Default: 30s */
  staleTime?: number;
  /** false bo'lsa so'rov umuman yuborilmaydi (masalan modal yopiq bo'lganda) */
  enabled?: boolean;
}

export interface UseCachedQueryResult<T> {
  /** Kesh yoki server ma'lumoti. Hali hech narsa kelmagan bo'lsa undefined. */
  data: T | undefined;
  /** Faqat BIRINCHI marta (keshda umuman ma'lumot yo'qligida) true bo'ladi — to'liq skeleton ko'rsatish uchun. */
  loading: boolean;
  /** Keshda eski ma'lumot bor, lekin orqa fonda yangilanmoqda — kichik indikator uchun. */
  refreshing: boolean;
  error: string | null;
  /** Majburiy qayta yuklash (masalan "Qayta urinish" tugmasi uchun). */
  refetch: () => Promise<void>;
  /** Local state'ni ham, keshni ham darhol yangilash (create/update/delete'dan so'ng). */
  mutate: (updater: T | ((prev: T | undefined) => T)) => void;
}

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions = {},
): UseCachedQueryResult<T> {
  const { staleTime = 30_000, enabled = true } = options;
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const initialCached = cacheStore.get(key) as CacheEntry<T> | undefined;

  const [data, setData] = useState<T | undefined>(initialCached?.data);
  const [loading, setLoading] = useState(!initialCached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const existing = cacheStore.get(key) as CacheEntry<T> | undefined;
      const isFresh = !!existing && Date.now() - existing.timestamp < staleTime;

      if (existing) {
        setData(existing.data);
        setLoading(false);
      }

      if (isFresh && !force) return;

      if (existing) setRefreshing(true);
      else setLoading(true);

      let requestPromise = inFlightRequests.get(key) as Promise<T> | undefined;
      if (!requestPromise) {
        requestPromise = fetcherRef.current();
        inFlightRequests.set(key, requestPromise as Promise<unknown>);
      }

      try {
        const result = await requestPromise;
        cacheStore.set(key, { data: result, timestamp: Date.now() });
        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        console.warn(`useCachedQuery [${key}] so'rovda xatolik:`, err);
        if (mountedRef.current && !existing) {
          setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
        }
      } finally {
        inFlightRequests.delete(key);
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [key, staleTime, enabled],
  );

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const refetch = useCallback(() => load(true), [load]);

  const mutate = useCallback(
    (updater: T | ((prev: T | undefined) => T)) => {
      setData((prev) => {
        const next =
          typeof updater === "function" ? (updater as (prev: T | undefined) => T)(prev) : updater;
        cacheStore.set(key, { data: next, timestamp: Date.now() });
        return next;
      });
    },
    [key],
  );

  return { data, loading, refreshing, error, refetch, mutate };
}

/** Bir nechta key'ni bir vaqtda keshdan tozalash (masalan logout paytida). */
export function invalidateCache(...keys: string[]) {
  keys.forEach((k) => cacheStore.delete(k));
}

export function invalidateAllCache() {
  cacheStore.clear();
}