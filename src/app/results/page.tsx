"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { TEMP_GRADE } from "@/data/regionsV1";
import { useFlowQuery } from "@/lib/flow";
import { scoreRegions, tripDays } from "@/services/regionScore";

export default function ResultsPage() {
  const router = useRouter();
  const q = useFlowQuery();
  const results = useMemo(() => (q ? scoreRegions(q) : []), [q]);
  if (!q) return null;

  // 164개 권역 중 상위 10곳만 보여준다
  const ranked = results.filter((r) => r.status === "ranked").slice(0, 10);
  const others = results.filter((r) => (r.status === "데이터 부족" || r.status === "조건 충족 장소 없음") && !r.region.tier); // 시범 권역만 사유 표시
  const days = tripDays(q.startDate, q.endDate);
  const who = [`성인 ${q.adults}`, ...q.children.map((c) => c.band), q.elders ? "부모님" : "", q.pet ? "반려동물" : ""].filter(Boolean).join(" · ");

  return (
    <main className="container page" style={{ maxWidth: 560 }}>
      <div className="between">
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>추천 여행지</h1>
        <Link href="/" className="btn btn-sm">조건 수정</Link>
      </div>
      <div className="row-wrap" style={{ margin: "10px 0 14px" }}>
        <span className="chip"><Icon name="calendar" />{days - 1}박 {days}일</span>
        <span className="chip"><Icon name="users" />{who}</span>
        <span className="chip">{q.main}{q.subs.length ? ` + ${q.subs.join("·")}` : ""}</span>
        <span className="chip">{q.stay}</span>
      </div>

      <div className="stack">
        {ranked.map((r, i) => (
          <button key={r.region.id} className={`rank-card reveal ${i === 0 ? "first" : ""}`} style={{ animationDelay: `${i * 0.12}s` }} onClick={() => router.push(`/r/${r.region.id}`)}>
            <div className="between" style={{ width: "100%" }}>
              <div className="row" style={{ gap: 12 }}>
                <span className="rank-num">{r.rank}위</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{r.region.name}</div>
                  <div className="xs muted">{r.region.country} · {r.weather.judge === "미확인" ? "날씨 미확인" : `${r.weather.month}월 ${r.weather.judge}`} · {r.stay.tier ? `경비 ${r.stay.tier}${r.stay.estimated ? "(추정)" : ""} · 1인 약 ${Math.round(r.stay.totalKrw! / 10000)}만원(항공 ${Math.round(r.stay.flightKrw! / 10000)}만)` : "경비 미확인"}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="rank-score">{Math.round(r.display)}</span><span className="small muted">점</span>
              </div>
            </div>
            <div className="small bold">사유</div>
            <ul className="reason-list">
              {r.reasons.map((s) => <li key={s}>{s}</li>)}
            </ul>
            {r.weather.judge === "스콜성 우기" && <span className="badge badge-warn">스콜성 우기</span>}
            <div className="row small" style={{ color: "var(--teal-dark)", fontWeight: 700 }}>날짜별 일정 보기 <Icon name="next" size={16} /></div>
          </button>
        ))}
        {others.map((r) => (
          <div key={r.region.id} className="card-soft small muted">{r.region.name}: {r.status}</div>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 18, gap: 6 }}>
        {TEMP_GRADE && <p className="xs faint">장소 등급은 한국어 후기 판정 전 임시 등급이에요. 점수는 구조 확인용이에요.</p>}
        {q.price !== "상관없음" && <p className="xs faint">경비 &lsquo;{q.price}&rsquo; 권역만 보여줘요. 1인 총경비(인천 왕복 항공 + 숙소 + 식비)로 나눴고, 경비를 모르는 {results.filter((r) => r.status === "물가 미확인").length}곳은 뺐어요.</p>}
      </div>
    </main>
  );
}
