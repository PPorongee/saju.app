// Precision V1 — 출생지역 데이터셋 (Phase 2).
//
// 정책:
//   - 정적 큐레이션 데이터. 외부 geocoding/네트워크 사용 금지.
//   - 대표 좌표(lat/lng)는 시·도청 또는 중심 도시 기준 — 태양시 보정(경도)·tz 판정에 충분.
//   - precision: region(국내 광역) | city(해외 도시) | country(국가 단위 fallback).
//   - 확장 가능: 배열에 항목 추가만 하면 됨. id/alias 중복 금지(테스트가 강제).

export type PlacePrecision = 'country' | 'region' | 'city';

export interface Place {
  id: string;
  labelKo: string;
  labelEn: string;
  countryCode: string;   // ISO-3166-1 alpha-2
  lat: number;
  lng: number;
  ianaTimeZone: string;
  precision: PlacePrecision;
  /** 추가 검색 별칭 (소문자). id/labelKo/labelEn은 resolver가 자동 매칭하므로 여기엔 그 외 별칭만. */
  aliases: string[];
}

// ============================================================
// 국내 17개 광역 시·도 (전부 Asia/Seoul, precision=region)
// ============================================================
const KR_REGIONS: Place[] = [
  { id: 'KR-11', labelKo: '서울', labelEn: 'Seoul', countryCode: 'KR', lat: 37.5665, lng: 126.9780, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['서울특별시', 'seoul-si'] },
  { id: 'KR-26', labelKo: '부산', labelEn: 'Busan', countryCode: 'KR', lat: 35.1796, lng: 129.0756, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['부산광역시', 'pusan'] },
  { id: 'KR-27', labelKo: '대구', labelEn: 'Daegu', countryCode: 'KR', lat: 35.8714, lng: 128.6014, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['대구광역시', 'taegu'] },
  { id: 'KR-28', labelKo: '인천', labelEn: 'Incheon', countryCode: 'KR', lat: 37.4563, lng: 126.7052, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['인천광역시', 'inchon'] },
  { id: 'KR-29', labelKo: '광주', labelEn: 'Gwangju', countryCode: 'KR', lat: 35.1595, lng: 126.8526, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['광주광역시', 'kwangju'] },
  { id: 'KR-30', labelKo: '대전', labelEn: 'Daejeon', countryCode: 'KR', lat: 36.3504, lng: 127.3845, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['대전광역시', 'taejon'] },
  { id: 'KR-31', labelKo: '울산', labelEn: 'Ulsan', countryCode: 'KR', lat: 35.5384, lng: 129.3114, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['울산광역시'] },
  { id: 'KR-50', labelKo: '세종', labelEn: 'Sejong', countryCode: 'KR', lat: 36.4800, lng: 127.2890, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['세종특별자치시', 'sejong-si'] },
  { id: 'KR-41', labelKo: '경기', labelEn: 'Gyeonggi', countryCode: 'KR', lat: 37.2636, lng: 127.0286, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['경기도', 'gyeonggi-do', 'suwon', '수원'] },
  { id: 'KR-42', labelKo: '강원', labelEn: 'Gangwon', countryCode: 'KR', lat: 37.8813, lng: 127.7298, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['강원도', 'gangwon-do', 'chuncheon', '춘천'] },
  { id: 'KR-43', labelKo: '충북', labelEn: 'Chungbuk', countryCode: 'KR', lat: 36.6357, lng: 127.4912, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['충청북도', 'chungcheongbuk-do', 'cheongju', '청주'] },
  { id: 'KR-44', labelKo: '충남', labelEn: 'Chungnam', countryCode: 'KR', lat: 36.6588, lng: 126.6728, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['충청남도', 'chungcheongnam-do'] },
  { id: 'KR-45', labelKo: '전북', labelEn: 'Jeonbuk', countryCode: 'KR', lat: 35.8203, lng: 127.1088, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['전라북도', 'jeollabuk-do', 'jeonju', '전주'] },
  { id: 'KR-46', labelKo: '전남', labelEn: 'Jeonnam', countryCode: 'KR', lat: 34.8161, lng: 126.4630, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['전라남도', 'jeollanam-do', 'muan', '무안'] },
  { id: 'KR-47', labelKo: '경북', labelEn: 'Gyeongbuk', countryCode: 'KR', lat: 36.5760, lng: 128.5056, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['경상북도', 'gyeongsangbuk-do', 'andong', '안동'] },
  { id: 'KR-48', labelKo: '경남', labelEn: 'Gyeongnam', countryCode: 'KR', lat: 35.2383, lng: 128.6924, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['경상남도', 'gyeongsangnam-do', 'changwon', '창원'] },
  { id: 'KR-49', labelKo: '제주', labelEn: 'Jeju', countryCode: 'KR', lat: 33.4996, lng: 126.5312, ianaTimeZone: 'Asia/Seoul', precision: 'region', aliases: ['제주특별자치도', 'jeju-do', 'jejudo'] },
];

