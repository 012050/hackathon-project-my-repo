"use client";

import { useEffect, useState } from "react";
import { ApiError, addMeal, deleteMeal, getMeals } from "@/lib/api";
import type { MealLog, Menu, Nutrition } from "@/lib/types";
import { recentDates } from "./coach";
import "./coach.css";

interface Day {
  date: string;
  count: number;
  total: Nutrition;
}

const DEMO_PREFIX = "[데모] ";
const errorText = (e: unknown) => (e instanceof ApiError ? e.message : String(e));

function totalOf(meals: MealLog[]): Nutrition {
  const t: Nutrition = { kcal: 0, carb: 0, protein: 0, fat: 0, sodium: 0 };
  for (const m of meals) {
    t.kcal += m.menu.kcal;
    t.carb += m.menu.carb;
    t.protein += m.menu.protein;
    t.fat += m.menu.fat;
    t.sodium += m.menu.sodium;
  }
  return t;
}

interface Pattern {
  problem: string;
  fix: string;
}

function findPatterns(days: Day[], ref: Nutrition): Pattern[] {
  const recorded = days.filter((d) => d.count > 0);
  const out: Pattern[] = [];
  const sodiumDays = recorded.filter((d) => d.total.sodium > ref.sodium).length;
  if (sodiumDays >= 3)
    out.push({ problem: `나트륨을 권장량보다 많이 먹은 날이 ${sodiumDays}일`, fix: "국물은 반만, 라면은 주 2회 이하로" });
  const proteinDays = recorded.filter((d) => d.total.protein < ref.protein * 0.8).length;
  if (proteinDays >= 3)
    out.push({ problem: `단백질이 부족한 날이 ${proteinDays}일`, fix: "끼니마다 계란·두부·닭가슴살 하나씩" });
  const skipDays = days.filter((d) => d.count <= 1).length;
  if (skipDays >= 3)
    out.push({ problem: `기록이 1끼 이하인 날이 ${skipDays}일`, fix: "끼니를 거르는 날이 많아요. 공강 추천을 활용해보세요" });
  const avg = recorded.reduce((s, d) => s + d.total.kcal, 0) / Math.max(recorded.length, 1);
  if (avg > ref.kcal * 1.2)
    out.push({ problem: `평균 칼로리가 권장량의 ${Math.round((avg / ref.kcal) * 100)}%`, fix: "덮밥·튀김은 줄이고 한 끼는 가벼운 메뉴로" });
  else if (recorded.length > 0 && avg < ref.kcal * 0.7)
    out.push({ problem: `평균 칼로리가 권장량의 ${Math.round((avg / ref.kcal) * 100)}%`, fix: "너무 적게 먹고 있어요. 간식으로 우유·바나나를 더해보세요" });
  return out.slice(0, 3);
}

// 데모: 나트륨 많고 단백질 부족한 6일치 (라면·국물·면 위주)
const DEMO_MEALS: Omit<Menu, "source">[] = [
  { name: "컵라면 + 삼각김밥", kcal: 710, carb: 112, protein: 14, fat: 22, sodium: 2250 },
  { name: "짜장면", kcal: 800, carb: 120, protein: 20, fat: 25, sodium: 2100 },
  { name: "김치찌개 백반", kcal: 650, carb: 90, protein: 18, fat: 20, sodium: 2000 },
  { name: "떡볶이 + 순대", kcal: 750, carb: 130, protein: 15, fat: 18, sodium: 1900 },
  { name: "편의점 도시락", kcal: 780, carb: 110, protein: 22, fat: 25, sodium: 1750 },
  { name: "라면 + 공깃밥", kcal: 800, carb: 125, protein: 15, fat: 22, sodium: 1950 },
];
// 날짜별 끼니 수 (1끼 날이 3일 → 끼니 거르기 패턴도 보이게)
const DEMO_PLAN = [
  [0, 2],
  [1],
  [3, 5],
  [4],
  [2, 0],
  [5],
];

