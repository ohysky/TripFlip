// data 브랜치 prices/region-prices-날짜.json → src/data/worldPrices.ts
// 실행: git show origin/data:prices/region-prices-2026-10-30.json > /tmp/p.json && node scripts/build-world-prices.mjs /tmp/p.json
import { readFile, writeFile } from "node:fs/promises";

const src = JSON.parse(await readFile(process.argv[2], "utf8"));
// 세계은행에 없는 미국령은 미국 물가로 대체한다. 대만은 대체값이 없어 미확인.
const SUBSTITUTE = { "괌(미국령)": "미국", "북마리아나(사이판)": "미국" };
const level = {};
for (const [ko, c] of Object.entries(src.countries)) {
  const v = c.priceLevel ?? src.countries[SUBSTITUTE[ko]]?.priceLevel ?? null;
  if (v != null) level[ko] = v;
}
const hotel = {};
for (const [id, r] of Object.entries(src.regions)) if (r.medianUsd != null) hotel[id] = r.medianUsd;

const out = `// 생성 파일: scripts/build-world-prices.mjs 로 만든다. 손으로 고치지 말 것.
// 수집 ${src.collectedAt.slice(0, 10)}. 숙소 = ${src.source.hotels} (총점 ${src.filter.minRating}↑·리뷰 ${src.filter.minReviews}↑ 통과 5곳 이상만)
// 나라 물가 수준(미국=1) = ${src.source.country}. 괌·사이판은 미국 값으로 대체.

/** 1인 1일 식비 초안(USD, 미국 기준). 나라 물가 수준을 곱해 쓴다. 실측 전 임시값 */
export const FOOD_USD_US = 50;
export const COUNTRY_PRICE_LEVEL: Record<string, number> = ${JSON.stringify(level)};
/** 권역별 숙소 객실 1박 가격대 중간값(USD) */
export const HOTEL_MEDIAN_USD: Record<string, number> = ${JSON.stringify(hotel)};
`;
await writeFile(new URL("../src/data/worldPrices.ts", import.meta.url), out);
console.log(`나라 ${Object.keys(level).length}, 권역 숙소 ${Object.keys(hotel).length}`);
