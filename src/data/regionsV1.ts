// 권역 추천 정의서 V1 시범 데이터 (나트랑·홍콩).
// 원본: /mnt/project-files/tripflip-data/pilot-nhatrang-hongkong.xlsx
// 등급(grade)은 한국어 후기 판정 전 임시값(TEMP_GRADE)이다. 실제 후기 등급으로 교체할 것.
// 날씨·먼 당일 명소 이동시간은 출처 있는 값, 시내 장소는 "2시간 이하" 구간으로만 둔다.

export type Concept = "관광" | "휴양" | "액티비티" | "미식" | "쇼핑";
export type Grade = "S" | "A" | "B" | "C" | "D";
export type WeatherJudge = "좋음" | "보통" | "스콜성 우기" | "지속형 우기" | "혹서기";

export const CONCEPTS: Concept[] = ["관광", "휴양", "액티비티", "미식", "쇼핑"];
export const GRADE_SCORE: Record<Grade, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
export const TEMP_GRADE = true;

export interface RegionV1 {
  id: string;
  name: string;
  country: string;
  base: string;
  airport: string;
  airportToBase: string;
  priceLevel: null; // 숙소·식비 실데이터 전이라 미확인
  tone: string;
}

export interface PlaceV1 {
  id: string;
  region: string;
  name: string;
  en: string;
  concepts: Concept[];
  tags: string[];
  travel: string; // 거점 → 장소 편도
  penalty: 0 | 0.5 | 1;
  grade: Grade; // 임시
  adultOnly?: "check"; // 미성년 동반 시 확인 필요
  longWalk?: boolean;
  steep?: boolean | null; // null = 확인 필요
  note?: string;
}

export interface MonthWeather {
  tmax: number;
  rainDays: number;
  sunHours: number; // 월 합계
}

export const REGIONS_V1: RegionV1[] = [
  { id: "NT", name: "나트랑", country: "베트남", base: "나트랑 시내(쩐푸 해변 일대)", airport: "깜라인 국제공항", airportToBase: "택시 45~60분", priceLevel: null, tone: "linear-gradient(135deg,#00ACB8,#5fd3c8)" },
  { id: "HK", name: "홍콩", country: "홍콩", base: "홍콩 도심(센트럴·침사추이)", airport: "홍콩 국제공항", airportToBase: "공항철도 24분", priceLevel: null, tone: "linear-gradient(135deg,#102F54,#3d6aa1)" },
];

const CITY = "2시간 이하";

