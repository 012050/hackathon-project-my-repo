import { light } from "@/lib/api";
import type { Light, Nutrition, NutrientKey } from "@/lib/types";
import { profileLabel, referenceFor, useProfile } from "@/components/coach/profile";
import { DAILY, PER_MEAL, scaleNutrition } from "./portion";
import "./nutrition.css";

const LABELS: Record<NutrientKey, { label: string; unit: string }> = {
  kcal: { label: "칼로리", unit: "kcal" },
  carb: { label: "탄수화물", unit: "g" },
  protein: { label: "단백질", unit: "g" },
  fat: { label: "지방", unit: "g" },
  sodium: { label: "나트륨", unit: "mg" },
};

/** 막대는 기준의 150% 까지 그림 → 100% 표시선은 2/3 지점 */
const BAR_MAX = 1.5;

const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 10) / 10));
const pct = (value: number, ref: number) => (ref > 0 ? Math.round((value / ref) * 100) : 0);

/** 신호등 색. 나트륨은 많을수록 나쁘므로 기준을 넘으면 빨강, 그 아래는 초록 */
function colorOf(key: NutrientKey, value: number, ref: number): Light {
  if (key === "sodium") return value > ref ? "red" : "green";
  return light(value, ref);
}

function Gauge({ value, reference, compact }: { value: number; reference: number; compact: boolean }) {
  const size = compact ? 84 : 132;
  const stroke = compact ? 9 : 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = reference > 0 ? value / reference : 0;
  const filled = Math.min(ratio, 1) * c;
  return (
    <div className="nut-gauge" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle className="nut-gauge-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className={`nut-gauge-fill nut-stroke-${colorOf("kcal", value, reference)}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="nut-gauge-center">
        <strong>{fmt(value)}</strong>
        <span>/ {fmt(reference)} kcal</span>
        {!compact && <em>{pct(value, reference)}%</em>}
      </div>
    </div>
  );
}

function Bar({ k, value, reference }: { k: NutrientKey; value: number; reference: number }) {
  const ratio = reference > 0 ? value / reference : 0;
  const width = Math.min(ratio / BAR_MAX, 1) * 100;
  return (
    <div className="nut-bar">
      <div className="nut-bar-head">
        <span>{LABELS[k].label}</span>
        <span className="nut-bar-pct">{pct(value, reference)}%</span>
      </div>
      <div className="nut-bar-track">
        <div className={`nut-bar-fill nut-bg-${colorOf(k, value, reference)}`} style={{ width: `${width}%` }} />
        <div className="nut-bar-100" style={{ left: `${100 / BAR_MAX}%` }} title="기준 100%" />
      </div>
    </div>
  );
}

export default function NutritionChart({
  value,
  basis,
  compact = false,
}: {
  value: Nutrition;
  /** daily = 하루 기준, meal = 한 끼 기준(하루의 1/3). 내 정보를 설정했으면 그 권장량, 아니면 DAILY_REFERENCES */
  basis: "daily" | "meal";
  compact?: boolean;
}) {
  const profile = useProfile();
  const daily = profile ? referenceFor(profile) : DAILY;
  const ref = basis === "daily" ? daily : profile ? scaleNutrition(daily, 1 / 3) : PER_MEAL;
  const basisText = `${profile ? `내 권장량(${profileLabel(profile)}, 참고 기준)` : "하루 권장량"}${basis === "meal" ? "의 1/3(한 끼)" : ""}`;
  return (
    <div className={`nut-chart${compact ? " compact" : ""}`}>
      <div className="nut-chart-graphs">
        <Gauge value={value.kcal} reference={ref.kcal} compact={compact} />
        <div className="nut-bars">
          {(["carb", "protein", "fat", "sodium"] as const).map((k) => (
            <Bar key={k} k={k} value={value[k]} reference={ref[k]} />
          ))}
        </div>
      </div>
      <ul className="nut-numbers">
        {(["kcal", "carb", "protein", "fat", "sodium"] as const).map((k) => (
          <li key={k}>
            <span className={`nut-dot nut-bg-${colorOf(k, value[k], ref[k])}`} />
            {LABELS[k].label} {fmt(value[k])}
            {LABELS[k].unit}
          </li>
        ))}
      </ul>
      <div className="nut-basis">{basisText} 대비 · 막대의 세로선이 100%</div>
    </div>
  );
}
