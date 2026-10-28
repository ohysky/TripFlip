"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { CONCEPTS } from "@/data/regionsV1";
import type { Concept } from "@/data/regionsV1";
import { loadQuery, saveQuery } from "@/lib/flow";
import { tripDays } from "@/services/regionScore";
import type { ChildBand, IntensityV1, PriceLevel, RegionQuery, StayTier } from "@/services/regionScore";

const BANDS: ChildBand[] = ["영아", "유아", "초등", "중고등"];
const INTENSITY: { v: IntensityV1; label: string }[] = [
  { v: 1, label: "여유롭게" },
  { v: 2, label: "보통" },
  { v: 3, label: "알차게" },
];
const PRICES: PriceLevel[] = ["저렴", "보통", "높음", "상관없음"];
const STAYS: StayTier[] = ["가성비", "가심비", "프리미엄", "하이엔드"];

function Count({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper" style={{ minHeight: 44 }}>
      <div className="bold">{label}</div>
      <div className="ctrl">
        <button type="button" className="icon-btn" aria-label={`${label} 줄이기`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <span>{value}</span>
        <button type="button" className="icon-btn" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" /></button>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState<RegionQuery | null>(null);
  const [flying, setFlying] = useState(false);
  useEffect(() => setQ(loadQuery()), []);
  if (!q) return null;

  const set = <K extends keyof RegionQuery>(k: K, v: RegionQuery[K]) => setQ({ ...q, [k]: v });
  const days = q.startDate && q.endDate ? tripDays(q.startDate, q.endDate) : 0;
  const dateError = days < 2 ? "귀국일은 출발일보다 늦어야 해요 (최소 1박)" : days > 30 ? "최대 30일까지 지원해요" : null;
  const toggleBand = (b: ChildBand) => {
    const has = q.children.some((c) => c.band === b);
    set("children", has ? q.children.filter((c) => c.band !== b) : [...q.children, { band: b, height: null }]);
  };
  const setMain = (c: Concept) => setQ({ ...q, main: c, subs: q.subs.filter((s) => s !== c) });
  const toggleSub = (c: Concept) => set("subs", q.subs.includes(c) ? q.subs.filter((s) => s !== c) : [...q.subs, c]);

  const go = () => {
    if (dateError) return;
    saveQuery(q);
    setFlying(true);
    setTimeout(() => router.push("/results"), 2200);
  };

  return (
    <main className="container page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>어디로 떠나볼까요?</h1>
      <p className="small muted">네 가지만 고르면 어울리는 여행지를 순위로 보여드려요.</p>

      <section className="q-block">
        <h2>언제 가나요?</h2>
        <div className="grid-2">
          <input className="input" type="date" aria-label="출발일" value={q.startDate} onChange={(e) => set("startDate", e.target.value)} />
          <input className="input" type="date" aria-label="귀국일" value={q.endDate} min={q.startDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
        {dateError ? <p className="small" style={{ color: "var(--danger)" }}>{dateError}</p> : <p className="small muted">{days - 1}박 {days}일</p>}
      </section>

      <section className="q-block">
        <h2>누구랑 가나요?</h2>
        <Count label="성인" value={q.adults} min={1} max={12} onChange={(n) => set("adults", n)} />
        <div className="chips">
          {BANDS.map((b) => <button key={b} type="button" className={`toggle-chip ${q.children.some((c) => c.band === b) ? "on" : ""}`} onClick={() => toggleBand(b)}>{b} 자녀</button>)}
          <button type="button" className={`toggle-chip ${q.elders ? "on" : ""}`} onClick={() => set("elders", !q.elders)}>부모님</button>
          <button type="button" className={`toggle-chip ${q.pet ? "on" : ""}`} onClick={() => set("pet", !q.pet)}>반려동물</button>
        </div>
      </section>

      <section className="q-block">
        <h2>어떤 여행인가요?</h2>
        <span className="label">메인</span>
        <div className="chips">
          {CONCEPTS.map((c) => <button key={c} type="button" className={`toggle-chip ${q.main === c ? "on" : ""}`} onClick={() => setMain(c)}>{c}</button>)}
        </div>
        <span className="label">서브 (여러 개)</span>
        <div className="chips">
          {CONCEPTS.filter((c) => c !== q.main).map((c) => <button key={c} type="button" className={`toggle-chip ${q.subs.includes(c) ? "on" : ""}`} onClick={() => toggleSub(c)}>{c}</button>)}
        </div>
        <span className="label">강도</span>
        <div className="seg sm">
          {INTENSITY.map((it) => <button key={it.v} type="button" className={q.perDay === it.v ? "on" : ""} onClick={() => set("perDay", it.v)}>{it.label}</button>)}
        </div>
      </section>

      <section className="q-block" style={{ borderBottom: 0 }}>
        <h2>예산은요?</h2>
        <span className="label">지역 물가</span>
        <div className="seg sm">
          {PRICES.map((p) => <button key={p} type="button" className={q.price === p ? "on" : ""} onClick={() => set("price", p)}>{p}</button>)}
        </div>
        <span className="label">숙소</span>
        <div className="seg sm">
          {STAYS.map((s) => <button key={s} type="button" className={q.stay === s ? "on" : ""} onClick={() => set("stay", s)}>{s}</button>)}
        </div>
      </section>

      <div className="sticky-cta">
        <button className="btn btn-primary btn-lg btn-block" disabled={!!dateError} onClick={go}>
          <Icon name="plane" /> 여행지 추천받기
        </button>
      </div>

      {flying && (
        <div className="plane-overlay" role="status">
          <div className="plane-orbit">
            <span className="plane">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#fff" aria-hidden><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
            </span>
          </div>
          <p>나에게 맞는 여행지를 찾는 중…</p>
        </div>
      )}
    </main>
  );
}
