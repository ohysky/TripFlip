// 권역 추천 정의서 V1 (§1-1, §1-4, §3) 점수 계산.
import { GRADE_SCORE, PLACES_V1, REGIONS_V1, WEATHER_V1 } from "@/data/regionsV1";
import type { Concept, MonthWeather, PlaceV1, RegionV1, WeatherJudge } from "@/data/regionsV1";

export type ChildBand = "영아" | "유아" | "초등" | "중고등";
export type IntensityV1 = 1 | 2 | 3;

export interface RegionQuery {
  startDate: string;
  endDate: string;
  adults: number;
  children: { band: ChildBand; height: number | null }[];
  elders: boolean; // 부모님 또는 배우자 부모님 동행
  pet: boolean;
  main: Concept;
  subs: Concept[];
  perDay: IntensityV1;
}

export interface ScoredPlace {
  place: PlaceV1;
  score: number;
  weight: 1 | 0.5;
}

export interface RegionResult {
  region: RegionV1;
  status: "ranked" | "데이터 부족" | "조건 충족 장소 없음";
  score: number; // 권역 점수
  display: number; // 0~100
  rank: number;
  top: ScoredPlace[];
  filled: number;
  N: number;
  weather: { month: number; judge: WeatherJudge; adj: number; source: string };
  excluded: { place: PlaceV1; reason: string }[];
  flags: string[];
}

const MAX_SCORE = 5.5;

export function tripDays(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86400000) + 1;
}

/** 여행일이 가장 많이 포함된 월 (동률이면 출발월) */
export function weatherMonth(start: string, end: string) {
  const count = new Map<number, number>();
  const d = new Date(start);
  const last = new Date(end);
  while (d <= last) {
    const m = d.getMonth() + 1;
    count.set(m, (count.get(m) ?? 0) + 1);
    d.setDate(d.getDate() + 1);
  }
  const first = new Date(start).getMonth() + 1;
  let best = first;
  count.forEach((n, m) => {
    if (n > (count.get(best) ?? 0)) best = m;
  });
  return best;
}

export function judgeWeather(w: MonthWeather, month: number): { judge: WeatherJudge; adj: number } {
  const days = new Date(2026, month, 0).getDate();
  const sunPerDay = w.sunHours / days;
  const hits: { judge: WeatherJudge; adj: number }[] = [];
  if (w.tmax >= 33) hits.push({ judge: "혹서기", adj: -1 });
  if (w.rainDays >= 15) hits.push(sunPerDay >= 6 ? { judge: "스콜성 우기", adj: -0.5 } : { judge: "지속형 우기", adj: -1 });
  if (hits.length) return hits.reduce((a, b) => (b.adj < a.adj ? b : a));
  if (w.rainDays <= 7 && w.tmax >= 18 && w.tmax <= 28) return { judge: "좋음", adj: 0.5 };
  return { judge: "보통", adj: 0 };
}

function exclusion(p: PlaceV1, q: RegionQuery): string | null {
  if (q.elders && (p.longWalk || p.steep === true)) return "어르신 동반 (장시간 도보·급경사)";
  return null;
}

export function scoreRegions(q: RegionQuery): RegionResult[] {
  const N = q.perDay * tripDays(q.startDate, q.endDate);
  const month = weatherMonth(q.startDate, q.endDate);
  const minors = q.children.length > 0;

  const results = REGIONS_V1.map((region): RegionResult => {
    const places = PLACES_V1.filter((p) => p.region === region.id);
    const excluded: RegionResult["excluded"] = [];
    const flags = new Set<string>();
    const scored: ScoredPlace[] = [];

    for (const p of places) {
      // 미식은 선택했을 때만 후보 (§1-3)
      const weight: 0 | 0.5 | 1 = p.concepts.includes(q.main) ? 1 : p.concepts.some((c) => q.subs.includes(c)) ? 0.5 : 0;
      if (!weight) continue;
      const why = exclusion(p, q);
      if (why) {
        excluded.push({ place: p, reason: why });
        continue;
      }
      if (minors && p.adultOnly) flags.add(`${p.name}: 미성년 동반 가능 여부 확인 필요`);
      if (q.elders && p.steep === null) flags.add(`${p.name}: 급경사 여부 확인 필요`);
      if (minors && p.note?.includes("키 제한") && q.children.some((c) => c.height === null)) flags.add("키 제한 확인 필요");
      if (q.pet) flags.add("반려동물 출입 미확인");
      scored.push({ place: p, weight, score: (GRADE_SCORE[p.grade] - p.penalty) * weight });
    }

    const w = WEATHER_V1[region.id];
    const wj = judgeWeather(w.months[month], month);
    const weather = { month, ...wj, source: w.source };
    const top = scored.sort((a, b) => b.score - a.score).slice(0, N);

    if (!places.length) return { region, status: "데이터 부족", score: 0, display: 0, rank: 0, top: [], filled: 0, N, weather, excluded, flags: [...flags] };
    if (!top.length) return { region, status: "조건 충족 장소 없음", score: 0, display: 0, rank: 0, top: [], filled: 0, N, weather, excluded, flags: [...flags] };

    const score = top.reduce((s, x) => s + x.score, 0) / N + wj.adj;
    const display = Math.min(100, Math.max(0, (score / MAX_SCORE) * 100));
    return { region, status: "ranked", score, display, rank: 0, top, filled: top.length, N, weather, excluded, flags: [...flags] };
  });

  // 높은 점수 순, 동점은 공동 순위
  const ranked = results.filter((r) => r.status === "ranked").sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => (r.rank = i > 0 && r.score === ranked[i - 1].score ? ranked[i - 1].rank : i + 1));
  return [...ranked, ...results.filter((r) => r.status !== "ranked")];
}
