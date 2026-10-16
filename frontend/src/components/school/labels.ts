import type { DayOfWeek, NutrientKey, PlaceType } from "@/lib/types";

export const WEEKDAYS: DayOfWeek[] = ["월", "화", "수", "목", "금"];

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  convenience: "편의점",
  student_dining: "학생식당",
  restaurant: "식당",
  cafe: "카페",
};

export const NUTRIENTS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: "kcal", label: "칼로리", unit: "kcal" },
  { key: "carb", label: "탄수화물", unit: "g" },
  { key: "protein", label: "단백질", unit: "g" },
  { key: "fat", label: "지방", unit: "g" },
  { key: "sodium", label: "나트륨", unit: "mg" },
];

export const LIGHT_LABELS = { green: "적당", yellow: "주의", red: "과다·부족" } as const;

/** "HH:MM" → 분 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
