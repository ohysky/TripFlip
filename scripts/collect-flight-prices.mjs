// 인천 출발 시범 권역 항공권 최저가를 하루 한 번 저장한다 (Travelpayouts Aviasales Data API, 캐시 가격).
// 실행: TRAVELPAYOUTS_TOKEN=... node scripts/collect-flight-prices.mjs [저장 폴더]
// 결과는 용량을 줄이려고 행 배열(FIELDS 순서)로 압축해 저장한다.
import { mkdir, writeFile } from "node:fs/promises";

const OUT_DIR = process.argv[2] ?? "data/flight-prices";
const FIELDS = ["departure_at", "return_at", "price", "airline", "transfers", "return_transfers", "duration"];

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

const now = new Date();
const stamp = `${now.toISOString().slice(0, 10)}_${String(now.getUTCHours()).padStart(2, "0")}`;
const result = { collectedAt: now.toISOString(), source: "Travelpayouts Aviasales Data API (최근 48시간 검색 캐시)", origin: ORIGIN, currency: "KRW", fields: FIELDS, routes: {} };

for (const [code, name] of Object.entries(DESTINATIONS)) {
  const route = { name, months: {} };
  for (const month of months()) {
    const r = await fetchMonth(code, month);
    route.months[month] = r.error ? { error: r.error } : r.data.map((t) => FIELDS.map((f) => t[f] ?? null));
    await new Promise((ok) => setTimeout(ok, 300));
  }
  result.routes[code] = route;
  const n = Object.values(route.months).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
  console.log(`${ORIGIN}-${code} (${name}): ${n}건`);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(`${OUT_DIR}/${stamp}.json`, JSON.stringify(result));
console.log(`저장: ${OUT_DIR}/${stamp}.json`);
