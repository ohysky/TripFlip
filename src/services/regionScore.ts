// 권역 추천 정의서 V1 (§1-1, §1-4, §3) 점수 계산.
import { GRADE_SCORE, PLACES_V1, REGIONS_V1, WEATHER_V1 } from "@/data/regionsV1";
import type { Concept, MonthWeather, PlaceV1, RegionV1, WeatherJudge } from "@/data/regionsV1";
import { WORLD_PLACES, WORLD_REGIONS } from "@/data/worldV1";
import { WORLD_WEATHER, WORLD_WEATHER_SOURCE } from "@/data/worldWeather";
import { COUNTRY_PRICE_LEVEL, FLIGHT_ESTIMATED, FLIGHT_KRW, FOOD_USD_US, HOTEL_ESTIMATED, HOTEL_MEDIAN_USD, KRW_PER_USD } from "@/data/worldPrices";

// 시범 5개 권역은 날씨·도보 정보가 있는 regionsV1을 쓰고, 나머지는 전 세계 데이터(worldV1)를 붙인다.
const PILOT_TWIN_OF: Record<string, string> = { OS: "jap-osaka", NT: "vie-nhatrang", HK: "hon-hongkong", DN: "vie-danang", PQ: "vie-phuquoc" };
const PILOT_TWINS = new Set(Object.values(PILOT_TWIN_OF));
const TONES = ["#00ACB8", "#102F54", "#f2994a", "#2d9cdb", "#eb5757", "#27ae60", "#9b51e0"];
export const ALL_REGIONS: RegionV1[] = [
  ...REGIONS_V1,
  ...WORLD_REGIONS.filter((r) => !PILOT_TWINS.has(r.id)).map((r, i) => ({
    id: r.id,
    name: r.name,
    country: r.country,
    base: `${r.name} 시내`,
    airport: "미확인",
    airportToBase: "미확인",
    priceLevel: null,
    tone: `linear-gradient(135deg,${TONES[i % TONES.length]},${TONES[(i + 3) % TONES.length]})`,
    airportCode: r.airportCode,
    searchName: r.searchName,
    tier: r.tier,
  })),
];
export const ALL_PLACES: PlaceV1[] = [...PLACES_V1, ...WORLD_PLACES.filter((p) => !PILOT_TWINS.has(p.region))];

export type ChildBand = "영아" | "유아" | "초등" | "중고등";
export type IntensityV1 = 1 | 2 | 3;
export type PriceLevel = "저렴" | "보통" | "높음" | "상관없음";
export type StayTier = "가성비" | "가심비" | "프리미엄" | "하이엔드";

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
  price: PriceLevel;
  stay: StayTier;
}

export interface ScoredPlace {
  place: PlaceV1;
  score: number;
  weight: 1 | 0.5;
}

export interface RegionResult {
  region: RegionV1;
  status: "ranked" | "데이터 부족" | "조건 충족 장소 없음" | "예산 밖" | "물가 미확인";
  score: number; // 권역 점수
  display: number; // 0~100
  rank: number;
  top: ScoredPlace[];
  filled: number;
  N: number;
  weather: { month: number; judge: WeatherJudge; adj: number; source: string };
  excluded: { place: PlaceV1; reason: string }[];
  flags: string[];
  reasons: string[];
  // 1인 총경비(원) = 인천 왕복 항공 + 1인 1일 체류비(§5) × 여행일수
  stay: { usd: number | null; flightKrw: number | null; totalKrw: number | null; tier: Exclude<PriceLevel, "상관없음"> | null; estimated: boolean };
}

const MAX_SCORE = 5.5;

/** §5 1인 1일 체류비(USD) = 숙소 1박 × 객실 수 ÷ 인원 + 식비. 재료가 하나라도 없으면 null */
function stayUsd(region: RegionV1, q: RegionQuery): number | null {
  const hotel = HOTEL_MEDIAN_USD[PILOT_TWIN_OF[region.id] ?? region.id];
  const level = COUNTRY_PRICE_LEVEL[region.country];
  if (hotel == null || level == null) return null;
  const persons = q.adults + q.children.length;
  return (hotel * Math.ceil(q.adults / 2)) / persons + FOOD_USD_US * level;
}

function stayOf(region: RegionV1, q: RegionQuery): RegionResult["stay"] {
  const key = PILOT_TWIN_OF[region.id] ?? region.id;
  const usd = stayUsd(region, q);
  const flightKrw = FLIGHT_KRW[key] ?? null;
  const totalKrw = usd != null && flightKrw != null ? Math.round(flightKrw + usd * KRW_PER_USD * tripDays(q.startDate, q.endDate)) : null;
  return { usd, flightKrw, totalKrw, tier: null, estimated: HOTEL_ESTIMATED.has(key) || FLIGHT_ESTIMATED.has(key) };
}

