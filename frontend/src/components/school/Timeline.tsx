import type { ClassItem, FreeSlot } from "@/lib/types";
import { toMinutes } from "./labels";

type Entry =
  | { kind: "class"; start: string; end: string; room: string; building: string }
  | { kind: "free"; start: string; end: string; minutes: number };

/** 같은 강의실에서 이어지는 수업은 한 칸으로 합치고, 빈 시간과 함께 시간순 정렬 */
function buildEntries(classes: ClassItem[], slots: FreeSlot[]): Entry[] {
  const merged: Entry[] = [];
  for (const c of [...classes].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))) {
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === "class" && prev.end === c.start && prev.room === c.room) {
      prev.end = c.end;
    } else {
      merged.push({ kind: "class", start: c.start, end: c.end, room: c.room, building: c.building });
    }
  }
  const free: Entry[] = slots.map((s) => ({ kind: "free", start: s.start, end: s.end, minutes: s.minutes }));
  return [...merged, ...free].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

export default function Timeline({
  classes,
  slots,
  time,
  buildingNames,
}: {
  classes: ClassItem[];
  slots: FreeSlot[];
  time: string;
  buildingNames: Record<string, string>;
}) {
  const now = time ? toMinutes(time) : -1;
  const entries = buildEntries(classes, slots);

  return (
    <ol className="school-timeline">
      {entries.map((e) => {
        const current = now >= toMinutes(e.start) && now < toMinutes(e.end);
        const highlight = current && e.kind === "free";
        return (
          <li
            key={`${e.kind}-${e.start}`}
            className={`school-entry school-entry-${e.kind}${highlight ? " now" : ""}`}
          >
            <div className="school-entry-time">
              {e.start}
              <br />
              {e.end}
            </div>
            <div className="school-entry-body">
              {e.kind === "class" ? (
                <>
                  <strong>수업</strong>
                  <div className="muted">
                    {buildingNames[e.building] ?? `${e.building}동`} · {e.room}
                  </div>
                </>
              ) : (
                <>
                  <strong>빈 시간 {e.minutes}분</strong>
                  {highlight && <span className="school-now-tag">지금</span>}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
