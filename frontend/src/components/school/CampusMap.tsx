import type { SchoolRecommendation } from "@/lib/types";
import { GATE, MAP_HEIGHT, MAP_WIDTH, coordsForName, type Point } from "./mapCoords";

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

const GATE_ID = "__gate";

function placeMarkers(items: Omit<Marker, "x" | "y">[], resolve: (building: string) => Point | null): Marker[] {
  const used: Record<string, number> = {};
  const out: Marker[] = [];
  for (const item of items) {
    const base = resolve(item.building);
    if (!base) continue; // 지도 좌표가 없는 건물은 점을 찍지 않음
    const spot = `${base.x},${base.y}`;
    const n = used[spot] ?? 0;
    used[spot] = n + 1;
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
  // 그날 첫 공강이면 출발 건물이 없으므로 정문에서 등교하는 것으로 봄
  const from = fromBuilding ?? GATE_ID;
  const to = toBuilding ?? null;
  const sameBuilding = from === to;
  const fromLabel = from === GATE_ID ? "정문(등교)" : "지금";

  const items: Omit<Marker, "x" | "y">[] = [];
  items.push({ key: "from", kind: "from", building: from, label: sameBuilding ? "지금·다음 수업" : fromLabel });
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

  const markers = placeMarkers(items, (b) => (b === GATE_ID ? GATE : coordsForName(buildingNames[b])));
  const fromM = markers.find((m) => m.kind === "from") ?? null;
  const toM = sameBuilding ? fromM : markers.find((m) => m.kind === "to") ?? null;
  const selM = markers.find((m) => m.kind === "place" && m.selected) ?? null;
  const route = [fromM, selM, toM].filter((m): m is Marker => m !== null);
  const points = selM ? route.map((m) => `${m.x},${m.y}`).join(" ") : "";

  const selRec = recommendations.find((r) => r.placeId === selectedId);
  const routeText = selRec
    ? [
        from === GATE_ID ? "정문" : buildingNames[from] ?? `${from}번 건물`,
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
