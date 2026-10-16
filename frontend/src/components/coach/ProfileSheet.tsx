"use client";

import { useEffect, useState } from "react";
import {
  AGE_GROUPS,
  SEX_LABELS,
  ageLabel,
  referenceFor,
  saveProfile,
  type AgeGroup,
  type Profile,
  type Sex,
} from "./profile";
import "./coach.css";

/** 성별·나이대 선택 시트 (기존 확인 시트와 같은 모양) */
export default function ProfileSheet({
  open,
  current,
  onClose,
}: {
  open: boolean;
  current: Profile | null;
  onClose: () => void;
}) {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState<AgeGroup>("19-29");

  useEffect(() => {
    if (!open) return;
    setSex(current?.sex ?? "male");
    setAge(current?.age ?? "19-29");
  }, [open, current]);

  if (!open) return null;
  const ref = referenceFor({ sex, age });

  return (
    <div className="nut-sheet-backdrop" onClick={onClose}>
      <div className="nut-sheet" role="dialog" aria-modal="true" aria-label="내 정보" onClick={(e) => e.stopPropagation()}>
        <h3 className="nut-sheet-title">내 정보</h3>
        <div className="muted">성별·나이대에 맞는 하루 권장량으로 그래프와 코칭을 보여드려요.</div>

        <div className="nut-field">
          <span className="nut-field-label">성별</span>
          <div className="coach-choices two">
            {(["male", "female"] as const).map((s) => (
              <button key={s} type="button" className={`nut-portion${s === sex ? " active" : ""}`} onClick={() => setSex(s)}>
                {SEX_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="nut-field">
          <span className="nut-field-label">나이</span>
          <div className="coach-choices three">
            {AGE_GROUPS.map((a) => (
              <button key={a} type="button" className={`nut-portion${a === age ? " active" : ""}`} onClick={() => setAge(a)}>
                {ageLabel(a)}
              </button>
            ))}
          </div>
        </div>

        <div className="coach-ref">
          하루 권장량: <strong>{ref.kcal.toLocaleString()}kcal</strong> · 탄수화물 {ref.carb}g · 단백질 {ref.protein}g · 지방{" "}
          {ref.fat}g · 나트륨 {ref.sodium.toLocaleString()}mg 이하
          <div className="coach-note">
            참고 기준: 한국인 영양소 섭취기준(2020). 탄수화물은 칼로리의 60%, 지방은 25%로 계산
          </div>
        </div>

        <div className="nut-sheet-actions">
          {current ? (
            <button
              type="button"
              className="btn nut-btn-ghost"
              onClick={() => {
                saveProfile(null);
                onClose();
              }}
            >
              설정 지우기
            </button>
          ) : (
            <button type="button" className="btn nut-btn-ghost" onClick={onClose}>
              취소
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              saveProfile({ sex, age });
              onClose();
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
