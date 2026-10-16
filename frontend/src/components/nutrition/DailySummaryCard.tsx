"use client";

import { useEffect, useState } from "react";
import { ApiError, addMeal, deleteMeal, getMeals, today } from "@/lib/api";
import type { DailySummary, MealLog } from "@/lib/types";
import MealConfirmSheet, { type ConfirmRequest } from "./MealConfirmSheet";
import NutritionChart from "./NutritionChart";
import { lackingOf, referenceFor, useProfile } from "@/components/coach/profile";
import { parsePortion, portionedMenu, scaleNutrition } from "./portion";
import "./nutrition.css";

const LABELS: Record<string, string> = {
  kcal: "칼로리",
  carb: "탄수화물",
  protein: "단백질",
  fat: "지방",
  sodium: "나트륨",
};

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : String(e));

/** 하루 합계 그래프 + 오늘 기록 목록(수정·삭제) */
export default function DailySummaryCard({
  summary,
  onChanged,
}: {
  summary: DailySummary | null;
  onChanged: () => void;
}) {
  const date = summary?.date ?? today();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ConfirmRequest | null>(null);
  const profile = useProfile();
  // 내 정보를 설정했으면 부족 판정도 내 권장량 기준으로
  const lacking = summary ? (profile ? lackingOf(summary.total, referenceFor(profile)) : summary.lacking) : [];

  // 합계가 바뀔 때마다(=기록이 바뀜) 목록도 다시 불러옴
  useEffect(() => {
    let alive = true;
    getMeals(date)
      .then((r) => alive && setMeals(r.meals))
      .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [date, summary]);

  const startEdit = (meal: MealLog) => {
    const { baseName, portion } = parsePortion(meal.menu.name);
    const baseMenu = { ...meal.menu, ...scaleNutrition(meal.menu, 1 / portion), name: baseName };
    setSheet({
      title: `${baseName} 수정`,
      base: baseMenu,
      defaultPortion: portion,
      defaultTime: meal.time,
      confirmLabel: "수정하기",
      onConfirm: async (newPortion, newTime) => {
        // 백엔드에 수정 API 가 없어서 새로 저장한 뒤 기존 기록을 삭제
        // (저장이 실패하면 기존 기록이 그대로 남도록 저장을 먼저 함)
        await addMeal({ date: meal.date, time: newTime, menu: portionedMenu(baseMenu, newPortion) });
        await deleteMeal(meal.id);
        onChanged();
      },
    });
  };

  const remove = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await deleteMeal(id);
      setConfirmDeleteId(null);
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card nut-summary">
      <h3>오늘 하루 합계 ({date})</h3>
      {!summary && <div className="muted">기록이 아직 없어요</div>}
      {summary && (
        <>
          <div className="muted">기록 {summary.count}끼</div>
          <NutritionChart value={summary.total} basis="daily" />
          {lacking.length > 0 && (
            <div className="chips">
              {lacking.map((key) => (
                <span key={key} className="chip lacking">
                  부족: {LABELS[key] ?? key}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {error && <div className="error">{error}</div>}

      {meals.length > 0 && (
        <ul className="nut-meals">
          {meals.map((meal) => (
            <li key={meal.id} className="nut-meal">
              <div className="nut-meal-main">
                <span className="nut-meal-time">{meal.time}</span>
                <span className="nut-meal-name">{meal.menu.name}</span>
                <span className="muted">{Math.round(meal.menu.kcal)}kcal</span>
              </div>
              {confirmDeleteId === meal.id ? (
                <div className="nut-meal-actions confirm">
                  <span>정말 삭제할까요?</span>
                  <button
                    className="btn small nut-btn-danger"
                    disabled={busyId === meal.id}
                    onClick={() => void remove(meal.id)}
                  >
                    {busyId === meal.id ? "삭제 중..." : "삭제"}
                  </button>
                  <button className="btn small nut-btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                    취소
                  </button>
                </div>
              ) : (
                <div className="nut-meal-actions">
                  <button className="btn small nut-btn-ghost" onClick={() => startEdit(meal)}>
                    수정
                  </button>
                  <button className="btn small nut-btn-ghost" onClick={() => setConfirmDeleteId(meal.id)}>
                    삭제
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <MealConfirmSheet request={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
