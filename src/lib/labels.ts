import type { Budget, Intensity, Pref, Tri } from "./types";

export const UNKNOWN = "미확인";

export const PREF_LABEL: Record<Pref, string> = {
  sightseeing: "관광",
  nature: "자연",
  relax: "휴양",
  food: "음식",
  shopping: "쇼핑",
  culture: "문화",
  history: "역사",
  activity: "액티비티",
  kids: "아이 중심",
  photo: "사진",
  night: "야경",
};

export const ALL_PREFS = Object.keys(PREF_LABEL) as Pref[];

export const INTENSITY: Record<Intensity, { label: string; desc: string }> = {
  relaxed: { label: "여유롭게", desc: "하루 핵심 일정 1~2개" },
  normal: { label: "보통", desc: "하루 2~4개" },
  packed: { label: "알차게", desc: "하루 4개 이상 가능" },
};

export const BUDGET: Record<Budget, { label: string; desc: string }> = {
  value: { label: "가성비", desc: "비용 우선" },
  balanced: { label: "균형", desc: "비용과 만족 균형" },
  comfort: { label: "여유", desc: "편의 우선" },
  premium: { label: "프리미엄", desc: "경험 우선" },
};

export function triLabel(v: Tri, yes: string, no: string): string {
  if (v === null || v === undefined) return UNKNOWN;
  return v ? yes : no;
}

export const INDOOR_LABEL = { indoor: "실내", outdoor: "실외", mixed: "실내·실외" } as const;
export const SPICY_LABEL = { mild: "안 매움", medium: "약간 매움", hot: "매움" } as const;
