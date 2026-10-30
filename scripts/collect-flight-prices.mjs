// 인천 출발 시범 권역 항공권 최저가를 하루 한 번 저장한다 (Travelpayouts Aviasales Data API, 캐시 가격).
// 실행: TRAVELPAYOUTS_TOKEN=... node scripts/collect-flight-prices.mjs
import { mkdir, writeFile } from "node:fs/promises";

const TOKEN = process.env.TRAVELPAYOUTS_TOKEN;
if (!TOKEN) {
  console.error("TRAVELPAYOUTS_TOKEN 이 없습니다");
  process.exit(1);
}

const ORIGIN = "ICN";
const DESTINATIONS = { HKG: "홍콩", KIX: "오사카", DAD: "다낭", CXR: "나트랑", PQC: "푸꾸옥" };
const MONTHS_AHEAD = 6;

function months() {
  const out = [];
  const d = new Date();
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
    out.push(m.toISOString().slice(0, 7));
  }
  return out;
}

async function fetchMonth(destination, month) {
  const p = new URLSearchParams({
    origin: ORIGIN,
    destination,
    departure_at: month,
    currency: "krw",
    market: "kr",
    sorting: "price",
    one_way: "false",
    limit: "1000",
    token: TOKEN,
  });
  const res = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${p}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) return { error: `${res.status} ${body.error ?? ""}`.trim(), data: [] };
  return { data: body.data ?? [] };
}

const today = new Date().toISOString().slice(0, 10);
const result = { collectedAt: new Date().toISOString(), source: "Travelpayouts Aviasales Data API (최근 48시간 검색 캐시)", origin: ORIGIN, routes: {} };

for (const [code, name] of Object.entries(DESTINATIONS)) {
  const route = { name, months: {} };
  for (const month of months()) {
    const r = await fetchMonth(code, month);
    route.months[month] = r.error ? { error: r.error } : r.data.map((t) => ({
      departure_at: t.departure_at,
      return_at: t.return_at,
      price: t.price,
      airline: t.airline,
      transfers: t.transfers,
      return_transfers: t.return_transfers,
      duration: t.duration,
      link: t.link,
    }));
    await new Promise((ok) => setTimeout(ok, 300));
  }
  result.routes[code] = route;
  const n = Object.values(route.months).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
  console.log(`${ORIGIN}-${code} (${name}): ${n}건`);
}

await mkdir("data/flight-prices", { recursive: true });
await writeFile(`data/flight-prices/${today}.json`, JSON.stringify(result, null, 1));
console.log(`저장: data/flight-prices/${today}.json`);
