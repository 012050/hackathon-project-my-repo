"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  addMeal,
  getCampus,
  getSchoolRecommend,
  getSchoolSlots,
  getTimetable,
  nowHHMM,
  today,
  todayDay,
} from "@/lib/api";
import type {
  Building,
  ClassItem,
  DayOfWeek,
  Menu,
  SchoolRecommendResponse,
  SlotsResponse,
} from "@/lib/types";
import DayTimePicker from "./DayTimePicker";
import PlaceCard from "./PlaceCard";
import Timeline from "./Timeline";
import "./school.css";

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : String(e));

export default function SchoolTab({ onMealAdded }: { onMealAdded?: () => void }) {
  const [realToday] = useState<DayOfWeek | null>(() => todayDay());
  const [day, setDay] = useState<DayOfWeek | null>(realToday);
  const [time, setTime] = useState(() => nowHHMM());

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [slots, setSlots] = useState<SlotsResponse | null>(null);
  const [result, setResult] = useState<SchoolRecommendResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [eatingKey, setEatingKey] = useState<string | null>(null);

  // 시간표·캠퍼스는 한 번만
  useEffect(() => {
    getTimetable()
      .then((r) => setClasses(r.classes))
      .catch((e) => setError(errorText(e)));
    getCampus()
      .then((r) => setBuildings(r.buildings))
      .catch((e) => setError(errorText(e)));
  }, []);

  useEffect(() => {
    if (!day) return;
    let alive = true;
    setLoadingSlots(true);
    getSchoolSlots(day)
      .then((r) => alive && setSlots(r))
      .catch((e) => alive && setError(errorText(e)))
      .finally(() => alive && setLoadingSlots(false));
    return () => {
      alive = false;
    };
  }, [day]);

  useEffect(() => {
    if (!day || !/^\d{2}:\d{2}$/.test(time)) return;
    let alive = true;
    setLoadingRec(true);
    getSchoolRecommend({ day, now: time })
      .then((r) => alive && setResult(r))
      .catch((e) => alive && setError(errorText(e)))
      .finally(() => alive && setLoadingRec(false));
    return () => {
      alive = false;
    };
  }, [day, time]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const dayClasses = useMemo(() => classes.filter((c) => c.day === day), [classes, day]);
  const buildingNames = useMemo(
    () => Object.fromEntries(buildings.map((b) => [b.id, b.name])),
    [buildings],
  );

  const eat = async (key: string, menu: Menu) => {
    setEatingKey(key);
    setError(null);
    try {
      await addMeal({ date: today(), time, menu });
      setToast(`"${menu.name}" 기록했어요`);
      onMealAdded?.();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setEatingKey(null);
    }
  };

  const daySlots = slots?.day === day ? slots : null;
  const dayResult = result?.day === day && result.now === time ? result : null;
  const noClass = day !== null && classes.length > 0 && dayClasses.length === 0;
  const dayLabel = day === realToday ? "오늘은" : `${day}요일은`;

  return (
    <div className="school-tab">
      <DayTimePicker
        day={day}
        time={time}
        todayDay={realToday}
        onDayChange={(d) => {
          setDay(d);
          setError(null);
        }}
        onTimeChange={setTime}
      />

      {error && (
        <div className="error">
          {error}{" "}
          <button className="btn small" onClick={() => setError(null)}>
            닫기
          </button>
        </div>
      )}

      {!day && <div className="card school-empty">오늘은 수업이 없어요</div>}
      {noClass && <div className="card school-empty">{dayLabel} 수업이 없어요</div>}

      {day && !noClass && (
        <>
          {daySlots?.lunchWarning && (
            <div className="school-lunch-warn">
              {dayLabel} 점심시간(11~14시)에 빈 시간이 없어요. 수업 전에 미리 먹거나 사두세요.
            </div>
          )}

          <div className="card">
            <h3>{day}요일 시간표</h3>
            {loadingSlots && !daySlots ? (
              <div className="muted">불러오는 중...</div>
            ) : (
              <Timeline
                classes={dayClasses}
                slots={daySlots?.slots ?? []}
                time={time}
                buildingNames={buildingNames}
              />
            )}
          </div>

          <h3 className="school-section">{time || "--:--"} 기준 추천</h3>
          {loadingRec && <div className="muted school-loading">불러오는 중...</div>}
          {!loadingRec && dayResult && (dayResult.slot === null || dayResult.recommendations.length === 0) && (
            <div className="card school-empty">지금은 갈 수 있는 곳이 없어요</div>
          )}
          {!loadingRec &&
            dayResult?.slot &&
            dayResult.recommendations.map((rec) => (
              <PlaceCard key={rec.placeId} rec={rec} eatingKey={eatingKey} onEat={(k, m) => void eat(k, m)} />
            ))}
        </>
      )}

      {toast && (
        <div className="school-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
