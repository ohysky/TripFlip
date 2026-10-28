"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useFlowQuery } from "@/lib/flow";
import { buildDays, fmtDate } from "@/services/itineraryV1";
import { scoreRegions } from "@/services/regionScore";

function ScheduleInner() {
  const { id } = useParams<{ id: string }>();
  const plan = useSearchParams().get("plan");
  const router = useRouter();
  const q = useFlowQuery(plan);
  const r = useMemo(() => (q ? scoreRegions(q).find((x) => x.region.id === id) : undefined), [q, id]);
  const plan_ = useMemo(() => (q && r && r.status === "ranked" ? buildDays(r, q) : null), [q, r]);
  if (!q) return null;
  if (!r || !plan_) return <p className="muted">일정을 만들 수 없는 지역이에요.</p>;
  const suffix = plan ? `?plan=${plan}` : "";

  return (
    <>
      <BackButton href={plan ? "/my-trips" : "/results"} label={plan ? "내 여행" : "추천 목록"} />
      <div className="between" style={{ marginTop: 4 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>{r.region.name} 일정</h1>
          <p className="small muted">거점 {r.region.base}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="rank-score" style={{ fontSize: 26 }}>{Math.round(r.display)}</span><span className="small muted">점</span>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 14 }}>
        {plan_.days.map((d) => (
          <button key={d.day} className="day-card reveal" style={{ animationDelay: `${d.day * 0.06}s` }} onClick={() => router.push(`/r/${id}/day/${d.day}${suffix}`)}>
            <div className="between" style={{ width: "100%" }}>
              <b>{d.day}일차 <span className="muted small">· {fmtDate(d.date)}</span></b>
              <Icon name="next" size={16} />
            </div>
            {d.slots.length ? d.slots.map((s) => (
              <div key={s.place.id} className="slot">
                <span className="k">{s.label}</span>
                <span>{s.place.name} <span className="xs faint">{s.place.grade}급</span></span>
              </div>
            )) : <div className="small muted">자유 일정</div>}
          </button>
        ))}
      </div>
      {plan_.unplaced.length > 0 && <p className="xs muted" style={{ marginTop: 10 }}>일정에 못 넣은 곳: {plan_.unplaced.map((p) => p.name).join(", ")}</p>}
      <p className="xs faint" style={{ marginTop: 6 }}>일차를 누르면 기상부터 이동까지 시간표를 볼 수 있어요.</p>

      {!plan && (
        <div className="sticky-cta" style={{ marginTop: 12 }}>
          <Link href={`/book/${id}`} className="btn btn-primary btn-lg btn-block">이 지역으로 NEXT <Icon name="next" /></Link>
        </div>
      )}
    </>
  );
}

export default function SchedulePage() {
  return (
    <main className="container page" style={{ maxWidth: 560 }}>
      <Suspense>
        <ScheduleInner />
      </Suspense>
    </main>
  );
}
