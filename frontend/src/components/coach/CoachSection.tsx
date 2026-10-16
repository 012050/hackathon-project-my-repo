"use client";

import { useState } from "react";
import type { DailySummary } from "@/lib/types";
import DailySummaryCard from "@/components/nutrition/DailySummaryCard";
import { DAILY } from "@/components/nutrition/portion";
import CoachCard from "./CoachCard";
import HabitCard from "./HabitCard";
import ProfileSheet from "./ProfileSheet";
import { profileLabel, referenceFor, useProfile } from "./profile";
import "./coach.css";

/** 내 정보 배너 + 하루 합계 + 오늘의 코칭 + 최근 7일 식습관 (page.tsx 에서 한 줄로 쓰기) */
export default function CoachSection({ summary, onChanged }: { summary: DailySummary | null; onChanged: () => void }) {
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const reference = profile ? referenceFor(profile) : DAILY;

  return (
    <>
      {profile ? (
        <div className="coach-profile-bar">
          <span>
            내 정보: <strong>{profileLabel(profile)}</strong> · 하루 {reference.kcal.toLocaleString()}kcal 기준
          </span>
          <button className="coach-link" onClick={() => setEditing(true)}>
            변경
          </button>
        </div>
      ) : (
        <div className="coach-banner">
          <span>내 정보를 설정하면 맞춤 권장량으로 보여드려요</span>
          <button className="btn small" onClick={() => setEditing(true)}>
            설정
          </button>
        </div>
      )}

      <DailySummaryCard summary={summary} onChanged={onChanged} />
      <CoachCard summary={summary} reference={reference} onChanged={onChanged} />
      <HabitCard reference={reference} refreshKey={summary} onChanged={onChanged} />

      <ProfileSheet open={editing} current={profile} onClose={() => setEditing(false)} />
    </>
  );
}
