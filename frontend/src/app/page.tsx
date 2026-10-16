"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  addMeal,
  getHomeMenus,
  getSchoolRecommend,
  getSchoolSlots,
  getSummary,
  nowHHMM,
  today,
  todayDay,
  uploadReceipt,
} from "@/lib/api";
import { DAILY_REFERENCES, light } from "@/lib/types";
import type {
  DailySummary,
  DayOfWeek,
  Ingredient,
  Light,
  Menu,
  RecipeMenu,
  SchoolRecommendation,
  SlotsResponse,
} from "@/lib/types";
import SchoolTab from "@/components/school/SchoolTab";
import CoachSection from "@/components/coach/CoachSection";

const NUTRIENT_LABELS: Record<string, string> = {
  kcal: "칼로리",
  carb: "탄수화물",
  protein: "단백질",
  fat: "지방",
  sodium: "나트륨",
};

const PLACE_LABELS: Record<string, string> = {
  student_dining: "학식",
  restaurant: "식당",
  cafe: "카페",
  convenience: "편의점",
};

function LightBadge({ name, value, lightValue }: { name: string; value: number; lightValue: Light }) {
  return (
    <span className={`light-badge light-${lightValue}`}>
      {name} {Math.round(value)}
    </span>
  );
}

function MenuCard({
  menu,
  onEaten,
  buttonLabel = "먹었어요",
}: {
  menu: Menu;
  onEaten: (menu: Menu) => void;
  buttonLabel?: string;
}) {
  const mealRef = DAILY_REFERENCES;
  return (
    <div className="card">
      <h3>{menu.name}</h3>
      {menu.price != null && <div className="muted">{menu.price.toLocaleString()}원</div>}
      {typeof menu.minutes === "number" && <div className="muted">조리 {menu.minutes}분</div>}
      {menu.steps && (
        <ol style={{ paddingLeft: 18, fontSize: 13 }}>
          {menu.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
      <div className="lights">
        {(["kcal", "carb", "protein", "fat", "sodium"] as const).map((key) => (
          <LightBadge
            key={key}
            name={NUTRIENT_LABELS[key]}
            value={menu[key]}
            lightValue={light(menu[key], mealRef[key] / 3)}
          />
        ))}
      </div>
      <button className="btn small" onClick={() => onEaten(menu)}>
        {buttonLabel}
      </button>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"home" | "school">("home");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [homeMenus, setHomeMenus] = useState<RecipeMenu[]>([]);
  const [busy, setBusy] = useState(false);

  const [slots, setSlots] = useState<SlotsResponse | null>(null);
  const [recommendations, setRecommendations] = useState<SchoolRecommendation[]>([]);

  const day = todayDay();

  const refreshSummary = useCallback(() => {
    getSummary(today())
      .then(setSummary)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, []);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  useEffect(() => {
    if (!day) return;
    getSchoolSlots(day)
      .then(setSlots)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [day]);

  const eat = async (menu: Menu) => {
    try {
      await addMeal({ date: today(), time: nowHHMM(), menu });
      refreshSummary();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  };

  const onUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const result = await uploadReceipt(file);
      setIngredients(result.ingredients);
      setHomeMenus([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const recommendHome = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await getHomeMenus({
        ingredients: ingredients.map((i) => i.name),
        lacking: summary?.lacking,
      });
      setHomeMenus(result.menus);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const recommendSchool = async () => {
    if (!day) return;
    setBusy(true);
    setError(null);
    try {
      const result = await getSchoolRecommend({ day, now: nowHHMM() });
      setRecommendations(result.recommendations);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>자취생 하루 영양 채우기</h1>
      <div className="tabs">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>
          집
        </button>
        <button className={tab === "school" ? "active" : ""} onClick={() => setTab("school")}>
          학교
        </button>
      </div>

      {error && (
        <div className="error">
          {error} <button className="btn small" onClick={() => setError(null)}>닫기</button>
        </div>
      )}

      {tab === "home" && (
        <>
          <div className="card">
            <h3>마트 영수증</h3>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            {ingredients.length > 0 && (
              <>
                <div className="chips">
                  {ingredients.map((ing, i) => (
                    <span key={i} className="chip">
                      {ing.name}
                      {ing.qty != null ? ` ${ing.qty}${ing.unit ?? ""}` : ""}
                    </span>
                  ))}
                </div>
                <button className="btn" disabled={busy} onClick={() => void recommendHome()}>
                  {busy ? "추천 중..." : "메뉴 3개 추천"}
                </button>
              </>
            )}
          </div>
          {homeMenus.map((menu) => (
            <MenuCard key={menu.id ?? menu.name} menu={menu} onEaten={(m) => void eat(m)} />
          ))}
        </>
      )}

      {tab === "school" && <SchoolTab onMealAdded={refreshSummary} />}

      <CoachSection summary={summary} onChanged={refreshSummary} />
    </>
  );
}
