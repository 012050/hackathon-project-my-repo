"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import type { Nutrition } from "@/lib/types";
import NutritionChart from "./NutritionChart";
import { PORTIONS, portionLabel, scaleNutrition } from "./portion";
import "./nutrition.css";

export interface ConfirmRequest {
  title: string;
  /** 1인분(양 1) 기준 영양소 */
  base: Nutrition;
  defaultPortion?: number;
  defaultTime: string;
  confirmLabel?: string;
  note?: string;
  onConfirm: (portion: number, time: string) => Promise<void>;
}

/** [먹었어요] 전에 양·시간을 확인하는 아래쪽 시트 */
export default function MealConfirmSheet({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const [portion, setPortion] = useState(1);
  const [time, setTime] = useState("12:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    setPortion(request.defaultPortion ?? 1);
    setTime(/^\d{2}:\d{2}$/.test(request.defaultTime) ? request.defaultTime : "12:00");
    setSaving(false);
    setError(null);
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, saving, onClose]);

  if (!request) return null;

  const confirm = async () => {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setError("시간을 입력해 주세요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await request.onConfirm(portion, time);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div className="nut-sheet-backdrop" onClick={() => !saving && onClose()}>
      <div
        className="nut-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={request.title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="nut-sheet-title">{request.title}</h3>
        {request.note && <div className="muted">{request.note}</div>}

        <div className="nut-field">
          <span className="nut-field-label">먹은 양</span>
          <div className="nut-portions">
            {PORTIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={`nut-portion${p === portion ? " active" : ""}`}
                onClick={() => setPortion(p)}
                disabled={saving}
              >
                {portionLabel(p)}
              </button>
            ))}
          </div>
        </div>

        <label className="nut-field">
          <span className="nut-field-label">시간</span>
          <input
            className="nut-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={saving}
          />
        </label>

        <NutritionChart value={scaleNutrition(request.base, portion)} basis="meal" compact />

        {error && <div className="error">{error}</div>}

        <div className="nut-sheet-actions">
          <button type="button" className="btn nut-btn-ghost" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className="btn" onClick={() => void confirm()} disabled={saving}>
            {saving ? "저장 중..." : request.confirmLabel ?? "기록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
