// 권역 추천 결과(상위 N곳)를 날짜별 일정과 하루 타임테이블로 펼친다.
// 이동·체류 시간은 실측 전 예상값이다. 화면에 "예상"으로 표시할 것.
import { GRADE_SCORE } from "@/data/regionsV1";
import type { PlaceV1 } from "@/data/regionsV1";
import type { RegionQuery, RegionResult } from "@/services/regionScore";
import { ALL_PLACES, tripDays } from "@/services/regionScore";
import type { DayPrefs, Transport } from "@/lib/flow";
import { PLACE_ATTRS } from "@/data/placeAttrs";

export const SLOT_LABELS: Record<number, string[]> = { 1: ["하루"], 2: ["오전", "오후"], 3: ["오전", "오후", "저녁"] };

export interface DayPlan {
  day: number;
  date: string; // YYYY-MM-DD
  slots: { label: string; place: PlaceV1; extra?: boolean }[];
  fullDay: boolean;
}

// 시간대·체류·아이친화는 GPT·제미나이 추정값(PLACE_ATTRS). 없으면 태그로 판단한다.
const slotOf = (p: PlaceV1) => PLACE_ATTRS[p.id]?.[0];
export const kidFit = (p: PlaceV1) => PLACE_ATTRS[p.id]?.[2];
const isNight = (p: PlaceV1) => slotOf(p) === "저녁" || (!slotOf(p) && p.tags.includes("야경·야시장"));
const ORDER = { 오전: 0, 아무때나: 1, 오후: 2, 저녁: 3, 종일: 1 } as const;
/** 테마파크·먼 당일 명소는 하루를 통째로 쓴다 */
export const isFullDay = (p: PlaceV1) => slotOf(p) === "종일" || p.penalty > 0 || p.travel.includes("페리") || (!slotOf(p) && p.tags.includes("테마파크"));

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
export function fmtDate(d: string) {
  const x = new Date(d);
  return `${x.getMonth() + 1}/${x.getDate()}(${WEEK[x.getDay()]})`;
}

export function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * 장소가 모자랄 때 고객이 고르는 방식
 * - spread: 있는 장소를 날짜에 고루 퍼뜨려 빈 날을 없앤다 (하루 개수가 줄어든다)
 * - fill: 고른 컨셉 밖 장소까지 등급 순으로 더해 하루 개수를 채운다 (점수에는 안 들어간다)
 */
export type FillMode = "spread" | "fill";

/** 컨셉 밖이지만 같은 권역에 있는 장소 (등급 높은 순) */
function extraPlaces(r: RegionResult, need: number): PlaceV1[] {
  const used = new Set([...r.top.map((t) => t.place.id), ...r.excluded.map((e) => e.place.id)]);
  return ALL_PLACES.filter((p) => p.region === r.region.id && !used.has(p.id))
    .sort((a, b) => GRADE_SCORE[b.grade] - b.penalty - (GRADE_SCORE[a.grade] - a.penalty))
    .slice(0, need);
}

