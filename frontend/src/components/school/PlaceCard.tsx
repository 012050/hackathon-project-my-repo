import { menuLights } from "@/lib/api";
import type { Menu, SchoolRecommendation } from "@/lib/types";
import { LIGHT_LABELS, NUTRIENTS, PLACE_TYPE_LABELS } from "./labels";

function MenuRow({
  menu,
  disabled,
  eating,
  onEat,
}: {
  menu: Menu;
  disabled: boolean;
  eating: boolean;
  onEat: (menu: Menu) => void;
}) {
  const lights = menuLights(menu);
  return (
    <div className="school-menu">
      <div className="school-menu-head">
        <span className="school-menu-name">{menu.name}</span>
        {menu.price != null && <span className="muted">{menu.price.toLocaleString()}원</span>}
      </div>
      <ul className="school-nutrients">
        {NUTRIENTS.map(({ key, label, unit }) => (
          <li key={key} title={LIGHT_LABELS[lights[key]]}>
            <span className={`school-dot dot-${lights[key]}`} />
            {label} {Math.round(menu[key])}
            {unit}
          </li>
        ))}
      </ul>
      <button className="btn small" disabled={disabled} onClick={() => onEat(menu)}>
        {eating ? "기록 중..." : "먹었어요"}
      </button>
    </div>
  );
}

export default function PlaceCard({
  rec,
  eatingKey,
  onEat,
}: {
  rec: SchoolRecommendation;
  eatingKey: string | null;
  onEat: (key: string, menu: Menu) => void;
}) {
  return (
    <div className="card">
      <h3>
        {rec.placeName} <span className="school-type">{PLACE_TYPE_LABELS[rec.type] ?? rec.type}</span>
      </h3>
      <div className="muted">
        도보 {rec.walkMinutes}분 · {rec.arriveBy}까지 도착
      </div>
      {rec.reason && <div className="school-reason">{rec.reason}</div>}
      {rec.menus.map((menu) => {
        const key = `${rec.placeId}/${menu.id ?? menu.name}`;
        return (
          <MenuRow
            key={key}
            menu={menu}
            disabled={eatingKey !== null}
            eating={eatingKey === key}
            onEat={(m) => onEat(key, m)}
          />
        );
      })}
    </div>
  );
}
