"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { DemoBadge, FreeBadge, PremiumBadge } from "@/components/ui";
import { getDestinations } from "@/data/repository";
import { useTripStore, FREE_TRIP_LIMIT } from "@/store/TripStore";

const THEMES = [
  { id: "kids", t: "아이와 함께", s: "이동 짧게 · 낮잠 고려" },
  { id: "relax", t: "리조트 휴양", s: "여유롭게 쉬는 여행" },
  { id: "food", t: "음식 여행", s: "현지 음식 중심" },
  { id: "value", t: "가성비 여행", s: "예산 우선" },
];

export default function Home() {
  const router = useRouter();
  const { trips, createDemoTrip, showToast, ready } = useTripStore();
  const dests = getDestinations();

  const openDemo = () => {
    const t = createDemoTrip();
    if (!t) return showToast(`Free 플랜은 여행을 ${FREE_TRIP_LIMIT}개까지 저장할 수 있어요. 내 여행에서 정리해 주세요.`);
    router.push(`/trip/${t.id}`);
  };

  return (
    <main className="container page">
      <div className="home-grid">
        <div className="stack-lg">
          <section className="hero">
            <h1>나에게 맞는 여행을<br />발견하다</h1>
            <p>조건을 고르면 여행지 → 숙박 지역 → 방문지 → 식당 → 실제 이동 가능한 일정까지 좁혀 드려요.</p>
          </section>

          <section className="cta-grid">
            <Link href="/plan" className="cta-main">
              <div>
                <div className="t">여행지 찾아보기</div>
                <div className="s">날짜·인원·취향으로 어울리는 곳 발견</div>
              </div>
              <Icon name="flip" size={28} />
            </Link>
            <Link href="/search" className="cta-sub">
              <div>
                <div className="t">이미 여행지가 있어요</div>
                <div className="muted small">대륙 → 국가 → 지역으로 찾기</div>
              </div>
              <Icon name="search" />
            </Link>
            <Link href="/trips" className="cta-sub">
              <div>
                <div className="t">내 여행 보기</div>
                <div className="muted small">{ready ? (trips.length ? `저장된 여행 ${trips.length}개` : "아직 저장된 여행이 없어요") : " "}</div>
              </div>
              <Icon name="suitcase" />
            </Link>
          </section>

          <section className="card-soft stack">
            <div className="row"><DemoBadge /><b>나트랑 가족여행 미리보기</b></div>
            <p className="small muted">성인 4 · 어린이 2(4세·2세) · 보통 강도 · 리조트 · 점심 11:30 / 저녁 17:00. 아이 동반 일정이 어떻게 짜이는지 바로 확인해 보세요.</p>
            <button className="btn btn-teal btn-block" onClick={openDemo}>Demo 일정 열기</button>
          </section>
        </div>

        <div className="stack-lg">
          <section className="stack">
            <div className="between">
              <h2 className="section-title">넘겨보며 발견하기</h2>
              <Link href="/discover" className="small bold" style={{ color: "var(--teal-dark)" }}>전체 보기</Link>
            </div>
            <div className="h-scroll">
              {dests.map((d) => (
                <Link key={d.id} href={`/discover?d=${d.id}`} className="mini-dest">
                  <div className="img" style={{ background: d.tone }}><b>{d.name}</b></div>
                  <div className="body">
                    <div className="small muted">{d.country} · {d.nameEn}</div>
                    <div className="small" style={{ marginTop: 4 }}>{d.reason}</div>
                    <div className="row-wrap" style={{ marginTop: 8 }}>
                      {d.character.slice(0, 3).map((c) => <span key={c} className="chip xs">{c}</span>)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <p className="xs faint">여행지 정보는 시연용 DEMO 데이터예요. 자동 일정은 현재 나트랑만 지원해요.</p>
          </section>

          <section className="stack">
            <h2 className="section-title">테마로 시작하기</h2>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <Link key={t.id} href={`/plan?theme=${t.id}`} className="theme">
                  <b>{t.t}</b>
                  <span>{t.s}</span>
                </Link>
              ))}
            </div>
          </section>

          <Link href="/premium" className="card between">
            <div className="stack" style={{ gap: 4 }}>
              <div className="row"><FreeBadge /><span className="small">탐색·기본 일정은 계속 무료</span></div>
              <div className="row"><PremiumBadge /><span className="small">출시 기념 90일 무료</span></div>
            </div>
            <Icon name="next" />
          </Link>
        </div>
      </div>
    </main>
  );
}
