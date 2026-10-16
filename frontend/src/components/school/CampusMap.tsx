import type { SchoolRecommendation } from "@/lib/types";
import { MAP_COORDS, MAP_HEIGHT, MAP_WIDTH } from "./mapCoords";

type Kind = "from" | "to" | "place";

interface Marker {
  key: string;
  kind: Kind;
  building: string;
  label: string;
  selected?: boolean;
  x: number;
  y: number;
}

/** 같은 건물에 점이 여러 개면 겹치지 않게 조금씩 비켜 놓음 (viewBox 단위) */
const OFFSETS = [
  [0, 0],
  [42, -36],
  [-42, -36],
  [58, 10],
  [-58, 10],
  [0, -56],
];

function placeMarkers(items: Omit<Marker, "x" | "y">[]): Marker[] {
  const used: Record<string, number> = {};
  const out: Marker[] = [];
  for (const item of items) {
    const base = MAP_COORDS[item.building];
    if (!base) continue; // 지도 좌표가 없는 건물은 점을 찍지 않음
    const n = used[item.building] ?? 0;
    used[item.building] = n + 1;
    const [dx, dy] = OFFSETS[n % OFFSETS.length];
    out.push({ ...item, x: base.x + dx, y: base.y + dy });
  }
  return out;
}

export default function CampusMap({
  recommendations,
  selectedId,
  fromBuilding,
  toBuilding,
  placeBuildings,
  buildingNames,
}: {
  recommendations: SchoolRecommendation[];
  selectedId: string | null;
  fromBuilding?: string | null;
  toBuilding?: string | null;
  placeBuildings: Record<string, string>;
  buildingNames: Record<string, string>;
}) {
  const from = fromBuilding ?? null;
  const to = toBuilding ?? null;
  const sameBuilding = from !== null && from === to;

  const items: Omit<Marker, "x" | "y">[] = [];
  if (from) items.push({ key: "from", kind: "from", building: from, label: sameBuilding ? "지금·다음 수업" : "지금" });
  if (to && !sameBuilding) items.push({ key: "to", kind: "to", building: to, label: "다음 수업" });
  recommendations.slice(0, 3).forEach((rec, i) => {
    const building = placeBuildings[rec.placeId];
    if (building) {
      items.push({
        key: rec.placeId,
        kind: "place",
        building,
        label: String(i + 1),
        selected: rec.placeId === selectedId,
      });
    }
  });

  const markers = placeMarkers(items);
  const fromM = markers.find((m) => m.kind === "from") ?? null;
  const toM = sameBuilding ? fromM : markers.find((m) => m.kind === "to") ?? null;
  const selM = markers.find((m) => m.kind === "place" && m.selected) ?? null;
  const route = [fromM, selM, toM].filter((m): m is Marker => m !== null);
  const points = selM ? route.map((m) => `${m.x},${m.y}`).join(" ") : "";

  const selRec = recommendations.find((r) => r.placeId === selectedId);
  const routeText = selRec
    ? [
        from ? buildingNames[from] ?? `${from}번 건물` : null,
        `${selRec.placeName} (도보 ${selRec.walkMinutes}분)`,
        to ? buildingNames[to] ?? `${to}번 건물` : null,
      ]
        .filter(Boolean)
        .join(" → ")
    : null;

  // 선택한 식당이 맨 위에 그려지도록 정렬
  const ordered = [...markers].sort((a, b) => Number(!!a.selected) - Number(!!b.selected));

  return (
    <div className="card school-map-card">
      <div className="school-map">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/campus-map.png" alt="캠퍼스 지도" width={MAP_WIDTH} height={MAP_HEIGHT} />
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">
          {route.length >= 2 && <polyline className="school-map-route" points={points} />}
          {ordered.map((m) => (
            <g key={m.key} className={`school-marker school-marker-${m.kind}${m.selected ? " selected" : ""}`}>
              <circle cx={m.x} cy={m.y} r={m.kind === "place" ? (m.selected ? 34 : 25) : 22} />
              {m.kind === "place" ? (
                <text x={m.x} y={m.y} className="school-marker-num">
                  {m.label}
                </text>
              ) : (
                <text x={m.x} y={m.y + 50} className="school-marker-label">
                  {m.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="school-map-legend">
        <span>
          <i className="school-legend-dot from" />
          지금
        </span>
        <span>
          <i className="school-legend-dot to" />
          다음 수업
        </span>
        <span>
          <i className="school-legend-dot place" />
          추천 식당
        </span>
      </div>
      {routeText && <div className="school-map-route-text">{routeText}</div>}
    </div>
  );
}