/** 1인 총경비 순 하위 1/3 저렴, 중간 보통, 상위 높음. 같은 값·경계는 싼 쪽으로 */
function stayTiers(rs: RegionResult[]) {
  const vals = rs.map((r) => r.stay.totalKrw).filter((v): v is number => v != null).sort((a, b) => a - b);
  if (!vals.length) return;
  const cut1 = vals[Math.ceil(vals.length / 3) - 1];
  const cut2 = vals[Math.ceil((vals.length * 2) / 3) - 1];
  for (const r of rs) if (r.stay.totalKrw != null) r.stay.tier = r.stay.totalKrw <= cut1 ? "저렴" : r.stay.totalKrw <= cut2 ? "보통" : "높음";
}

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
  const hits: { judge: WeatherJudge; adj: number }[] = [];
  if (w.tmax >= 33) hits.push({ judge: "혹서기", adj: -1 });
  // 일조 미확인이면 우기 유형을 가릴 수 없어 감점이 큰 지속형으로 본다
  if (w.rainDays >= 15) hits.push(w.sunHours !== null && w.sunHours / days >= 6 ? { judge: "스콜성 우기", adj: -0.5 } : { judge: "지속형 우기", adj: -1 });
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

  const results = ALL_REGIONS.map((region): RegionResult => {
    const places = ALL_PLACES.filter((p) => p.region === region.id);
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

    const w = WEATHER_V1[region.id] ?? (WORLD_WEATHER[region.id] ? { source: WORLD_WEATHER_SOURCE, months: WORLD_WEATHER[region.id] } : undefined);
    const wj = w ? judgeWeather(w.months[month], month) : { judge: "미확인" as const, adj: 0 };
    const weather = { month, ...wj, source: w?.source ?? "날씨 데이터 없음" };
    const top = scored.sort((a, b) => b.score - a.score).slice(0, N);

    const base = { region, rank: 0, N, weather, excluded, flags: [...flags], stay: stayOf(region, q) };
    if (!places.length) return { ...base, status: "데이터 부족", score: 0, display: 0, top: [], filled: 0, reasons: [] };
    if (!top.length) return { ...base, status: "조건 충족 장소 없음", score: 0, display: 0, top: [], filled: 0, reasons: [] };

    const score = top.reduce((s, x) => s + x.score, 0) / N + wj.adj;
    const display = Math.min(100, Math.max(0, (score / MAX_SCORE) * 100));
    return { ...base, status: "ranked", score, display, top, filled: top.length, reasons: buildReasons(q, top, weather, N) };
  });

  // 예산은 점수 전 거르기 (§5): 고른 물가 등급이 아니면 순위에서 뺀다
  stayTiers(results);
  if (q.price !== "상관없음")
    for (const r of results) if (r.status === "ranked" && r.stay.tier !== q.price) r.status = r.stay.tier ? "예산 밖" : "물가 미확인";

  // 높은 점수 순, 동점은 공동 순위
  const ranked = results.filter((r) => r.status === "ranked").sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => (r.rank = i > 0 && r.score === ranked[i - 1].score ? ranked[i - 1].rank : i + 1));
  return [...ranked, ...results.filter((r) => r.status !== "ranked")];
}

/** 카드에 보여줄 사유: 점수에 실제로 들어간 요소만 쓴다 */
function buildReasons(q: RegionQuery, top: ScoredPlace[], w: RegionResult["weather"], N: number): string[] {
  const out: string[] = [];
  const best = top.filter((t) => t.place.grade === "S" || t.place.grade === "A");
  if (best.length) out.push(`${best.slice(0, 2).map((t) => t.place.name).join("·")} 등 S·A급 ${best.length}곳`);
  const main = top.filter((t) => t.weight === 1).length;
  out.push(`${q.main} 장소 ${main}곳${top.length - main ? ` + ${q.subs.join("·")} ${top.length - main}곳` : ""}`);
  if (w.adj > 0) out.push(`${w.month}월 날씨 좋음`);
  else if (w.adj < 0) out.push(`${w.month}월 ${w.judge} (감점)`);
  if (top.length < N) out.push(`가볼 곳이 ${N}곳 중 ${top.length}곳뿐`);
  const far = top.filter((t) => t.place.penalty > 0);
  if (far.length) out.push(`${far.map((t) => t.place.name).join("·")}은 거점에서 멀어 감점`);
  return out;
}
