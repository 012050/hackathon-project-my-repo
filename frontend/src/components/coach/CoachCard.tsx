"use client";

import { useEffect, useState } from "react";
import { addMeal, nowHHMM, today } from "@/lib/api";
import type { DailySummary, Nutrition, NutrientKey } from "@/lib/types";
import MealConfirmSheet, { type ConfirmRequest } from "@/components/nutrition/MealConfirmSheet";
import NutritionChart from "@/components/nutrition/NutritionChart";
import { portionedMenu } from "@/components/nutrition/portion";
import { ISSUE_TEXT, diagnose, mealsLeftAt, nextMealTarget, recommend, remainingOf } from "./coach";
import type { Preset } from "./presets";
import "./coach.css";

const NUTRIENTS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: "kcal", label: "칼로리", unit: "kcal" },
  { key: "carb", label: "탄수화물", unit: "g" },
  { key: "protein", label: "단백질", unit: "g" },
  { key: "fat", label: "지방", unit: "g" },
  { key: "sodium", label: "나트륨", unit: "mg" },
];

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString();

/** 오늘 남은 권장량 · 한 줄 진단 · 다음 식단 추천 3개 */
export default function CoachCard({
  summary,
  reference,
  onChanged,
}: {
  summary: DailySummary | null;
  reference: Nutrition;
  onChanged: () => void;
}) {
  // 현재 시각(1분마다 갱신)으로 남은 끼니를 추정
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(nowHHMM());
    const id = setInterval(() => setNow(nowHHMM()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [sheet, setSheet] = useState<ConfirmRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  if (!now) return null;

  const eaten: Nutrition = summary?.total ?? { kcal: 0, carb: 0, protein: 0, fat: 0, sodium: 0 };
  const count = summary?.count ?? 0;
  const remaining = remainingOf(eaten, reference);
  const mealsLeft = mealsLeftAt(now);
  const target = nextMealTarget(remaining, mealsLeft);
  const issues = diagnose(eaten, reference, mealsLeft, count);
  const picks = target ? recommend(target, issues) : [];

  const eat = (p: Preset) =>
    setSheet({
      title: p.name,
      base: p,
      defaultTime: now,
      onConfirm: async (portion, time) => {
        const menu = {
          id: p.id,
          name: p.name,
          source: p.tag === "집밥" ? ("home" as const) : ("school" as const),
          kcal: p.kcal,
          carb: p.carb,
          protein: p.protein,
          fat: p.fat,
          sodium: p.sodium,
          estimated: true,
        };
        await addMeal({ date: today(), time, menu: portionedMenu(menu, portion) });
        setToast(`"${p.name}" 기록했어요`);
        onChanged();
      },
    });

  return (
    <div className="card coach-card">
      <h3>오늘의 코칭</h3>
      <p className="coach-headline">
        오늘 <strong>{fmt(eaten.kcal)}kcal</strong> 먹었어요.{" "}
        {remaining.kcal >= 0 ? (
          <>
            남은 권장량 <strong>{fmt(remaining.kcal)}kcal</strong>
          </>
        ) : (
          <>
            권장량보다 <strong className="coach-over">{fmt(remaining.kcal)}kcal</strong> 더 먹었어요
          </>
        )}
      </p>

      <ul className="coach-remaining">
        {NUTRIENTS.map(({ key, label, unit }) => {
          const r = remaining[key];
          // 나트륨은 "남은 양"이 아니라 "한도까지"
          const over = r < 0;
          return (
            <li key={key} className={over ? "over" : ""}>
              <span>{label}</span>
              <strong>
                {over ? `${fmt(r)}${unit} 초과` : `${fmt(r)}${unit} ${key === "sodium" ? "여유" : "남음"}`}
              </strong>
            </li>
          );
        })}
      </ul>

      {issues.length > 0 && (
        <ul className="coach-issues">
          {issues.map((i) => (
            <li key={i}>{ISSUE_TEXT[i]}</li>
          ))}
        </ul>
      )}
      {count === 0 && <div className="muted">아직 오늘 기록이 없어요. 먹은 걸 기록하면 맞춤 코칭을 해드려요.</div>}

      {target ? (
        <>
          <h4 className="coach-sub">
            다음 끼니 목표 · 약 {fmt(target.kcal)}kcal
            <span className="muted"> (남은 끼니 {mealsLeft}번 기준)</span>
          </h4>
          <div className="coach-picks">
            {picks.map((p) => (
              <div key={p.id} className="coach-pick">
                <div className="coach-pick-head">
                  <span className="coach-pick-name">{p.name}</span>
                  <span className="coach-tag">{p.tag}</span>
                </div>
                <div className="muted">{p.desc}</div>
                <NutritionChart value={p} basis="meal" compact />
                <button className="btn small" onClick={() => eat(p)}>
                  이걸로 먹었어요
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="coach-done">오늘 끼니는 끝났어요. 내일 아침을 챙겨 드세요.</div>
      )}

      <MealConfirmSheet request={sheet} onClose={() => setSheet(null)} />
      {toast && (
        <div className="coach-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
