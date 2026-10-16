import { DAILY_REFERENCES } from "@/lib/types";
import type { Menu, Nutrition, NutrientKey } from "@/lib/types";

export const PORTIONS = [0.5, 1, 1.5, 2] as const;
export const NUTRIENT_KEYS: NutrientKey[] = ["kcal", "carb", "protein", "fat", "sodium"];

export const DAILY: Nutrition = { ...DAILY_REFERENCES };
export const PER_MEAL: Nutrition = {
  kcal: DAILY_REFERENCES.kcal / 3,
  carb: DAILY_REFERENCES.carb / 3,
  protein: DAILY_REFERENCES.protein / 3,
  fat: DAILY_REFERENCES.fat / 3,
  sodium: DAILY_REFERENCES.sodium / 3,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scaleNutrition(n: Nutrition, factor: number): Nutrition {
  return {
    kcal: round1(n.kcal * factor),
    carb: round1(n.carb * factor),
    protein: round1(n.protein * factor),
    fat: round1(n.fat * factor),
    sodium: round1(n.sodium * factor),
  };
}

export function sumNutrition(list: Nutrition[]): Nutrition {
  const total: Nutrition = { kcal: 0, carb: 0, protein: 0, fat: 0, sodium: 0 };
  for (const n of list) for (const k of NUTRIENT_KEYS) total[k] += n[k];
  return scaleNutrition(total, 1);
}

export const portionLabel = (p: number) => `${p}인분`;

// 백엔드 Menu 에 "양" 필드가 없어서 이름 끝에 " (1.5인분)" 으로 남겨 두고, 수정할 때 다시 읽음
const PORTION_SUFFIX = /\s*\((\d+(?:\.\d+)?)인분\)$/;

export function withPortion(name: string, portion: number): string {
  return portion === 1 ? name : `${name} (${portionLabel(portion)})`;
}

export function parsePortion(name: string): { baseName: string; portion: number } {
  const m = name.match(PORTION_SUFFIX);
  if (!m) return { baseName: name, portion: 1 };
  const portion = Number(m[1]);
  return { baseName: name.replace(PORTION_SUFFIX, ""), portion: portion > 0 ? portion : 1 };
}

/** 메뉴를 양만큼 곱해서 기록용 메뉴로 */
export function portionedMenu(menu: Menu, portion: number): Menu {
  return { ...menu, ...scaleNutrition(menu, portion), name: withPortion(menu.name, portion) };
}