// ============================================================
// 해외 주요 도시 (precision=city)
// ============================================================
const WORLD_CITIES: Place[] = [
  // North America
  { id: 'US-LAX', labelKo: '로스앤젤레스', labelEn: 'Los Angeles', countryCode: 'US', lat: 34.0522, lng: -118.2437, ianaTimeZone: 'America/Los_Angeles', precision: 'city', aliases: ['la', '엘에이'] },
  { id: 'US-NYC', labelKo: '뉴욕', labelEn: 'New York', countryCode: 'US', lat: 40.7128, lng: -74.0060, ianaTimeZone: 'America/New_York', precision: 'city', aliases: ['nyc', 'new york city'] },
  { id: 'US-CHI', labelKo: '시카고', labelEn: 'Chicago', countryCode: 'US', lat: 41.8781, lng: -87.6298, ianaTimeZone: 'America/Chicago', precision: 'city', aliases: [] },
  { id: 'US-SEA', labelKo: '시애틀', labelEn: 'Seattle', countryCode: 'US', lat: 47.6062, lng: -122.3321, ianaTimeZone: 'America/Los_Angeles', precision: 'city', aliases: [] },
  { id: 'US-SFO', labelKo: '샌프란시스코', labelEn: 'San Francisco', countryCode: 'US', lat: 37.7749, lng: -122.4194, ianaTimeZone: 'America/Los_Angeles', precision: 'city', aliases: ['sf'] },
  { id: 'US-HOU', labelKo: '휴스턴', labelEn: 'Houston', countryCode: 'US', lat: 29.7604, lng: -95.3698, ianaTimeZone: 'America/Chicago', precision: 'city', aliases: [] },
  { id: 'US-BOS', labelKo: '보스턴', labelEn: 'Boston', countryCode: 'US', lat: 42.3601, lng: -71.0589, ianaTimeZone: 'America/New_York', precision: 'city', aliases: [] },
  { id: 'US-DCA', labelKo: '워싱턴', labelEn: 'Washington', countryCode: 'US', lat: 38.9072, lng: -77.0369, ianaTimeZone: 'America/New_York', precision: 'city', aliases: ['washington dc', 'dc'] },
  { id: 'US-ATL', labelKo: '애틀랜타', labelEn: 'Atlanta', countryCode: 'US', lat: 33.7490, lng: -84.3880, ianaTimeZone: 'America/New_York', precision: 'city', aliases: [] },
  { id: 'US-DEN', labelKo: '덴버', labelEn: 'Denver', countryCode: 'US', lat: 39.7392, lng: -104.9903, ianaTimeZone: 'America/Denver', precision: 'city', aliases: [] },
  { id: 'US-PHX', labelKo: '피닉스', labelEn: 'Phoenix', countryCode: 'US', lat: 33.4484, lng: -112.0740, ianaTimeZone: 'America/Phoenix', precision: 'city', aliases: [] },
  { id: 'US-HNL', labelKo: '호놀룰루', labelEn: 'Honolulu', countryCode: 'US', lat: 21.3069, lng: -157.8583, ianaTimeZone: 'Pacific/Honolulu', precision: 'city', aliases: ['hawaii', '하와이'] },
  { id: 'CA-YVR', labelKo: '밴쿠버', labelEn: 'Vancouver', countryCode: 'CA', lat: 49.2827, lng: -123.1207, ianaTimeZone: 'America/Vancouver', precision: 'city', aliases: [] },
  { id: 'CA-YYZ', labelKo: '토론토', labelEn: 'Toronto', countryCode: 'CA', lat: 43.6532, lng: -79.3832, ianaTimeZone: 'America/Toronto', precision: 'city', aliases: [] },
  { id: 'CA-YUL', labelKo: '몬트리올', labelEn: 'Montreal', countryCode: 'CA', lat: 45.5017, lng: -73.5673, ianaTimeZone: 'America/Toronto', precision: 'city', aliases: [] },
  { id: 'MX-MEX', labelKo: '멕시코시티', labelEn: 'Mexico City', countryCode: 'MX', lat: 19.4326, lng: -99.1332, ianaTimeZone: 'America/Mexico_City', precision: 'city', aliases: [] },
  // South America
  { id: 'BR-SAO', labelKo: '상파울루', labelEn: 'Sao Paulo', countryCode: 'BR', lat: -23.5505, lng: -46.6333, ianaTimeZone: 'America/Sao_Paulo', precision: 'city', aliases: ['são paulo'] },
  { id: 'AR-BUE', labelKo: '부에노스아이레스', labelEn: 'Buenos Aires', countryCode: 'AR', lat: -34.6037, lng: -58.3816, ianaTimeZone: 'America/Argentina/Buenos_Aires', precision: 'city', aliases: [] },
  // Europe
  { id: 'GB-LON', labelKo: '런던', labelEn: 'London', countryCode: 'GB', lat: 51.5074, lng: -0.1278, ianaTimeZone: 'Europe/London', precision: 'city', aliases: [] },
  { id: 'FR-PAR', labelKo: '파리', labelEn: 'Paris', countryCode: 'FR', lat: 48.8566, lng: 2.3522, ianaTimeZone: 'Europe/Paris', precision: 'city', aliases: [] },
  { id: 'DE-BER', labelKo: '베를린', labelEn: 'Berlin', countryCode: 'DE', lat: 52.5200, lng: 13.4050, ianaTimeZone: 'Europe/Berlin', precision: 'city', aliases: [] },
  { id: 'DE-FRA', labelKo: '프랑크푸르트', labelEn: 'Frankfurt', countryCode: 'DE', lat: 50.1109, lng: 8.6821, ianaTimeZone: 'Europe/Berlin', precision: 'city', aliases: [] },
  { id: 'DE-MUC', labelKo: '뮌헨', labelEn: 'Munich', countryCode: 'DE', lat: 48.1351, lng: 11.5820, ianaTimeZone: 'Europe/Berlin', precision: 'city', aliases: ['münchen'] },
  { id: 'IT-ROM', labelKo: '로마', labelEn: 'Rome', countryCode: 'IT', lat: 41.9028, lng: 12.4964, ianaTimeZone: 'Europe/Rome', precision: 'city', aliases: ['roma'] },
  { id: 'ES-MAD', labelKo: '마드리드', labelEn: 'Madrid', countryCode: 'ES', lat: 40.4168, lng: -3.7038, ianaTimeZone: 'Europe/Madrid', precision: 'city', aliases: [] },
  { id: 'NL-AMS', labelKo: '암스테르담', labelEn: 'Amsterdam', countryCode: 'NL', lat: 52.3676, lng: 4.9041, ianaTimeZone: 'Europe/Amsterdam', precision: 'city', aliases: [] },
  { id: 'CH-ZRH', labelKo: '취리히', labelEn: 'Zurich', countryCode: 'CH', lat: 47.3769, lng: 8.5417, ianaTimeZone: 'Europe/Zurich', precision: 'city', aliases: ['zürich'] },
  { id: 'AT-VIE', labelKo: '빈', labelEn: 'Vienna', countryCode: 'AT', lat: 48.2082, lng: 16.3738, ianaTimeZone: 'Europe/Vienna', precision: 'city', aliases: ['wien'] },
  { id: 'RU-MOW', labelKo: '모스크바', labelEn: 'Moscow', countryCode: 'RU', lat: 55.7558, lng: 37.6173, ianaTimeZone: 'Europe/Moscow', precision: 'city', aliases: [] },
  { id: 'TR-IST', labelKo: '이스탄불', labelEn: 'Istanbul', countryCode: 'TR', lat: 41.0082, lng: 28.9784, ianaTimeZone: 'Europe/Istanbul', precision: 'city', aliases: [] },
  // Middle East / Africa
  { id: 'AE-DXB', labelKo: '두바이', labelEn: 'Dubai', countryCode: 'AE', lat: 25.2048, lng: 55.2708, ianaTimeZone: 'Asia/Dubai', precision: 'city', aliases: [] },
  { id: 'EG-CAI', labelKo: '카이로', labelEn: 'Cairo', countryCode: 'EG', lat: 30.0444, lng: 31.2357, ianaTimeZone: 'Africa/Cairo', precision: 'city', aliases: [] },
  // East Asia
  { id: 'JP-TYO', labelKo: '도쿄', labelEn: 'Tokyo', countryCode: 'JP', lat: 35.6762, lng: 139.6503, ianaTimeZone: 'Asia/Tokyo', precision: 'city', aliases: ['동경'] },
  { id: 'JP-OSA', labelKo: '오사카', labelEn: 'Osaka', countryCode: 'JP', lat: 34.6937, lng: 135.5023, ianaTimeZone: 'Asia/Tokyo', precision: 'city', aliases: [] },
  { id: 'CN-PEK', labelKo: '베이징', labelEn: 'Beijing', countryCode: 'CN', lat: 39.9042, lng: 116.4074, ianaTimeZone: 'Asia/Shanghai', precision: 'city', aliases: ['peking', '북경'] },
  { id: 'CN-SHA', labelKo: '상하이', labelEn: 'Shanghai', countryCode: 'CN', lat: 31.2304, lng: 121.4737, ianaTimeZone: 'Asia/Shanghai', precision: 'city', aliases: ['상해'] },
  { id: 'CN-CAN', labelKo: '광저우', labelEn: 'Guangzhou', countryCode: 'CN', lat: 23.1291, lng: 113.2644, ianaTimeZone: 'Asia/Shanghai', precision: 'city', aliases: ['canton'] },
  { id: 'CN-SZX', labelKo: '선전', labelEn: 'Shenzhen', countryCode: 'CN', lat: 22.5431, lng: 114.0579, ianaTimeZone: 'Asia/Shanghai', precision: 'city', aliases: [] },
  { id: 'HK-HKG', labelKo: '홍콩', labelEn: 'Hong Kong', countryCode: 'HK', lat: 22.3193, lng: 114.1694, ianaTimeZone: 'Asia/Hong_Kong', precision: 'city', aliases: ['hongkong'] },
  { id: 'TW-TPE', labelKo: '타이베이', labelEn: 'Taipei', countryCode: 'TW', lat: 25.0330, lng: 121.5654, ianaTimeZone: 'Asia/Taipei', precision: 'city', aliases: ['타이페이', '대북'] },
  // Southeast Asia
  { id: 'SG-SIN', labelKo: '싱가포르', labelEn: 'Singapore', countryCode: 'SG', lat: 1.3521, lng: 103.8198, ianaTimeZone: 'Asia/Singapore', precision: 'city', aliases: [] },
  { id: 'TH-BKK', labelKo: '방콕', labelEn: 'Bangkok', countryCode: 'TH', lat: 13.7563, lng: 100.5018, ianaTimeZone: 'Asia/Bangkok', precision: 'city', aliases: [] },
  { id: 'VN-HAN', labelKo: '하노이', labelEn: 'Hanoi', countryCode: 'VN', lat: 21.0278, lng: 105.8342, ianaTimeZone: 'Asia/Ho_Chi_Minh', precision: 'city', aliases: [] },
  { id: 'VN-SGN', labelKo: '호치민', labelEn: 'Ho Chi Minh City', countryCode: 'VN', lat: 10.8231, lng: 106.6297, ianaTimeZone: 'Asia/Ho_Chi_Minh', precision: 'city', aliases: ['saigon', '사이공'] },
  { id: 'PH-MNL', labelKo: '마닐라', labelEn: 'Manila', countryCode: 'PH', lat: 14.5995, lng: 120.9842, ianaTimeZone: 'Asia/Manila', precision: 'city', aliases: [] },
  { id: 'ID-JKT', labelKo: '자카르타', labelEn: 'Jakarta', countryCode: 'ID', lat: -6.2088, lng: 106.8456, ianaTimeZone: 'Asia/Jakarta', precision: 'city', aliases: [] },
  { id: 'MY-KUL', labelKo: '쿠알라룸푸르', labelEn: 'Kuala Lumpur', countryCode: 'MY', lat: 3.1390, lng: 101.6869, ianaTimeZone: 'Asia/Kuala_Lumpur', precision: 'city', aliases: ['kl'] },
  // South Asia
  { id: 'IN-BOM', labelKo: '뭄바이', labelEn: 'Mumbai', countryCode: 'IN', lat: 19.0760, lng: 72.8777, ianaTimeZone: 'Asia/Kolkata', precision: 'city', aliases: ['bombay'] },
  { id: 'IN-DEL', labelKo: '델리', labelEn: 'Delhi', countryCode: 'IN', lat: 28.7041, lng: 77.1025, ianaTimeZone: 'Asia/Kolkata', precision: 'city', aliases: ['new delhi', '뉴델리'] },
  // Oceania
  { id: 'AU-SYD', labelKo: '시드니', labelEn: 'Sydney', countryCode: 'AU', lat: -33.8688, lng: 151.2093, ianaTimeZone: 'Australia/Sydney', precision: 'city', aliases: [] },
  { id: 'AU-MEL', labelKo: '멜버른', labelEn: 'Melbourne', countryCode: 'AU', lat: -37.8136, lng: 144.9631, ianaTimeZone: 'Australia/Melbourne', precision: 'city', aliases: [] },
  { id: 'AU-BNE', labelKo: '브리즈번', labelEn: 'Brisbane', countryCode: 'AU', lat: -27.4698, lng: 153.0251, ianaTimeZone: 'Australia/Brisbane', precision: 'city', aliases: [] },
  { id: 'AU-PER', labelKo: '퍼스', labelEn: 'Perth', countryCode: 'AU', lat: -31.9505, lng: 115.8605, ianaTimeZone: 'Australia/Perth', precision: 'city', aliases: [] },
  { id: 'NZ-AKL', labelKo: '오클랜드', labelEn: 'Auckland', countryCode: 'NZ', lat: -36.8485, lng: 174.7633, ianaTimeZone: 'Pacific/Auckland', precision: 'city', aliases: [] },
];

