// 추천 흐름(조건 → 결과 → 일정 → 예약 → 내 여행) 상태. 이 기기 localStorage에만 저장한다.
"use client";
import { useEffect, useState } from "react";
import type { RegionQuery } from "@/services/regionScore";

export type Transport = "택시·그랩" | "대중교통" | "렌터카" | "도보";
export const TRANSPORTS: Transport[] = ["택시·그랩", "대중교통", "렌터카", "도보"];

export interface DayPrefs {
  wake: string; // HH:MM
  breakfast: string; // HH:MM
  breakfastMin: number;
  transport: Transport;
}

export interface SavedPlan {
  id: string;
  regionId: string;
  regionName: string;
  query: RegionQuery;
  display: number;
  booked: { flight: boolean; hotel: boolean };
  createdAt: string;
}

export const DEFAULT_PREFS: DayPrefs = { wake: "07:30", breakfast: "08:00", breakfastMin: 45, transport: "택시·그랩" };

export const DEFAULT_QUERY: RegionQuery = {
  startDate: "2026-12-20",
  endDate: "2026-12-23",
  adults: 2,
  children: [],
  elders: false,
  pet: false,
  main: "관광",
  subs: ["휴양"],
  perDay: 2,
  price: "상관없음",
  stay: "가심비",
};

const K = { query: "tripflip.flow.query", prefs: "tripflip.flow.prefs", plans: "tripflip.flow.plans" };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 화면 상태만 유지한다
  }
}

export const loadQuery = () => read<RegionQuery>(K.query, DEFAULT_QUERY);
export const saveQuery = (q: RegionQuery) => write(K.query, q);
export const loadPrefs = (regionId: string) => read<Record<string, DayPrefs>>(K.prefs, {})[regionId] ?? DEFAULT_PREFS;
export const savePrefs = (regionId: string, p: DayPrefs) => write(K.prefs, { ...read<Record<string, DayPrefs>>(K.prefs, {}), [regionId]: p });
export const loadPlans = () => read<SavedPlan[]>(K.plans, []);
export const savePlan = (p: SavedPlan) => write(K.plans, [p, ...loadPlans().filter((x) => x.id !== p.id)]);
export const removePlan = (id: string) => write(K.plans, loadPlans().filter((x) => x.id !== id));

/** 저장된 계획(?plan=)이 있으면 그 조건을, 없으면 마지막 입력 조건을 쓴다 */
export function useFlowQuery(planId?: string | null) {
  const [q, setQ] = useState<RegionQuery | null>(null);
  useEffect(() => {
    const plan = planId ? loadPlans().find((p) => p.id === planId) : undefined;
    setQ(plan ? plan.query : loadQuery());
  }, [planId]);
  return q;
}
