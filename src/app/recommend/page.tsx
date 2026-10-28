"use client";
import { useMemo, useState } from "react";
import { BackButton } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { CONCEPTS, TEMP_GRADE } from "@/data/regionsV1";
import type { Concept } from "@/data/regionsV1";
import { scoreRegions, tripDays } from "@/services/regionScore";
import type { ChildBand, IntensityV1, RegionQuery, RegionResult } from "@/services/regionScore";

const BANDS: ChildBand[] = ["영아", "유아", "초등", "중고등"];
const INTENSITY: { v: IntensityV1; label: string; sub: string }[] = [
  { v: 1, label: "여유롭게", sub: "하루 1곳" },
  { v: 2, label: "보통", sub: "오전/오후" },
  { v: 3, label: "알차게", sub: "오전/오후/저녁" },
];
const WEATHER_TONE: Record<string, string> = { 좋음: "badge-ok", 보통: "badge-muted", "스콜성 우기": "badge-warn", "지속형 우기": "badge-warn", 혹서기: "badge-warn" };

const DEFAULT: RegionQuery = {
  startDate: "2026-12-20",
  endDate: "2026-12-23",
  adults: 2,
  children: [{ band: "유아", height: null }, { band: "영아", height: null }],
  elders: false,
  pet: false,
  main: "관광",
  subs: ["휴양"],
  perDay: 2,
};

