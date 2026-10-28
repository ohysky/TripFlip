"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useTripStore } from "@/store/TripStore";

const NAV = [
  { href: "/", label: "여행지 추천", icon: "plane" },
  { href: "/my-trips", label: "내 여행", icon: "suitcase" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { toast } = useTripStore();
  const isActive = (href: string) => (href === "/" ? !path.startsWith("/my-trips") : path.startsWith(href));
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="header-logo" aria-label="TripFlip 홈">
            {/* 제공된 공식 로고 원본 이미지 사용 */}
            <img src="/logo-full.png" alt="TripFlip 트립플립" />
          </Link>
          <nav className="header-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>{n.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>
            <Icon name={n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

export function BackButton({ href, label = "뒤로" }: { href?: string; label?: string }) {
  if (href) return <Link href={href} className="back-btn"><Icon name="back" />{label}</Link>;
  return <button className="back-btn" onClick={() => history.back()}><Icon name="back" />{label}</button>;
}
