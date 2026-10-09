import type { Role, User } from "../types/type";
import { invalidateAllCache } from "../hooks/useCachedQuery";

const USER_KEY = "user";
const TOKEN_KEY = "token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User) {
  invalidateAllCache();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("devready:user"));
}

export function updateStoredUser(patch: Partial<User>) {
  const current = getStoredUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...patch }));
  window.dispatchEvent(new Event("devready:user"));
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  invalidateAllCache();
}

export function logout() {
  clearSession();
  window.location.href = "/login";
}

export function homeForRole(role?: Role | null) {
  if (role === "superadmin" || role === "admin") return "/superadmin/dashboard";
  if (role === "mentor") return "/mentor/dashboard";
  return "/dashboard";
}