function Count({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper">
      <div className="bold">{label}</div>
      <div className="ctrl">
        <button type="button" className="icon-btn" aria-label={`${label} 줄이기`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <span>{value}</span>
        <button type="button" className="icon-btn" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" /></button>
      </div>
    </div>
  );
}

function RegionCard({ r }: { r: RegionResult }) {
  const [open, setOpen] = useState(false);
  const ranked = r.status === "ranked";
  return (
    <article className="card stack" style={{ gap: 12 }}>
      <div className="between">
        <div className="row" style={{ gap: 10 }}>
          {ranked && <span className="badge" style={{ background: "var(--navy)", color: "#fff", flexShrink: 0 }}>{r.rank}위</span>}
          <div>
            <div className="bold" style={{ fontSize: 19 }}>{r.region.name} <span className="muted small">· {r.region.country}</span></div>
            <div className="xs muted">거점 {r.region.base}</div>
          </div>
        </div>
        {ranked ? (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>{Math.round(r.display)}</div>
            <div className="xs faint">/ 100</div>
          </div>
        ) : (
          <span className="badge badge-muted">{r.status}</span>
        )}
      </div>

      <div className="row-wrap">
        <span className={`badge ${WEATHER_TONE[r.weather.judge]}`}>{r.weather.month}월 날씨 {r.weather.judge} {r.weather.adj > 0 ? `+${r.weather.adj}` : r.weather.adj || ""}</span>
        {ranked && <span className="badge badge-muted">충족 {r.filled}/{r.N}곳</span>}
        <span className="badge badge-muted">물가 미확인</span>
        <span className="badge badge-muted">공항→거점 {r.region.airportToBase}</span>
      </div>
      {r.weather.judge === "스콜성 우기" && <div className="banner banner-warn small">스콜성 우기: 짧고 강한 비가 잦아요.</div>}

      {ranked && (
        <div className="stack" style={{ gap: 6 }}>
          {(open ? r.top : r.top.slice(0, 4)).map((s) => (
            <div key={s.place.id} className="between small">
              <span>
                <b style={{ display: "inline-block", width: 18 }}>{s.place.grade}</b> {s.place.name}
                <span className="faint xs"> · {s.place.travel}{s.place.penalty ? ` (−${s.place.penalty})` : ""}{s.weight === 0.5 ? " · 서브" : ""}</span>
              </span>
              <span className="bold">{s.score}</span>
            </div>
          ))}
          {r.top.length > 4 && (
            <button className="btn btn-sm btn-ghost" onClick={() => setOpen(!open)}>{open ? "접기" : `${r.top.length - 4}곳 더 보기`}</button>
          )}
        </div>
      )}

      {r.excluded.length > 0 && (
        <p className="xs muted">제외 {r.excluded.length}곳: {r.excluded.map((e) => `${e.place.name}(${e.reason})`).join(", ")}</p>
      )}
      {r.flags.length > 0 && <p className="xs" style={{ color: "var(--warn)" }}>{r.flags.join(" · ")}</p>}
      <p className="xs faint">
        점수 = (상위 {r.N}곳 합 ÷ {r.N}) {r.weather.adj >= 0 ? "+" : "−"} 날씨 {Math.abs(r.weather.adj)} = {r.score.toFixed(2)} → ÷5.5×100 · 날씨 출처 {r.weather.source}
      </p>
    </article>
  );
}

export default function RecommendPage() {
  const [q, setQ] = useState<RegionQuery>(DEFAULT);
  const set = <K extends keyof RegionQuery>(k: K, v: RegionQuery[K]) => setQ((p) => ({ ...p, [k]: v }));
  const days = q.startDate && q.endDate ? tripDays(q.startDate, q.endDate) : 0;
  const dateError = days < 2 ? "귀국일은 출발일보다 늦어야 해요 (최소 1박)" : days > 30 ? "최대 30일까지 지원해요" : null;
  const results = useMemo(() => (dateError ? [] : scoreRegions(q)), [q, dateError]);

  const setChildren = (n: number) => {
    const list = [...q.children];
    while (list.length < n) list.push({ band: "유아", height: null });
    set("children", list.slice(0, n));
  };
  const setMain = (c: Concept) => setQ((p) => ({ ...p, main: c, subs: p.subs.filter((s) => s !== c) }));
  const toggleSub = (c: Concept) => set("subs", q.subs.includes(c) ? q.subs.filter((s) => s !== c) : [...q.subs, c]);

  return (
    <main className="container page" style={{ maxWidth: 720 }}>
      <BackButton href="/" label="홈" />
      <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>권역 추천 <span className="badge badge-demo" style={{ verticalAlign: "middle" }}>V1 시범</span></h1>
      {TEMP_GRADE && (
        <div className="banner banner-warn small" style={{ marginTop: 10 }}>
          <span>장소 등급(S~D)은 한국어 후기 판정 전 <b>임시 등급</b>이에요. 점수 구조 확인용이고, 실제 후기 등급으로 바꿀 예정이에요.</span>
        </div>
      )}

      <div className="form-section">
        <h2 className="section-title">언제 가나요?</h2>
        <div className="grid-2">
          <label className="field">
            <span className="label">출발일</span>
            <input className="input" type="date" value={q.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">귀국일</span>
            <input className="input" type="date" value={q.endDate} min={q.startDate} onChange={(e) => set("endDate", e.target.value)} />
          </label>
        </div>
        {dateError ? <p className="small" style={{ color: "var(--danger)" }}>{dateError}</p> : <p className="small muted">{days - 1}박 {days}일</p>}
      </div>

      <div className="form-section">
        <h2 className="section-title">누구와 가나요?</h2>
        <Count label="성인" value={q.adults} min={1} max={12} onChange={(n) => set("adults", n)} />
        <Count label="미성년 자녀" value={q.children.length} min={0} max={6} onChange={setChildren} />
        {q.children.map((c, i) => (
          <div key={i} className="grid-2">
            <select className="input" value={c.band} aria-label={`자녀 ${i + 1} 연령대`} onChange={(e) => set("children", q.children.map((x, j) => (j === i ? { ...x, band: e.target.value as ChildBand } : x)))}>
              {BANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
            <input className="input" type="number" inputMode="numeric" placeholder="키(cm, 선택)" value={c.height ?? ""} aria-label={`자녀 ${i + 1} 키`} onChange={(e) => set("children", q.children.map((x, j) => (j === i ? { ...x, height: e.target.value ? Number(e.target.value) : null } : x)))} />
          </div>
        ))}
        <div className="row-wrap">
          <button type="button" className={`toggle-chip ${q.elders ? "on" : ""}`} onClick={() => set("elders", !q.elders)}>부모님·배우자 부모님</button>
          <button type="button" className={`toggle-chip ${q.pet ? "on" : ""}`} onClick={() => set("pet", !q.pet)}>반려동물</button>
        </div>
      </div>

      <div className="form-section">
        <h2 className="section-title">무엇을 하고 싶나요?</h2>
        <span className="label">메인 컨셉 (1개)</span>
        <div className="row-wrap">
          {CONCEPTS.map((c) => <button key={c} type="button" className={`toggle-chip ${q.main === c ? "on" : ""}`} onClick={() => setMain(c)}>{c}</button>)}
        </div>
        <span className="label">서브 컨셉 (0~4개)</span>
        <div className="row-wrap">
          {CONCEPTS.filter((c) => c !== q.main).map((c) => <button key={c} type="button" className={`toggle-chip ${q.subs.includes(c) ? "on" : ""}`} onClick={() => toggleSub(c)}>{c}</button>)}
        </div>
      </div>

      <div className="form-section">
        <h2 className="section-title">얼마나 알차게?</h2>
        <div className="seg">
          {INTENSITY.map((it) => (
            <button key={it.v} type="button" className={q.perDay === it.v ? "on" : ""} onClick={() => set("perDay", it.v)}>
              {it.label}<div className="xs" style={{ fontWeight: 500 }}>{it.sub}</div>
            </button>
          ))}
        </div>
        {!dateError && <p className="small muted">총 방문 {q.perDay * days}곳 기준으로 비교해요</p>}
      </div>

      <section className="stack" style={{ marginTop: 20 }}>
        <h2 className="section-title">추천 권역</h2>
        {results.map((r) => <RegionCard key={r.region.id} r={r} />)}
      </section>
    </main>
  );
}
