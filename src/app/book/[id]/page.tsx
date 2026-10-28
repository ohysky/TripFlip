"use client";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { savePlan, useFlowQuery } from "@/lib/flow";
import { fmtDate } from "@/services/itineraryV1";
import { scoreRegions, tripDays } from "@/services/regionScore";
import type { ChildBand, RegionQuery } from "@/services/regionScore";
import type { RegionV1 } from "@/data/regionsV1";

// 연령대 → 검색 사이트에 넘길 대표 나이
const AGE: Record<ChildBand, number> = { 영아: 1, 유아: 4, 초등: 9, 중고등: 15 };

function flightUrl(r: RegionV1, q: RegionQuery) {
  const ymd = (d: string) => d.slice(2).replaceAll("-", "");
  const kids = q.children.map((c) => AGE[c.band]).join("|");
  return `https://www.skyscanner.co.kr/transport/flights/icn/${r.airportCode}/${ymd(q.startDate)}/${ymd(q.endDate)}/?adultsv2=${q.adults}${kids ? `&childrenv2=${encodeURIComponent(kids)}` : ""}`;
}

function hotelUrl(r: RegionV1, q: RegionQuery) {
  const p = new URLSearchParams({
    textToSearch: r.searchName,
    checkIn: q.startDate,
    checkOut: q.endDate,
    rooms: String(Math.ceil(q.adults / 2)),
    adults: String(q.adults),
    children: String(q.children.length),
  });
  if (q.children.length) p.set("childAges", q.children.map((c) => AGE[c.band]).join(","));
  return `https://www.agoda.com/ko-kr/search?${p}`;
}

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useFlowQuery();
  const r = useMemo(() => (q ? scoreRegions(q).find((x) => x.region.id === id) : undefined), [q, id]);
  const [booked, setBooked] = useState({ flight: false, hotel: false });
  if (!q) return null;
  if (!r) return <main className="container page"><p className="muted">지역을 찾을 수 없어요.</p></main>;
  const days = tripDays(q.startDate, q.endDate);
  const people = q.adults + q.children.length;

  const save = () => {
    savePlan({ id: `${id}-${q.startDate}`, regionId: id, regionName: r.region.name, query: q, display: r.display, booked, createdAt: new Date().toISOString() });
    router.push("/my-trips");
  };

  return (
    <main className="container page" style={{ maxWidth: 560 }}>
      <BackButton href={`/r/${id}`} label={`${r.region.name} 일정`} />
      <h1 style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{r.region.name} 예약하기</h1>
      <p className="small muted">{fmtDate(q.startDate)} ~ {fmtDate(q.endDate)} · {days - 1}박 {days}일 · {people}명</p>

      <div className="stack" style={{ marginTop: 16 }}>
        <section className={`book-card ${booked.flight ? "done" : ""}`}>
          <div className="row"><Icon name="plane" size={22} /><b style={{ fontSize: 18 }}>항공권</b></div>
          <p className="small muted">인천 → {r.region.airport} 왕복 · 성인 {q.adults}{q.children.length ? ` · 자녀 ${q.children.length}` : ""}</p>
          <a className="btn btn-teal btn-block" href={flightUrl(r.region, q)} target="_blank" rel="noopener noreferrer">스카이스캐너에서 예약 <Icon name="link" /></a>
          <label className="check-row"><input type="checkbox" checked={booked.flight} onChange={(e) => setBooked({ ...booked, flight: e.target.checked })} />항공권 예약 완료</label>
        </section>

        <section className={`book-card ${booked.hotel ? "done" : ""}`}>
          <div className="row"><Icon name="bed" size={22} /><b style={{ fontSize: 18 }}>숙소</b><span className="badge badge-muted">{q.stay}</span></div>
          <p className="small muted">{r.region.base} · 객실 {Math.ceil(q.adults / 2)}개 · {days - 1}박</p>
          <a className="btn btn-teal btn-block" href={hotelUrl(r.region, q)} target="_blank" rel="noopener noreferrer">아고다에서 예약 <Icon name="link" /></a>
          <label className="check-row"><input type="checkbox" checked={booked.hotel} onChange={(e) => setBooked({ ...booked, hotel: e.target.checked })} />숙소 예약 완료</label>
        </section>
      </div>
      <p className="xs faint" style={{ marginTop: 10 }}>예약은 제휴사 사이트에서 진행돼요. 결제 후 돌아와서 완료를 체크해 주세요. (제휴 링크 연결 전, 지금은 검색 링크)</p>

      <div className="sticky-cta" style={{ marginTop: 12 }}>
        <button className="btn btn-primary btn-lg btn-block" onClick={save}>내 여행에 저장</button>
      </div>
    </main>
  );
}