// ============================================================
// 국가 단위 fallback (단일 표준시 국가만 — 도시 미지정 시).
//   다중 시간대 국가(US/CA/AU/RU/BR 등)는 country fallback 미제공 → 명시적 not-found.
// ============================================================
const COUNTRY_FALLBACKS: Place[] = [
  { id: 'C-JP', labelKo: '일본', labelEn: 'Japan', countryCode: 'JP', lat: 35.6762, lng: 139.6503, ianaTimeZone: 'Asia/Tokyo', precision: 'country', aliases: ['japan', 'jp'] },
  { id: 'C-CN', labelKo: '중국', labelEn: 'China', countryCode: 'CN', lat: 39.9042, lng: 116.4074, ianaTimeZone: 'Asia/Shanghai', precision: 'country', aliases: ['china', 'cn'] },
  { id: 'C-TW', labelKo: '대만', labelEn: 'Taiwan', countryCode: 'TW', lat: 25.0330, lng: 121.5654, ianaTimeZone: 'Asia/Taipei', precision: 'country', aliases: ['taiwan', 'tw'] },
  { id: 'C-HK', labelKo: '홍콩(지역)', labelEn: 'Hong Kong (region)', countryCode: 'HK', lat: 22.3193, lng: 114.1694, ianaTimeZone: 'Asia/Hong_Kong', precision: 'country', aliases: ['hk'] },
  { id: 'C-SG', labelKo: '싱가포르(국가)', labelEn: 'Singapore (country)', countryCode: 'SG', lat: 1.3521, lng: 103.8198, ianaTimeZone: 'Asia/Singapore', precision: 'country', aliases: ['sgp'] },
  { id: 'C-GB', labelKo: '영국', labelEn: 'United Kingdom', countryCode: 'GB', lat: 51.5074, lng: -0.1278, ianaTimeZone: 'Europe/London', precision: 'country', aliases: ['united kingdom', 'uk', 'gb', 'england', '잉글랜드'] },
  { id: 'C-FR', labelKo: '프랑스', labelEn: 'France', countryCode: 'FR', lat: 48.8566, lng: 2.3522, ianaTimeZone: 'Europe/Paris', precision: 'country', aliases: ['france', 'fr'] },
  { id: 'C-DE', labelKo: '독일', labelEn: 'Germany', countryCode: 'DE', lat: 52.5200, lng: 13.4050, ianaTimeZone: 'Europe/Berlin', precision: 'country', aliases: ['germany', 'de', 'deutschland'] },
  { id: 'C-TH', labelKo: '태국', labelEn: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018, ianaTimeZone: 'Asia/Bangkok', precision: 'country', aliases: ['thailand', 'th'] },
  { id: 'C-VN', labelKo: '베트남', labelEn: 'Vietnam', countryCode: 'VN', lat: 21.0278, lng: 105.8342, ianaTimeZone: 'Asia/Ho_Chi_Minh', precision: 'country', aliases: ['vietnam', 'vn'] },
  { id: 'C-PH', labelKo: '필리핀', labelEn: 'Philippines', countryCode: 'PH', lat: 14.5995, lng: 120.9842, ianaTimeZone: 'Asia/Manila', precision: 'country', aliases: ['philippines', 'ph'] },
  { id: 'C-ID', labelKo: '인도네시아', labelEn: 'Indonesia', countryCode: 'ID', lat: -6.2088, lng: 106.8456, ianaTimeZone: 'Asia/Jakarta', precision: 'country', aliases: ['indonesia', 'id'] },
  { id: 'C-AE', labelKo: '아랍에미리트', labelEn: 'United Arab Emirates', countryCode: 'AE', lat: 25.2048, lng: 55.2708, ianaTimeZone: 'Asia/Dubai', precision: 'country', aliases: ['uae', 'ae', '두바이(국가)'] },
];

export const PLACES: Place[] = [...KR_REGIONS, ...WORLD_CITIES, ...COUNTRY_FALLBACKS];
