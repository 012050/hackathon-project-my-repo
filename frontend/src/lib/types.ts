<<<<<<< HEAD
// =====================================================
// 공통 데이터 양식 — 백엔드 backend/app/models.py 와 1:1로 같음
// 필드를 바꿀 땐 반드시 두 파일을 같이 바꾸고, 팀원에게 알리기
// 규칙: camelCase / 시간 "HH:MM" / 날짜 "YYYY-MM-DD"
// 단위: kcal, g(carb·protein·fat), mg(sodium)
// =====================================================

// ---------- 공통 ----------
export type MenuSource = "home" | "school";
export type Day = "월" | "화" | "수" | "목" | "금";
export type PlaceType = "편의점" | "학생식당" | "식당" | "카페";
export type Light = "green" | "yellow" | "red";
export type NutrientKey = "kcal" | "carb" | "protein" | "fat" | "sodium";
=======
export type DayOfWeek = "월" | "화" | "수" | "목" | "금";
export type Source = "home" | "school";
export type PlaceType = "student_dining" | "restaurant" | "cafe" | "convenience";
export type Light = "green" | "yellow" | "red";

/** 식약처 1일 영양성분 기준치 (2000kcal). 단위: kcal / g / mg. */
export const DAILY_REFERENCES = {
  kcal: 2000,
  carb: 324,
  protein: 55,
  fat: 54,
  sodium: 2000,
} as const;

export type NutrientKey = keyof typeof DAILY_REFERENCES;
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)

export interface Nutrition {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  sodium: number;
}

<<<<<<< HEAD
export interface Menu extends Nutrition {
  id: string;
  name: string;
  source: MenuSource;
  price?: number | null; // 원
  estimated: boolean;    // true면 화면에 "추정" 표시
  placeId?: string | null; // school 메뉴면 식당 id (예: "F01")
}

export type Lights = Record<NutrientKey, Light>;