export function buildDays(r: RegionResult, q: RegionQuery, mode: FillMode = "spread"): { days: DayPlan[]; unplaced: PlaceV1[] } {
  const D = tripDays(q.startDate, q.endDate);
  const per = q.perDay;
  const days: DayPlan[] = Array.from({ length: D }, (_, i) => ({ day: i + 1, date: addDays(q.startDate, i), slots: [], fullDay: false }));
  const pool: PlaceV1[] = [];
  const unplaced: PlaceV1[] = [];

  // 하루짜리를 먼저 빈 날에 배치 (첫날·마지막 날은 이동일이라 가능한 피한다)
  const order = days.length > 2 ? [...days.slice(1, -1), days[0], days[days.length - 1]] : days;
  for (const { place } of r.top) {
    if (!isFullDay(place)) {
      pool.push(place);
      continue;
    }
    const free = order.find((d) => !d.fullDay && d.slots.length === 0);
    if (free) {
      free.fullDay = true;
      free.slots.push({ label: "하루", place });
    } else unplaced.push(place);
  }
  const extra = new Set<PlaceV1>();
  if (mode === "fill") {
    const room = days.filter((d) => !d.fullDay).length * per - pool.length;
    for (const p of extraPlaces(r, room).filter((p) => !isFullDay(p))) {
      pool.push(p);
      extra.add(p);
    }
  }
  for (const place of pool) {
    // 채우기: 앞에서부터 하루 개수만큼 / 퍼뜨리기: 가장 덜 찬 날에 하나씩
    const open = days.filter((x) => !x.fullDay && x.slots.length < per);
    const d = mode === "fill" ? open[0] : open.reduce<DayPlan | undefined>((a, b) => (!a || b.slots.length < a.slots.length ? b : a), undefined);
    if (d) d.slots.push({ label: "", place, extra: extra.has(place) });
    else unplaced.push(place);
  }
  // 야경 장소는 그날 마지막 순서로, 시간대 라벨 붙이기
  for (const d of days) {
    if (d.fullDay) continue;
    d.slots.sort((a, b) => (isNight(a.place) ? 3 : ORDER[slotOf(a.place) ?? "아무때나"]) - (isNight(b.place) ? 3 : ORDER[slotOf(b.place) ?? "아무때나"]));
    // 하루를 통째로 쓰지 않는 장소 하나만 있는 날은 "하루"가 아니라 오전 일정 + 자유 시간이다
    d.slots.forEach((s, i) => (s.label = d.slots.length === 1 ? (isNight(s.place) ? "저녁" : "오전") : (SLOT_LABELS[per][i] ?? "")));
  }
  return { days, unplaced };
}

// ---------- 타임테이블 ----------

export interface TimeRow {
  time: string;
  end?: string;
  kind: "wake" | "meal" | "move" | "visit" | "rest";
  title: string;
  sub?: string;
}

const FACTOR: Record<Transport, number> = { "택시·그랩": 1, 대중교통: 1.5, 렌터카: 1.1, 도보: 2.5 };

/** 숙소(거점) → 장소 편도 예상 분 */
export function baseMinutes(p: PlaceV1) {
  if (p.penalty === 1) return 240;
  if (p.penalty === 0.5) return 150;
  if (p.travel.includes("페리")) return 90;
  return 30;
}

/** 비 오는 날 적합도: 태그로 판정 (○ 실내 위주 / △ 반반 / × 실외) */
const RAIN_OK = ["쇼핑몰·아웃렛", "카페·디저트", "로컬푸드", "마사지·스파"];
const RAIN_NO = ["해변·섬", "자연경관", "트레킹·하이킹", "해양", "스키", "골프"];
export function rainFit(p: PlaceV1): "○" | "△" | "×" {
  if (p.tags.some((t) => RAIN_NO.includes(t))) return "×";
  if (p.tags.some((t) => RAIN_OK.includes(t))) return "○";
  return "△";
}

