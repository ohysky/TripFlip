"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/ui";
import { loadPlans, removePlan } from "@/lib/flow";
import type { SavedPlan } from "@/lib/flow";
import { fmtDate } from "@/services/itineraryV1";
import { tripDays } from "@/services/regionScore";

export default function MyTripsPage() {
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  useEffect(() => setPlans(loadPlans()), []);
  if (!plans) return null;

  return (
    <main className="container page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>내 여행</h1>
      {plans.length === 0 ? (
        <Empty icon="suitcase" title="아직 저장된 여행이 없어요" desc="추천받은 지역을 예약하고 저장하면 여기에 모여요." action={<Link href="/" className="btn btn-primary">여행지 추천받기</Link>} />
      ) : (
        <div className="stack" style={{ marginTop: 14 }}>
          {plans.map((p) => {
            const d = tripDays(p.query.startDate, p.query.endDate);
            return (
              <div key={p.id} className="card stack" style={{ gap: 10 }}>
                <Link href={`/r/${p.regionId}?plan=${p.id}`} className="between">
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800 }}>{p.regionName}</div>
                    <div className="small muted">{fmtDate(p.query.startDate)} ~ {fmtDate(p.query.endDate)} · {d - 1}박 {d}일 · {p.query.adults + p.query.children.length}명</div>
                  </div>
                  <Icon name="next" />
                </Link>
                <div className="row-wrap">
                  <span className={`badge ${p.booked.flight ? "badge-ok" : "badge-muted"}`}>항공 {p.booked.flight ? "예약 완료" : "미예약"}</span>
                  <span className={`badge ${p.booked.hotel ? "badge-ok" : "badge-muted"}`}>숙소 {p.booked.hotel ? "예약 완료" : "미예약"}</span>
                  <span className="badge badge-muted">추천 {Math.round(p.display)}점</span>
                </div>
                <button className="btn btn-sm btn-ghost" style={{ alignSelf: "flex-end" }} onClick={() => { removePlan(p.id); setPlans(loadPlans()); }}>삭제</button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