// ---------- 🅰️ 영수증 파트 ----------
export interface Ingredient {
  name: string;
  qty: number;
  unit: string;
=======
/** 공통 메뉴 형식. 집·학교 모두 이 형식, source만 home / school. */
export interface Menu {
  id?: string;
  name: string;
  source: Source;
  placeId?: string;
  price?: number;
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  sodium: number;
  estimated?: boolean;
  minutes?: number;
  ingredientsUsed?: string[];
  steps?: string[];
}

export type RecipeMenu = Menu & {
  minutes: number;
  ingredientsUsed: string[];
  steps: string[];
};

export interface Ingredient {
  name: string;
  qty?: number | null;
  unit?: string | null;
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
  price?: number | null;
}

export interface ReceiptResult {
  ingredients: Ingredient[];
}

<<<<<<< HEAD
export interface RecipeMenu extends Menu {
  source: "home";
  minutes: number;
  ingredientsUsed: string[];
  steps: string[];
}

export interface HomeMenuRequest {
  ingredients: Ingredient[];  // 1개 이상
  lacking?: NutrientKey[];    // 하루 합계의 lacking 을 그대로 넣기
=======
export interface HomeMenuRequest {
  ingredients: string[];
  lacking?: string[];
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
}

export interface HomeMenuResponse {
  menus: RecipeMenu[];
}

<<<<<<< HEAD
// ---------- 🅱️ 학교 파트 ----------
export interface Building {
  id: number; // 0 = 정문
  name: string;
  x: number;  // 캠퍼스맵 이미지 픽셀 좌표 (1000x680)
  y: number;
}

export interface ClassItem {
  day: Day;
  start: string;
  end: string;
  name: string;
  room: string;
  building: number;
}

export interface FoodPlace {
  id: string;
  name: string;
  building: number;
  floor: string;
=======
export interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface FoodPlace {
  id: string;
  name: string;
  building: string;
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
  type: PlaceType;
  eatMinutes: number;
  open: string;
  close: string;
  menus: Menu[];
}

<<<<<<< HEAD
export interface FreeSlot {
  day: Day;
  start: string;
  end: string;
  minutes: number;
  fromBuilding: number;
  toBuilding: number;
}

export interface CampusResponse {
  buildings: Building[];
  foodPlaces: FoodPlace[];
=======
export interface CampusResponse {
  buildings: Building[];
  foodPlaces: FoodPlace[];
  walkOverrides: Record<string, number>;
}

export interface ClassItem {
  day: DayOfWeek;
  start: string;
  end: string;
  room: string;
  building: string;
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
}

export interface TimetableResponse {
  classes: ClassItem[];
}

<<<<<<< HEAD
export interface SlotsResponse {
  day: Day;
  slots: FreeSlot[];
  lunchWarning?: string | null;
}

export interface SchoolRecommendRequest {
  day: Day;
  now: string; // "HH:MM"
}

export interface PlaceRecommendation {
  placeId: string;
  placeName: string;
  type: PlaceType;
  building: number;
  walkMinutes: number;  // 편도
  totalMinutes: number; // 가서 먹고 다음 수업 건물까지(여유 5분 포함)
  leaveBy: string;      // 늦어도 이 시간엔 출발
=======
export interface FreeSlot {
  start: string;
  end: string;
  minutes: number;
  fromBuilding?: string | null;
  toBuilding?: string | null;
}

export interface SlotsResponse {
  day: string;
  slots: FreeSlot[];
  lunchWarning: boolean;
}

export interface SchoolRecommendation {
  placeId: string;
  placeName: string;
  type: PlaceType;
  walkMinutes: number;
  arriveBy: string;
  reason?: string | null;
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
  menus: Menu[];
}

export interface SchoolRecommendResponse {
<<<<<<< HEAD
  day: Day;
  now: string;
  slot?: FreeSlot | null;
  availableMinutes: number;
  lunchWarning?: string | null;
  message: string;
  recommendations: PlaceRecommendation[]; // 최대 3개, 비어 있을 수 있음
}

// ---------- 공통: [먹었어요] & 하루 합계 (서버에 저장) ----------
=======
  day: string;
  now: string;
  slot: FreeSlot | null;
  recommendations: SchoolRecommendation[];
}

>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
export interface MealLogCreate {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  menu: Menu;
}

export interface MealLog extends MealLogCreate {
  id: string;
}

export interface MealListResponse {
  meals: MealLog[];
}

<<<<<<< HEAD
export interface DailySummary {
  date: string;
  total: Nutrition;
  lights: Lights;
  lacking: NutrientKey[]; // → HomeMenuRequest.lacking 에 그대로
}

export interface HealthResponse {
  status: "ok";
  mock: boolean; // true면 AI 대신 예시 데이터로 응답 중
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// ---------- 영양 기준 & 신호등 (백엔드 nutrition.py 와 같은 규칙) ----------
export const DAILY: Nutrition = { kcal: 2000, carb: 324, protein: 55, fat: 54, sodium: 2000 };

export const PER_MEAL: Nutrition = {
  kcal: DAILY.kcal / 3,
  carb: DAILY.carb / 3,
  protein: DAILY.protein / 3,
  fat: DAILY.fat / 3,
  sodium: DAILY.sodium / 3,
};

export function light(key: NutrientKey, value: number, target: number): Light {
  const r = target ? value / target : 0;
  if (key === "protein") return r >= 1 ? "green" : r >= 0.5 ? "yellow" : "red";
  if (key === "sodium") return r <= 1 ? "green" : r <= 1.5 ? "yellow" : "red";
  if (r >= 0.7 && r <= 1.3) return "green";
  if (r >= 0.5 && r <= 1.5) return "yellow";
  return "red";
}

/** 메뉴 1개의 신호등 (한 끼 기준) */
export function menuLights(n: Nutrition): Lights {
  const keys: NutrientKey[] = ["kcal", "carb", "protein", "fat", "sodium"];
  return Object.fromEntries(keys.map((k) => [k, light(k, n[k], PER_MEAL[k])])) as Lights;
=======
export interface Lights {
  kcal: Light;
  carb: Light;
  protein: Light;
  fat: Light;
  sodium: Light;
}

export interface DailySummary {
  date: string;
  count: number;
  total: Nutrition;
  lights: Lights;
  lacking: string[];
}

export interface HealthResponse {
  status: string;
  mock: boolean;
}

/**
 * 신호등: 기준치(한 끼는 DAILY_REFERENCES/3) 대비 비율
 * 80~120%: green / 50~80% or 120~150%: yellow / 그 외: red
 * (백엔드 app/logic.py light_for 와 동일)
 */
export function light(value: number, reference: number): Light {
  if (reference <= 0) return "green";
  const ratio = value / reference;
  if (ratio >= 0.8 && ratio <= 1.2) return "green";
  if ((ratio >= 0.5 && ratio < 0.8) || (ratio > 1.2 && ratio <= 1.5)) return "yellow";
  return "red";
}

/** "HH:MM" (현지 시각) */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" (현지 시각) */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 오늘 요일 "월"~"금". 주말은 null (학교 탭에 "오늘은 수업이 없어요" 표시) */
export function todayDay(): DayOfWeek | null {
  const dow = new Date().getDay();
  if (dow === 0 || dow === 6) return null;
  return ["월", "화", "수", "목", "금"][dow - 1] as DayOfWeek;
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
}
