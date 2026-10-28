// 권역 추천 결과(상위 N곳)를 날짜별 일정과 하루 타임테이블로 펼친다.
// 이동·체류 시간은 실측 전 예상값이다. 화면에 "예상"으로 표시할 것.
import type { PlaceV1 } from "@/data/regionsV1";
import type { RegionQuery, RegionResult } from "@/services/regionScore";
import { tripDays } from "@/services/regionScore";
import type { DayPrefs, Transport } from "@/lib/flow";

export const SLOT_LABELS: Record<number, string[]> = { 1: ["하루"], 2: ["오전", "오후"], 3: ["오전", "오후", "저녁"] };

export interface DayPlan {
  day: number;
  date: string; // YYYY-MM-DD
  slots: { label: string; place: PlaceV1 }[];
  fullDay: boolean;
}

const isNight = (p: PlaceV1) => p.tags.includes("야경·야시장");
/** 테마파크·먼 당일 명소는 하루를 통째로 쓴다 */
export const isFullDay = (p: PlaceV1) => p.tags.includes("테마파크") || p.penalty > 0 || p.travel.includes("페리");

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

export function buildDays(r: RegionResult, q: RegionQuery): { days: DayPlan[]; unplaced: PlaceV1[] } {
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
  for (const place of pool) {
    const d = days.find((x) => !x.fullDay && x.slots.length < per);
    if (d) d.slots.push({ label: "", place });
    else unplaced.push(place);
  }
  // 야경 장소는 그날 마지막 순서로, 시간대 라벨 붙이기
  for (const d of days) {
    if (d.fullDay) continue;
    d.slots.sort((a, b) => Number(isNight(a.place)) - Number(isNight(b.place)));
    d.slots.forEach((s, i) => (s.label = SLOT_LABELS[per][i] ?? ""));
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

export function stayMinutes(p: PlaceV1, fullDay: boolean) {
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

  const meal = (title: "점심" | "저녁") => {
    rows.push({ time: toTime(t), end: toTime(t + 60), kind: "meal", title, sub: "주변 식당" });
    t += 60;
  };

  day.slots.forEach((s, i) => {
    const night = s.label === "저녁";
    if (!lunch && t >= toMin("11:30") && !day.fullDay) {
      meal("점심");
      lunch = true;
    }
    if (night && !dinner) {
      t = Math.max(t, toMin("17:30"));
      meal("저녁");
      dinner = true;
    }
    const move = round5((i === 0 ? baseMinutes(s.place) : 30) * f);
    rows.push({ time: toTime(t), end: toTime(t + move), kind: "move", title: `이동 · ${prefs.transport}`, sub: `약 ${move}분 (예상)` });
    t += move;
    const stay = stayMinutes(s.place, day.fullDay);
    rows.push({ time: toTime(t), end: toTime(t + stay), kind: "visit", title: s.place.name, sub: `${s.label} · ${s.place.tags.join(" · ")} · 체류 ${stay / 60}시간 (예상)` });
    if (day.fullDay && stay >= 240) {
      lunch = true; // 하루 일정 장소 안에서 점심
      rows[rows.length - 1].sub += " · 점심 포함";
    }
    t += stay;
    prevFar = baseMinutes(s.place);
  });

  if (!dinner && day.slots.length) {
    t = Math.max(t, toMin("17:30"));
    meal("저녁");
  }
  if (day.slots.length) {
    const back = round5((day.fullDay ? prevFar : 30) * f);
    rows.push({ time: toTime(t), end: toTime(t + back), kind: "move", title: `숙소 복귀 · ${prefs.transport}`, sub: `약 ${back}분 (예상)` });
  } else {
    rows.push({ time: toTime(t), kind: "rest", title: "자유 일정", sub: "추천 장소가 배정되지 않은 날" });
  }
  return rows;
}
