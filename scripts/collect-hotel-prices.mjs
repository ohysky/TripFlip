// 시범 권역 숙소 목록·가격대를 하루 한 번 저장한다 (Xotelo, 트립어드바이저 기반 비공식 무료 API).
// 출시 전 아고다 등 공식 제휴 데이터로 바꿀 예정.
// 실행: node scripts/collect-hotel-prices.mjs [저장 폴더]
import { mkdir, writeFile } from "node:fs/promises";

const OUT_DIR = process.argv[2] ?? "data/hotels";
// 트립어드바이저 지역 키
const LOCATIONS = { NT: ["나트랑", "g293928"], HK: ["홍콩", "g294217"], OS: ["오사카", "g298566"], DN: ["다낭", "g298085"], PQ: ["푸꾸옥", "g469418"] };
const FIELDS = ["key", "name", "type", "rating", "reviews", "price_min", "price_max", "lat", "lng", "labels"];
// 최소 품질 기준 (형님 확정 2026-10-30): 청결도 데이터가 생기기 전까지 총점으로 대신한다.
// 트립어드바이저 5점 만점 4.5 = 10점 만점 9점.
const MIN_RATING = 4.5;
const MIN_REVIEWS = 300;
const PAGE = 100;
const MAX_PAGES = 60;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function page(locationKey, offset) {
  const res = await fetch(`https://data.xotelo.com/api/list?location_key=${locationKey}&limit=${PAGE}&offset=${offset}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) return { error: `${res.status} ${JSON.stringify(body.error ?? "")}`, list: [], total: 0 };
  return { list: body.result?.list ?? [], total: body.result?.total_count ?? 0 };
}

const now = new Date();
const result = { collectedAt: now.toISOString(), source: "Xotelo (TripAdvisor 기반, 비공식)", filter: { minRating: MIN_RATING, minReviews: MIN_REVIEWS }, currency: "USD", priceUnit: "1박 객실", fields: FIELDS, regions: {} };

for (const [id, [name, loc]] of Object.entries(LOCATIONS)) {
  const rows = [];
  const seen = new Set();
  let total = 0;
  let error;
  let empty = 0;
  for (let i = 0; i < MAX_PAGES; i++) {
    const r = await page(loc, i * PAGE);
    if (r.error) {
      error = r.error;
      break;
    }
    total = r.total;
    for (const h of r.list) {
      if (seen.has(h.key)) continue; // 페이지가 겹쳐서 같은 숙소가 다시 오기도 한다
      seen.add(h.key);
      rows.push([h.key, h.name, h.accommodation_type, h.review_summary?.rating ?? null, h.review_summary?.count ?? null, h.price_ranges?.minimum ?? null, h.price_ranges?.maximum ?? null, h.geo?.latitude ?? null, h.geo?.longitude ?? null, h.merchandising_labels ?? []]);
    }
    // 중간 페이지가 덜 차서 오기도 해서, 빈 페이지가 연달아 나오거나 전체 개수를 넘을 때만 멈춘다
    empty = r.list.length ? 0 : empty + 1;
    if (empty >= 2 || (i + 1) * PAGE >= total) break;
    await sleep(1000);
  }
  const kept = rows.filter((h) => (h[3] ?? 0) >= MIN_RATING && (h[4] ?? 0) >= MIN_REVIEWS).sort((a, b) => b[4] - a[4]);
  result.regions[id] = { name, locationKey: loc, total, scanned: rows.length, ...(error ? { error } : {}), hotels: kept };
  console.log(`${name}(${loc}): 전체 ${total} → 기준 통과 ${kept.length}곳${error ? ` 오류 ${error}` : ""}`);
}

await mkdir(OUT_DIR, { recursive: true });
const file = `${OUT_DIR}/${now.toISOString().slice(0, 10)}.json`;
await writeFile(file, JSON.stringify(result));
console.log(`저장: ${file}`);