export function stayMinutes(p: PlaceV1, fullDay: boolean) {
  const m = PLACE_ATTRS[p.id]?.[1];
  if (m) return fullDay ? Math.max(m, 240) : Math.min(m, 300);
  if (fullDay) return p.tags.includes("테마파크") ? 420 : 240;
  if (p.tags.some((t) => ["해변·섬", "골프", "해양", "온천"].includes(t))) return 180;
  return 120;
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const round5 = (m: number) => Math.round(m / 5) * 5;

export function buildTimetable(day: DayPlan, prefs: DayPrefs): TimeRow[] {
  const rows: TimeRow[] = [];
  const f = FACTOR[prefs.transport];
  rows.push({ time: prefs.wake, kind: "wake", title: "기상" });
  let t = Math.max(toMin(prefs.breakfast), toMin(prefs.wake) + 15);
  rows.push({ time: toTime(t), end: toTime(t + prefs.breakfastMin), kind: "meal", title: "조식", sub: "숙소" });
  t += prefs.breakfastMin + 30; // 준비·출발
  let lunch = false;
  let dinner = false;
  let prevFar = 0;

  // 일정에 든 식당(로컬푸드)은 관광지처럼 따로 가지 않고 점심·저녁 자리에 넣는다
  const isFood = (p: PlaceV1) => p.tags.includes("로컬푸드") || /레스토랑|식당|씨푸드|Restaurant|Seafood/i.test(p.name + p.en);
  const food = day.slots.filter((s) => isFood(s.place)).map((s) => s.place);
  const meal = (title: "점심" | "저녁", near = "주변 식당") => {
    const r = food.shift();
    rows.push({ time: toTime(t), end: toTime(t + 60), kind: "meal", title: r ? `${title} · ${r.name}` : title, sub: r ? `추천 식당 · ${r.en}` : near });
    t += 60;
  };

  day.slots.filter((s) => !isFood(s.place)).forEach((s, i) => {
    const night = s.label === "저녁";
    if (!lunch && t >= toMin("11:30") && !day.fullDay) {
      meal("점심");
      lunch = true;
    }
    if (night && !dinner) {
      if (toMin("17:30") - t >= 90) rows.push({ time: toTime(t), end: "17:30", kind: "rest", title: "자유 시간", sub: "숙소 휴식·주변 산책 (일정 없음)" });
      t = Math.max(t, toMin("17:30"));
      meal("저녁");
      dinner = true;
    }
    const move = round5((i === 0 ? baseMinutes(s.place) : 30) * f);
    rows.push({ time: toTime(t), end: toTime(t + move), kind: "move", title: `이동 · ${prefs.transport}`, sub: `약 ${move}분 (예상)` });
    t += move;
    const stay = stayMinutes(s.place, day.fullDay);
    rows.push({ time: toTime(t), end: toTime(t + stay), kind: "visit", title: s.place.name, sub: `${s.label} · ${s.place.tags.join(" · ")} · 체류 ${stay >= 60 ? `${stay / 60}시간` : `${stay}분`} (예상) · 비 오는 날 ${rainFit(s.place)}${kidFit(s.place) ? ` · 아이 ${kidFit(s.place)}` : ""}` });
    if (day.fullDay && stay >= 240) {
      lunch = true; // 하루 일정 장소 안에서 점심
      rows[rows.length - 1].sub += " · 점심 포함";
    }
    t += stay;
    prevFar = baseMinutes(s.place);
  });

  if (!day.slots.length) {
    rows.push({ time: toTime(t), kind: "rest", title: "자유 일정", sub: "추천 장소가 배정되지 않은 날" });
    return rows;
  }
  const back = round5((day.fullDay ? prevFar : 30) * f);
  const goBack = () => {
    rows.push({ time: toTime(t), end: toTime(t + back), kind: "move", title: `숙소 복귀 · ${prefs.transport}`, sub: `약 ${back}분 (예상)` });
    t += back;
  };
  if (dinner) {
    goBack();
    return rows;
  }
  if (!lunch && !day.fullDay) {
    // 식당만 있는 날: 오전은 쉬고, 점심 식당으로 이동
    if (food.length && !rows.some((r) => r.kind === "visit")) {
      const go = toMin("11:00");
      if (go - t >= 60) rows.push({ time: toTime(t), end: toTime(go), kind: "rest", title: "오전 자유 시간", sub: "숙소 휴식·주변 산책 (일정 없음)" });
      t = Math.max(t, go);
      rows.push({ time: toTime(t), end: toTime(t + 30), kind: "move", title: `이동 · ${prefs.transport}`, sub: "약 30분 (예상)" });
      t += 30;
    }
    t = Math.max(t, toMin("11:30"));
    meal("점심");
  }
  // 저녁까지 1시간 반 넘게 남으면: 숙소로 먼저 돌아가 쉬고, 저녁은 숙소 근처에서 먹는다
  if (toMin("17:30") - (t + back) >= 30) {
    goBack();
    rows.push({ time: toTime(t), end: "17:30", kind: "rest", title: "숙소 휴식", sub: "수영장·휴식 등 자유 시간" });
    t = toMin("17:30");
    meal("저녁", "숙소 주변 식당");
    return rows;
  }
  t = Math.max(t, toMin("17:30"));
  meal("저녁");
  goBack();
  return rows;
}
