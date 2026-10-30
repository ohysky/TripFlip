// 전 세계 권역 물가 재료를 주 1회 모은다 (0원).
// 1) 숙소: 위키데이터에서 거점 도시의 트립어드바이저 ID(P3134)를 찾고, Xotelo 목록에서 최소 품질 기준(4.5·리뷰300) 통과 숙소의 1박 가격대(USD) 중간값.
// 2) 나라 물가: 세계은행 WDI(CC BY 4.0) PPP 환산계수 ÷ 시장환율 = 물가 수준(미국=1).
import { readFile, writeFile, mkdir } from "node:fs/promises";

const OUT = process.argv[2] ?? "store/prices";
const UA = "TripFlip/0.1 (https://github.com/ohysky/TripFlip)";
const MIN_RATING = 4.5;
const MIN_REVIEWS = 300;
const PAGES = 3; // 리뷰 많은 순 상위 300곳만 본다 (호출 수 줄이기)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const km = (a, b, c, d) => {
  const t = Math.PI / 180;
  const x = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
};
const getJson = async (u) => {
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
};
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// 나라 이름 → ISO3 (세계은행)
const ISO3 = { 일본: "JPN", 베트남: "VNM", 중국: "CHN", 미국: "USA", 태국: "THA", 필리핀: "PHL", 대만: "TWN", 홍콩: "HKG", 싱가포르: "SGP", 마카오: "MAC", 인도네시아: "IDN", 스페인: "ESP", 말레이시아: "MYS", "괌(미국령)": "GUM", 호주: "AUS", 튀르키예: "TUR", 오스트리아: "AUT", 독일: "DEU", 몽골: "MNG", 캐나다: "CAN", 캄보디아: "KHM", 멕시코: "MEX", "북마리아나(사이판)": "MNP", 뉴질랜드: "NZL", 슬로베니아: "SVN", 몰디브: "MDV", 핀란드: "FIN", 도미니카공화국: "DOM", 남아프리카공화국: "ZAF", 스리랑카: "LKA", 보스니아: "BIH", 모리셔스: "MUS", 코스타리카: "CRI", 피지: "FJI", 팔라우: "PLW", 프랑스: "FRA", 이탈리아: "ITA", 영국: "GBR", 스위스: "CHE", 체코: "CZE", 라오스: "LAO", 크로아티아: "HRV", 포르투갈: "PRT", 그리스: "GRC", 헝가리: "HUN", 네덜란드: "NLD", 아랍에미리트: "ARE", 우즈베키스탄: "UZB", 카자흐스탄: "KAZ", 이집트: "EGY" };

async function wbLatest(indicator) {
  const j = await getJson(`https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&mrv=6&per_page=20000`);
  const out = {};
  for (const r of j[1] ?? []) if (r.value != null && !out[r.countryiso3code]) out[r.countryiso3code] = { v: r.value, year: +r.date };
  return out;
}

async function tripadvisorGeo(name, lat, lon) {
  const s = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=8&search=${encodeURIComponent(name)}`);
  const ids = s.search.map((x) => x.id);
  if (!ids.length) return null;
  const e = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${ids.join("|")}`);
  let best = null;
  const seen = [];
  for (const [id, it] of Object.entries(e.entities)) {
    // 값이 "g298184" 또는 "Tourism-g298184-Tokyo..." 꼴로 섞여 있다. 장소(-d숫자)가 아닌 지역 키만 쓴다.
    const raw = it.claims?.P3134?.map((c) => c.mainsnak?.datavalue?.value ?? "") ?? [];
    const ta = raw.filter((v) => !/-d\d+/.test(v)).map((v) => v.match(/(?:^|-)(g\d+)(?:-|$)/)?.[1]).find(Boolean);
    const c = it.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    seen.push({ id, p3134: raw.slice(0, 3), km: c ? Math.round(km(lat, lon, c.latitude, c.longitude)) : null });
    if (!ta || !c) continue;
    const d = km(lat, lon, c.latitude, c.longitude);
    if (d < 60 && (!best || d < best.km)) best = { qid: id, ta, km: Math.round(d) };
  }
  return best ?? { seen };
}

async function hotels(loc) {
  const prices = [];
  let scanned = 0;
  for (let i = 0; i < PAGES; i++) {
    const r = await fetch(`https://data.xotelo.com/api/list?location_key=${loc}&limit=100&offset=${i * 100}&sort=popularity`);
    const b = await r.json().catch(() => ({}));
    if (!r.ok || b.error) throw new Error(`xotelo ${r.status}`);
    const list = b.result?.list ?? [];
    scanned += list.length;
    for (const h of list) {
      const ok = (h.review_summary?.rating ?? 0) >= MIN_RATING && (h.review_summary?.count ?? 0) >= MIN_REVIEWS;
      const lo = h.price_ranges?.minimum, hi = h.price_ranges?.maximum;
      if (ok && lo > 0 && hi > 0) prices.push((lo + hi) / 2);
    }
    if (list.length < 100) break;
    await sleep(1500);
  }
  return { scanned, passed: prices.length, medianUsd: median(prices) && Math.round(median(prices)) };
}

const regions = JSON.parse(await readFile(new URL("./world-regions.json", import.meta.url), "utf8"));
const centers = JSON.parse(await readFile(new URL("./region-centers.json", import.meta.url), "utf8"));
const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

const ppp = await wbLatest("PA.NUS.PPP");
const fx = await wbLatest("PA.NUS.FCRF");
const countries = {};
for (const [ko, iso] of Object.entries(ISO3)) {
  const p = ppp[iso], f = fx[iso];
  // 달러 사용 지역(괌·사이판 등)은 환율 1로 본다
  const rate = f?.v ?? (["GUM", "MNP", "PLW"].includes(iso) ? 1 : null);
  countries[ko] = p && rate ? { iso, priceLevel: +(p.v / rate).toFixed(3), year: p.year } : { iso, priceLevel: null };
}

const out = {};
for (const reg of regions) {
  if (only && !only.has(reg.id)) continue;
  const c = centers[reg.id];
  const row = { country: reg.country };
  try {
    const g = await tripadvisorGeo(reg.query.split(",")[0], c.lat, c.lon);
    await sleep(500);
    if (g?.ta) Object.assign(row, { tripadvisor: g.ta }, await hotels(g.ta));
    else Object.assign(row, { error: "tripadvisor id 없음", debug: g?.seen });
  } catch (e) {
    row.error = String(e);
  }
  out[reg.id] = row;
  console.log(reg.id, JSON.stringify(row));
  await sleep(2000);
}
await mkdir(OUT, { recursive: true });
const file = `${OUT}/region-prices-${new Date().toISOString().slice(0, 10)}.json`;
await writeFile(file, JSON.stringify({ collectedAt: new Date().toISOString(), source: { hotels: "Xotelo(트립어드바이저 기반, 비공식) 1박 가격대 USD 중간값", country: "World Bank WDI PA.NUS.PPP ÷ PA.NUS.FCRF (CC BY 4.0)" }, filter: { minRating: MIN_RATING, minReviews: MIN_REVIEWS }, countries, regions: out }));
console.log("saved", file);
