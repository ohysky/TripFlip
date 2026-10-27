// localStorage 영속화. 로그인 없이 새로고침해도 상태가 유지된다.
import type { Trip, TripConditions } from "./types";

const KEY = "tripflip:v1";

export interface PersistedState {
  conditions: TripConditions | null;
  trips: Trip[];
  destinationFavorites: string[];
}

export const EMPTY_STATE: PersistedState = { conditions: null, trips: [], destinationFavorites: [] };

export function loadState(): PersistedState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE;
    return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(s: PersistedState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 저장 불가(사파리 개인정보 모드 등) — 화면은 계속 동작 */
  }
}