export const PLACES_V1: PlaceV1[] = [
  // 나트랑
  { id: "nt-ponagar", region: "NT", name: "포나가르 참탑", en: "Po Nagar Cham Towers", concepts: ["관광"], tags: ["역사·문화"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-longson", region: "NT", name: "롱선사", en: "Long Son Pagoda", concepts: ["관광"], tags: ["역사·문화"], travel: CITY, penalty: 0, grade: "C", note: "좌불까지 계단" },
  { id: "nt-cathedral", region: "NT", name: "나트랑 대성당", en: "Nha Trang Cathedral", concepts: ["관광"], tags: ["역사·문화", "사진촬영"], travel: CITY, penalty: 0, grade: "C" },
  { id: "nt-honchong", region: "NT", name: "혼쫑 곶", en: "Hon Chong Promontory", concepts: ["관광"], tags: ["자연경관", "사진촬영"], travel: CITY, penalty: 0, grade: "C" },
  { id: "nt-nightmarket", region: "NT", name: "나트랑 야시장", en: "Nha Trang Night Market", concepts: ["관광", "쇼핑"], tags: ["야경·야시장", "시장"], travel: CITY, penalty: 0, grade: "C" },
  { id: "nt-vinwonders", region: "NT", name: "빈원더스 나트랑", en: "VinWonders Nha Trang", concepts: ["관광"], tags: ["테마파크"], travel: "케이블카 8~10분", penalty: 0, grade: "A", note: "놀이기구별 키 제한 별도" },
  { id: "nt-beach", region: "NT", name: "나트랑 해변(쩐푸)", en: "Tran Phu Beach", concepts: ["휴양"], tags: ["해변·섬"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-honmun", region: "NT", name: "혼문섬 스노클링", en: "Hon Mun Marine Park", concepts: ["액티비티"], tags: ["해양"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-islands", region: "NT", name: "나트랑 4섬 투어", en: "Island Hopping", concepts: ["휴양"], tags: ["해변·섬"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-thapba", region: "NT", name: "탑바 온천 머드배스", en: "Thap Ba Hot Spring", concepts: ["휴양"], tags: ["온천", "마사지·스파"], travel: CITY, penalty: 0, grade: "A" },
  { id: "nt-iresort", region: "NT", name: "아이리조트 머드배스", en: "I-Resort", concepts: ["휴양"], tags: ["온천", "마사지·스파"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-dam", region: "NT", name: "쩌담 시장", en: "Dam Market", concepts: ["쇼핑"], tags: ["시장"], travel: CITY, penalty: 0, grade: "C" },
  { id: "nt-baho", region: "NT", name: "바호 폭포", en: "Ba Ho Waterfalls", concepts: ["관광", "액티비티"], tags: ["자연경관", "트레킹·하이킹"], travel: CITY, penalty: 0, grade: "C", steep: true },
  { id: "nt-yangbay", region: "NT", name: "양베이 폭포", en: "Yang Bay Waterfall", concepts: ["관광"], tags: ["자연경관"], travel: CITY, penalty: 0, grade: "C" },
  { id: "nt-baidai", region: "NT", name: "바이다이 해변", en: "Bai Dai Beach", concepts: ["휴양"], tags: ["해변·섬"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-doclet", region: "NT", name: "독렛 해변", en: "Doc Let Beach", concepts: ["휴양"], tags: ["해변·섬"], travel: CITY, penalty: 0, grade: "C" },
  { id: "nt-kngolf", region: "NT", name: "KN 골프링크스 깜라인", en: "KN Golf Links", concepts: ["액티비티"], tags: ["골프"], travel: CITY, penalty: 0, grade: "A" },
  { id: "nt-vingolf", region: "NT", name: "빈펄 골프 나트랑", en: "Vinpearl Golf", concepts: ["액티비티"], tags: ["골프"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-laccanh", region: "NT", name: "락깐 (숯불구이)", en: "Lac Canh", concepts: ["미식"], tags: ["로컬푸드"], travel: CITY, penalty: 0, grade: "B" },
  { id: "nt-namcuong", region: "NT", name: "판랑 남끄엉 사막", en: "Nam Cuong Sand Dunes", concepts: ["관광"], tags: ["자연경관", "사진촬영"], travel: "약 2시간+", penalty: 0.5, grade: "B" },
  { id: "nt-poklong", region: "NT", name: "포클롱가라이 참탑", en: "Po Klong Garai", concepts: ["관광"], tags: ["역사·문화"], travel: "약 2시간+", penalty: 0.5, grade: "C" },
  { id: "nt-dalat", region: "NT", name: "달랏 쑤언흐엉 호수·시내", en: "Da Lat", concepts: ["관광"], tags: ["자연경관", "핫플"], travel: "3.5~4.5시간", penalty: 1, grade: "A", note: "10~12월 산사태 통제 가능" },
  // 홍콩
  { id: "hk-peak", region: "HK", name: "빅토리아 피크", en: "Victoria Peak", concepts: ["관광"], tags: ["명소", "야경·야시장"], travel: CITY, penalty: 0, grade: "A" },
  { id: "hk-tst", region: "HK", name: "침사추이 산책로·심포니 오브 라이트", en: "TST Promenade", concepts: ["관광"], tags: ["야경·야시장", "사진촬영"], travel: CITY, penalty: 0, grade: "A" },
  { id: "hk-starferry", region: "HK", name: "스타페리", en: "Star Ferry", concepts: ["관광"], tags: ["명소"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-disney", region: "HK", name: "홍콩 디즈니랜드", en: "Hong Kong Disneyland", concepts: ["관광"], tags: ["테마파크"], travel: CITY, penalty: 0, grade: "A", note: "놀이기구별 키 제한 별도" },
  { id: "hk-oceanpark", region: "HK", name: "오션파크", en: "Ocean Park", concepts: ["관광"], tags: ["테마파크"], travel: CITY, penalty: 0, grade: "B", note: "놀이기구별 키 제한 별도" },
  { id: "hk-ngongping", region: "HK", name: "옹핑 360·천단대불", en: "Ngong Ping 360", concepts: ["관광"], tags: ["명소", "역사·문화"], travel: CITY, penalty: 0, grade: "A", steep: null },
  { id: "hk-taio", region: "HK", name: "타이오 어촌", en: "Tai O", concepts: ["관광"], tags: ["역사·문화", "사진촬영"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-manmo", region: "HK", name: "만모사원", en: "Man Mo Temple", concepts: ["관광"], tags: ["역사·문화"], travel: CITY, penalty: 0, grade: "C" },
  { id: "hk-wongtaisin", region: "HK", name: "웡타이신 사원", en: "Wong Tai Sin Temple", concepts: ["관광"], tags: ["역사·문화"], travel: CITY, penalty: 0, grade: "C" },
  { id: "hk-mplus", region: "HK", name: "M+ 박물관", en: "M+", concepts: ["관광"], tags: ["역사·문화"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-palace", region: "HK", name: "홍콩 고궁박물관", en: "Hong Kong Palace Museum", concepts: ["관광"], tags: ["역사·문화"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-temple", region: "HK", name: "템플 스트리트 야시장", en: "Temple Street", concepts: ["관광", "쇼핑"], tags: ["야경·야시장", "시장"], travel: CITY, penalty: 0, grade: "C" },
  { id: "hk-ladies", region: "HK", name: "레이디스 마켓", en: "Ladies' Market", concepts: ["쇼핑"], tags: ["시장"], travel: CITY, penalty: 0, grade: "C" },
  { id: "hk-midlevels", region: "HK", name: "미드레벨 에스컬레이터·소호", en: "Mid-Levels / SoHo", concepts: ["관광"], tags: ["핫플", "사진촬영"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-repulse", region: "HK", name: "리펄스 베이", en: "Repulse Bay", concepts: ["휴양"], tags: ["해변·섬"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-stanley", region: "HK", name: "스탠리", en: "Stanley", concepts: ["관광", "휴양"], tags: ["핫플", "해변·섬"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-dragonsback", region: "HK", name: "드래곤스 백", en: "Dragon's Back", concepts: ["액티비티"], tags: ["트레킹·하이킹"], travel: CITY, penalty: 0, grade: "B", longWalk: true },
  { id: "hk-lantaupeak", region: "HK", name: "란타우 피크", en: "Lantau Peak", concepts: ["액티비티"], tags: ["트레킹·하이킹"], travel: CITY, penalty: 0, grade: "C", longWalk: true, steep: true },
  { id: "hk-saikung", region: "HK", name: "사이쿵 지질공원", en: "Sai Kung Geopark", concepts: ["관광"], tags: ["자연경관"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-harbourcity", region: "HK", name: "하버시티", en: "Harbour City", concepts: ["쇼핑"], tags: ["쇼핑몰·아웃렛"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-citygate", region: "HK", name: "시티게이트 아웃렛", en: "Citygate Outlets", concepts: ["쇼핑"], tags: ["쇼핑몰·아웃렛"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-lkf", region: "HK", name: "란콰이퐁", en: "Lan Kwai Fong", concepts: ["관광"], tags: ["핫플"], travel: CITY, penalty: 0, grade: "B", adultOnly: "check" },
  { id: "hk-kaukee", region: "HK", name: "카우키 (소고기 국수)", en: "Kau Kee", concepts: ["미식"], tags: ["로컬푸드"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-lanfong", region: "HK", name: "란퐁유엔 (밀크티)", en: "Lan Fong Yuen", concepts: ["미식"], tags: ["카페·디저트"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-timhowan", region: "HK", name: "팀호완 (딤섬)", en: "Tim Ho Wan", concepts: ["미식"], tags: ["맛집"], travel: CITY, penalty: 0, grade: "B" },
  { id: "hk-senado", region: "HK", name: "마카오 세나도 광장·성 바울 성당 유적", en: "Senado Square", concepts: ["관광"], tags: ["역사·문화", "사진촬영"], travel: "페리 약 1시간", penalty: 0, grade: "A" },
  { id: "hk-venetian", region: "HK", name: "베네시안 마카오", en: "The Venetian Macao", concepts: ["쇼핑", "관광"], tags: ["쇼핑몰·아웃렛", "핫플"], travel: "페리 약 1시간", penalty: 0, grade: "B" },
  { id: "hk-macautower", region: "HK", name: "마카오 타워", en: "Macau Tower", concepts: ["관광"], tags: ["명소", "야경·야시장"], travel: "페리 약 1시간", penalty: 0, grade: "B" },
  { id: "hk-coloane", region: "HK", name: "콜로안 빌리지", en: "Coloane Village", concepts: ["관광"], tags: ["사진촬영", "핫플"], travel: "페리 약 1시간", penalty: 0, grade: "C" },
];

// 월별 평년값. 나트랑: Wikipedia(베트남 건설과학기술원, 기준 기간 미확인) / 홍콩: HKO 1991–2020
export const WEATHER_V1: Record<string, { source: string; months: Record<number, MonthWeather> }> = {
  NT: {
    source: "Wikipedia · 기준 기간 미확인",
    months: {
      1: { tmax: 27.2, rainDays: 8.6, sunHours: 179.6 }, 2: { tmax: 28.0, rainDays: 4.3, sunHours: 208.7 },
      3: { tmax: 29.4, rainDays: 4.1, sunHours: 256.5 }, 4: { tmax: 31.1, rainDays: 5.0, sunHours: 258.5 },
      5: { tmax: 32.3, rainDays: 9.2, sunHours: 259.1 }, 6: { tmax: 32.7, rainDays: 8.3, sunHours: 235.2 },
      7: { tmax: 32.5, rainDays: 8.4, sunHours: 243.5 }, 8: { tmax: 32.6, rainDays: 9.8, sunHours: 236.0 },
      9: { tmax: 31.7, rainDays: 14.4, sunHours: 203.8 }, 10: { tmax: 30.0, rainDays: 17.6, sunHours: 183.1 },
      11: { tmax: 28.6, rainDays: 18.0, sunHours: 140.4 }, 12: { tmax: 27.3, rainDays: 14.4, sunHours: 136.5 },
    },
  },
  HK: {
    source: "홍콩 천문대 1991–2020",
    months: {
      1: { tmax: 18.7, rainDays: 5.7, sunHours: 145.8 }, 2: { tmax: 19.4, rainDays: 7.97, sunHours: 101.7 },
      3: { tmax: 21.9, rainDays: 10.5, sunHours: 100.0 }, 4: { tmax: 25.6, rainDays: 11.37, sunHours: 113.2 },
      5: { tmax: 28.8, rainDays: 15.37, sunHours: 138.8 }, 6: { tmax: 30.7, rainDays: 19.33, sunHours: 144.3 },
      7: { tmax: 31.6, rainDays: 18.43, sunHours: 197.3 }, 8: { tmax: 31.3, rainDays: 17.5, sunHours: 182.1 },
      9: { tmax: 30.5, rainDays: 14.9, sunHours: 174.4 }, 10: { tmax: 28.1, rainDays: 7.83, sunHours: 197.8 },
      11: { tmax: 24.5, rainDays: 5.7, sunHours: 172.3 }, 12: { tmax: 20.4, rainDays: 5.3, sunHours: 161.6 },
    },
  },
};