export default function HabitCard({ reference, refreshKey, onChanged }: { reference: Nutrition; refreshKey: unknown; onChanged: () => void }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const dates = recentDates(7);
    const lists = await Promise.all(dates.map((d) => getMeals(d)));
    setDays(dates.map((date, i) => ({ date, count: lists[i].meals.length, total: totalOf(lists[i].meals) })));
  };

  useEffect(() => {
    load().catch((e) => setError(errorText(e)));
  }, [refreshKey]);

  const addDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const past = recentDates(7).slice(0, 6);
      for (let i = 0; i < past.length; i++) {
        for (let j = 0; j < DEMO_PLAN[i].length; j++) {
          const m = DEMO_MEALS[DEMO_PLAN[i][j]];
          await addMeal({
            date: past[i],
            time: j === 0 ? "12:30" : "19:00",
            menu: { ...m, name: DEMO_PREFIX + m.name, source: "school", estimated: true },
          });
        }
      }
      await load();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const clearDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const date of recentDates(7)) {
        const { meals } = await getMeals(date);
        for (const m of meals.filter((x) => x.menu.name.startsWith(DEMO_PREFIX))) await deleteMeal(m.id);
      }
      await load();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const recorded = days?.filter((d) => d.count > 0) ?? [];
  const avg = recorded.reduce((s, d) => s + d.total.kcal, 0) / Math.max(recorded.length, 1);
  const patterns = days ? findPatterns(days, reference) : [];
  const maxKcal = Math.max(reference.kcal * 1.5, ...(days ?? []).map((d) => d.total.kcal));

  return (
    <div className="card coach-habit">
      <h3>최근 7일 식습관</h3>
      {error && <div className="error">{error}</div>}
      {!days && !error && <div className="muted">불러오는 중...</div>}

      {days && recorded.length < 2 && <div className="muted">기록이 쌓이면 식습관을 분석해드려요. (기록한 날 {recorded.length}일)</div>}

      {days && recorded.length >= 2 && (
        <>
          <div className="coach-avg">
            7일 평균 <strong>{Math.round(avg).toLocaleString()}kcal</strong> / 권장 {reference.kcal.toLocaleString()}kcal
            <span className="muted"> (기록한 {recorded.length}일 기준)</span>
          </div>
          <div className="coach-week" role="img" aria-label="최근 7일 칼로리 막대 그래프">
            <div className="coach-week-row">
              {days.map((d) => (
                <div key={d.date} className="coach-week-val">
                  {d.count ? Math.round(d.total.kcal).toLocaleString() : "-"}
                </div>
              ))}
            </div>
            <div className="coach-week-plot">
              {days.map((d) => {
                const ratio = d.total.kcal / reference.kcal;
                const color = ratio > 1.2 ? "red" : ratio < 0.7 ? "yellow" : "green";
                return (
                  <div key={d.date} className="coach-week-track">
                    <div className={`coach-week-bar ${color}`} style={{ height: `${(d.total.kcal / maxKcal) * 100}%` }} />
                  </div>
                );
              })}
              <div className="coach-week-line" style={{ bottom: `${(reference.kcal / maxKcal) * 100}%` }}>
                <span>권장 {reference.kcal.toLocaleString()}</span>
              </div>
            </div>
            <div className="coach-week-row">
              {days.map((d) => (
                <div key={d.date} className={`coach-week-day${d.date === recentDates(1)[0] ? " today" : ""}`}>
                  {d.date === recentDates(1)[0] ? "오늘" : `${Number(d.date.slice(8))}일`}
                </div>
              ))}
            </div>
          </div>

          {patterns.length > 0 ? (
            <ul className="coach-patterns">
              {patterns.map((p) => (
                <li key={p.problem}>
                  <div className="coach-problem">{p.problem}</div>
                  <div className="coach-fix">→ {p.fix}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="coach-good">최근 식습관이 괜찮아요. 지금처럼 유지해요!</div>
          )}
        </>
      )}

      <div className="coach-demo">
        <span>개발용</span>
        <button className="coach-link" disabled={busy} onClick={() => void addDemo()}>
          데모 데이터 넣기
        </button>
        <button className="coach-link" disabled={busy} onClick={() => void clearDemo()}>
          데모 데이터 지우기
        </button>
        {busy && <span>처리 중...</span>}
      </div>
    </div>
  );
}
