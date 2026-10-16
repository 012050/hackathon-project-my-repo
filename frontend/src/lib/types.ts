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

export interface Nutrition {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  sodium: number;
}

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
  price?: number | null;
}

export interface ReceiptResult {
  ingredients: Ingredient[];
}

export interface HomeMenuRequest {
  ingredients: string[];
  lacking?: string[];
}

export interface HomeMenuResponse {
  menus: RecipeMenu[];
}

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
  type: PlaceType;
  eatMinutes: number;
  open: string;
  close: string;
  menus: Menu[];
}

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
}

export interface TimetableResponse {
  classes: ClassItem[];
}

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

export interface SchoolRecommendRequest {
  day: DayOfWeek;
  now: string; // "HH:MM"
}

export interface SchoolRecommendation {
  placeId: string;
  placeName: string;
  type: PlaceType;
  walkMinutes: number;
  arriveBy: string;
  reason?: string | null;
  menus: Menu[];
}

export interface SchoolRecommendResponse {
  day: string;
  now: string;
  slot: FreeSlot | null;
  recommendations: SchoolRecommendation[];
}

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

/** 메뉴 1개의 신호등 (한 끼 = DAILY_REFERENCES/3 기준, 백엔드 app/logic.py meal_lights_for 와 동일) */
export function menuLights(n: Nutrition): Lights {
  return {
    kcal: light(n.kcal, DAILY_REFERENCES.kcal / 3),
    carb: light(n.carb, DAILY_REFERENCES.carb / 3),
    protein: light(n.protein, DAILY_REFERENCES.protein / 3),
    fat: light(n.fat, DAILY_REFERENCES.fat / 3),
    sodium: light(n.sodium, DAILY_REFERENCES.sodium / 3),
  };
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
}
