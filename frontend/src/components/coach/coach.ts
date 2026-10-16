import type { Nutrition } from "@/lib/types";
import { PRESETS, type Preset } from "./presets";

export type Issue = "protein_low" | "sodium_high" | "kcal_high";

export const ISSUE_TEXT: Record<Issue, string> = {
  protein_low: "다음 끼니는 단백질을 챙겨요",
  sodium_high: "오늘은 국물·라면은 피해요",
  kcal_high: "남은 끼니는 가볍게",
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** 지금 시간 기준 남은 끼니 수: 14시 전 2끼, 14~20시 1끼, 20시 이후 0끼 */
export function mealsLeftAt(hhmm: string): number {
  const t = toMin(hhmm);
  if (t < 14 * 60) return 2;
  if (t < 20 * 60) return 1;
  return 0;
}

/**
 * 진단: 하루 중 지금까지 먹었어야 할 비율(pace) 대비 얼마나 벗어났는지로 심한 정도를 매김.
 * pace = (3 - 남은 끼니) / 3  → 점심 전 1/3, 저녁 전 2/3, 밤 3/3
 */
export function diagnose(eaten: Nutrition, ref: Nutrition, mealsLeft: number, mealCount: number): Issue[] {
  if (mealCount === 0) return [];
  const pace = (3 - mealsLeft) / 3;
  const scored: [Issue, number][] = [];
  const protein = eaten.protein / ref.protein;
  const sodium = eaten.sodium / ref.sodium;
  const kcal = eaten.kcal / ref.kcal;
  if (pace - protein > 0.15) scored.push(["protein_low", pace - protein]);
  if (sodium - pace > 0.15 || sodium > 1) scored.push(["sodium_high", sodium - pace]);
  if (kcal - pace > 0.15 || kcal > 1) scored.push(["kcal_high", kcal - pace]);
  return scored.sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => i);
}

export function remainingOf(eaten: Nutrition, ref: Nutrition): Nutrition {
  return {
    kcal: ref.kcal - eaten.kcal,
    carb: ref.carb - eaten.carb,
    protein: ref.protein - eaten.protein,
    fat: ref.fat - eaten.fat,
    sodium: ref.sodium - eaten.sodium,
  };
}

/** 다음 끼니 목표 = 남은 권장량 ÷ 남은 끼니 수 (음수면 0) */
export function nextMealTarget(remaining: Nutrition, mealsLeft: number): Nutrition | null {
  if (mealsLeft <= 0) return null;
  const per = (v: number) => Math.max(0, v / mealsLeft);
  return {
    kcal: per(remaining.kcal),
    carb: per(remaining.carb),
    protein: per(remaining.protein),
    fat: per(remaining.fat),
    sodium: per(remaining.sodium),
  };
}

/** 목표 kcal ±150 안에서 진단에 맞는 순으로 상위 3개 (모자라면 kcal 가까운 순으로 채움) */
export function recommend(target: Nutrition, issues: Issue[], count = 3): Preset[] {
  // 목표가 너무 작으면(이미 거의 다 먹음) 가장 가벼운 쪽으로
  const goal = Math.max(target.kcal, 300);
  const score = (p: Preset) => {
    let s = -Math.abs(p.kcal - goal) / 150;
    if (issues.includes("protein_low")) s += (p.protein / p.kcal) * 40; // kcal 대비 단백질 비율
    if (issues.includes("sodium_high")) s -= p.sodium / 600;
    if (issues.includes("kcal_high")) s -= p.kcal / 600;
    if (target.sodium > 0 && p.sodium > target.sodium * 1.2) s -= 0.5;
    return s;
  };
  const inRange = PRESETS.filter((p) => Math.abs(p.kcal - goal) <= 150).sort((a, b) => score(b) - score(a));
  if (inRange.length >= count) return inRange.slice(0, count);
  const rest = PRESETS.filter((p) => !inRange.includes(p)).sort(
    (a, b) => Math.abs(a.kcal - goal) - Math.abs(b.kcal - goal),
  );
  return [...inRange, ...rest].slice(0, count);
}

/** 오늘 포함 최근 n일 "YYYY-MM-DD" (오래된 날부터) */
export function recentDates(n: number, base = new Date()): string[] {
  const pad = (v: number) => String(v).padStart(2, "0");
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - (n - 1 - i));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}
