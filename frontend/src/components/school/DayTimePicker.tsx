import type { DayOfWeek } from "@/lib/types";
import { WEEKDAYS } from "./labels";

export default function DayTimePicker({
  day,
  time,
  todayDay,
  onDayChange,
  onTimeChange,
}: {
  day: DayOfWeek | null;
  time: string;
  todayDay: DayOfWeek | null;
  onDayChange: (day: DayOfWeek) => void;
  onTimeChange: (time: string) => void;
}) {
  return (
    <div className="card school-picker">
      <div className="school-days">
        {WEEKDAYS.map((d) => (
          <button
            key={d}
            type="button"
            className={`school-day${d === day ? " active" : ""}`}
            onClick={() => onDayChange(d)}
          >
            {d}
            {d === todayDay && <span className="school-today-dot" aria-label="오늘" />}
          </button>
        ))}
      </div>
      <label className="school-time">
        <span className="muted">시간</span>
        <input type="time" value={time} onChange={(e) => onTimeChange(e.target.value)} />
      </label>
    </div>
  );
}
