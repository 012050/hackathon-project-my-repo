<<<<<<< HEAD
// =====================================================
// 백엔드 호출은 전부 이 파일의 함수만 사용 (fetch 직접 쓰지 않기)
// 주소: .env.local 에  NEXT_PUBLIC_API_URL=http://localhost:8000
// 같은 와이파이의 다른 노트북 서버라면  http://<그 노트북 IP>:8000
// =====================================================
import type {
  ApiErrorBody, CampusResponse, DailySummary, Day, HealthResponse, HomeMenuRequest,
  HomeMenuResponse, MealListResponse, MealLog, MealLogCreate, ReceiptResult,
  SchoolRecommendResponse, SlotsResponse, TimetableResponse,
} from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** 서버가 준 에러를 그대로 들고 있음. 화면엔 e.message 를 보여주면 됨 */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
=======
import type {
  CampusResponse,
  DailySummary,
  DayOfWeek,
  HealthResponse,
  HomeMenuRequest,
  HomeMenuResponse,
  Lights,
  MealListResponse,
  MealLog,
  MealLogCreate,
  Nutrition,
  ReceiptResult,
  SchoolRecommendResponse,
  SlotsResponse,
  TimetableResponse,
} from "./types";

// types.ts 헬퍼 재export (api.ts에서 한 번에 import하게 함)
export { nowHHMM, today, todayDay, light, DAILY_REFERENCES } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
<<<<<<< HEAD
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError(0, "network_error", "서버에 연결할 수 없어요. 백엔드가 켜져 있는지 확인해 주세요.");
=======
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError("network_error", "서버가 꺼져 있어요. 백엔드가 실행 중인지 확인해 주세요.", 0);
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
<<<<<<< HEAD
    const e = (body as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, e?.code ?? "unknown", e?.message ?? `요청 실패 (${res.status})`);
=======
    const err = body?.error;
    throw new ApiError(err?.code ?? "http_error", err?.message ?? `요청에 실패했어요 (${res.status})`, res.status);
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
  }
  return body as T;
}

<<<<<<< HEAD
const json = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// ---------- 공통 ----------
export const getHealth = () => request<HealthResponse>("/api/health");

// ---------- 🅰️ 영수증 파트 ----------
/** <input type="file"> 로 받은 이미지. Content-Type 은 직접 넣지 말 것(브라우저가 자동으로 넣음) */
export function uploadReceipt(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<ReceiptResult>("/api/receipt", { method: "POST", body: form });
}

export const getHomeMenus = (req: HomeMenuRequest) =>
  request<HomeMenuResponse>("/api/menus/home", json(req));

// ---------- 🅱️ 학교 파트 ----------
export const getCampus = () => request<CampusResponse>("/api/campus");
export const getTimetable = () => request<TimetableResponse>("/api/timetable");
export const getSlots = (day: Day) =>
  request<SlotsResponse>(`/api/school/slots?day=${encodeURIComponent(day)}`);
export const getSchoolRecommend = (day: Day, now: string) =>
  request<SchoolRecommendResponse>("/api/school/recommend", json({ day, now }));

// ---------- 공통: [먹었어요] & 하루 합계 ----------
export const addMeal = (meal: MealLogCreate) => request<MealLog>("/api/meals", json(meal));
export const getMeals = (date: string) => request<MealListResponse>(`/api/meals?date=${date}`);
export const deleteMeal = (id: string) =>
  request<void>(`/api/meals/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getSummary = (date: string) => request<DailySummary>(`/api/summary?date=${date}`);

// ---------- 날짜·시간 도우미 (형식 실수 방지) ----------
const pad = (n: number) => String(n).padStart(2, "0");
export const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const nowHHMM = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
/** 주말이면 null (시간표 없음) */
export const todayDay = (d = new Date()): Day | null => {
  const k = DAYS[d.getDay()];
  return k === "일" || k === "토" ? null : k;
};
=======
function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function health(): Promise<HealthResponse> {
  return request("/api/health");
}

export function uploadReceipt(file: File): Promise<ReceiptResult> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/receipt", { method: "POST", body: form });
}

export function getHomeMenus(req: HomeMenuRequest): Promise<HomeMenuResponse> {
  return request("/api/menus/home", jsonInit("POST", req));
}

export function getCampus(): Promise<CampusResponse> {
  return request("/api/campus");
}

export function getTimetable(): Promise<TimetableResponse> {
  return request("/api/timetable");
}

export function getSchoolSlots(day: DayOfWeek): Promise<SlotsResponse> {
  return request(`/api/school/slots?day=${encodeURIComponent(day)}`);
}

export function getSchoolRecommend(req: { day: DayOfWeek; now: string }): Promise<SchoolRecommendResponse> {
  return request("/api/school/recommend", jsonInit("POST", req));
}

export function addMeal(log: MealLogCreate): Promise<MealLog> {
  return request("/api/meals", jsonInit("POST", log));
}

export function getMeals(date: string): Promise<MealListResponse> {
  return request(`/api/meals?date=${date}`);
}

export function deleteMeal(id: string): Promise<void> {
  return request(`/api/meals/${id}`, { method: "DELETE" });
}

export function getSummary(date: string): Promise<DailySummary> {
  return request(`/api/summary?date=${date}`);
}

export function getLights(menu: Nutrition): Promise<Lights> {
  return request("/api/nutrition/lights", jsonInit("POST", { menu }));
}
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
