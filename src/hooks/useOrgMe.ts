import { orgApi } from "../api/api";
import { useCachedQuery } from "./useCachedQuery";

/** Foydalanuvchining markazlari (ega/o'qituvchi) va talaba sifatidagi guruhlari soni — menyuda bo'limlarni ko'rsatish uchun */
export function useOrgMe(enabled = true) {
  return useCachedQuery("org:my", orgApi.my, { staleTime: 60_000, enabled });
}
