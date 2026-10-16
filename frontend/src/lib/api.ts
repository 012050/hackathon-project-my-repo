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
export { nowHHMM, today, todayDay, light, menuLights, DAILY_REFERENCES } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError("network_error", "서버가 꺼져 있어요. 백엔드가 실행 중인지 확인해 주세요.", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(err?.code ?? "http_error", err?.message ?? `요청에 실패했어요 (${res.status})`, res.status);
  }
  return body as T;
}

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
