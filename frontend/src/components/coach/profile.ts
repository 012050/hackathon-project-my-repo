"use client";

import { useEffect, useState } from "react";
import type { Nutrition, NutrientKey } from "@/lib/types";

export type Sex = "male" | "female";
export type AgeGroup = "19-29" | "30-49" | "50-64";
export interface Profile {
  sex: Sex;
  age: AgeGroup;
}

export const SEX_LABELS: Record<Sex, string> = { male: "남", female: "여" };
export const AGE_GROUPS: AgeGroup[] = ["19-29", "30-49", "50-64"];
export const ageLabel = (a: AgeGroup) => a.replace("-", "~");
export const profileLabel = (p: Profile) => `${SEX_LABELS[p.sex]} ${ageLabel(p.age)}세`;

/** 한국인 영양소 섭취기준(2020), 하루 기준 — 참고 기준 */
const TABLE: Record<Sex, Record<AgeGroup, { kcal: number; protein: number }>> = {
  male: { "19-29": { kcal: 2600, protein: 65 }, "30-49": { kcal: 2500, protein: 65 }, "50-64": { kcal: 2200, protein: 60 } },
  female: { "19-29": { kcal: 2000, protein: 55 }, "30-49": { kcal: 1900, protein: 50 }, "50-64": { kcal: 1700, protein: 50 } },
};

export const SODIUM_LIMIT = 2300;

/** 하루 권장량. 탄수화물 = 칼로리의 60% ÷ 4, 지방 = 칼로리의 25% ÷ 9, 나트륨 = 2300mg 이하 */
export function referenceFor(p: Profile): Nutrition {
  const { kcal, protein } = TABLE[p.sex][p.age];
  return {
    kcal,
    carb: Math.round((kcal * 0.6) / 4),
    protein,
    fat: Math.round((kcal * 0.25) / 9),
    sodium: SODIUM_LIMIT,
  };
}

/** 하루 기준치의 80% 미만인 영양소 (나트륨 제외 — 많을수록 나쁨). 서버 lacking 과 같은 규칙 */
export function lackingOf(total: Nutrition, ref: Nutrition): NutrientKey[] {
  return (["kcal", "carb", "protein", "fat"] as const).filter((k) => total[k] < ref[k] * 0.8);
}

// ---------- 저장 (localStorage, 실패해도 앱은 동작) ----------
const KEY = "coach.profile.v1";
const EVENT = "coach-profile-change";

function isProfile(v: unknown): v is Profile {
  const p = v as Profile;
  return !!p && (p.sex === "male" || p.sex === "female") && AGE_GROUPS.includes(p.age);
}

export function loadProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return isProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile | null): void {
  try {
    if (p) window.localStorage.setItem(KEY, JSON.stringify(p));
    else window.localStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 환경(사생활 보호 모드 등)이면 이번 화면에서만 적용
  }
  window.dispatchEvent(new CustomEvent<Profile | null>(EVENT, { detail: p }));
}

/** 어느 컴포넌트에서든 같은 프로필을 보도록 (저장하면 모두 갱신) */
export function useProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    setProfile(loadProfile());
    const onChange = (e: Event) => setProfile((e as CustomEvent<Profile | null>).detail ?? null);
    const onStorage = (e: StorageEvent) => e.key === KEY && setProfile(loadProfile());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return profile;
}
