<<<<<<< HEAD
"""🅱️ 학교 파트: 공강 계산 + 시간 안에 다녀올 수 있는 식당 추천"""
import json
import math
from pathlib import Path

from .models import (
    Building, ClassItem, FoodPlace, FreeSlot, PlaceRecommendation,
    SchoolRecommendResponse, SlotsResponse,
)

DATA = Path(__file__).resolve().parent.parent / "data"

GATE = 0                 # 정문 (campus.json buildings id 0)
DAY_START = "08:30"      # 첫 수업 전 슬롯 시작
DAY_END = "20:00"        # 마지막 수업 후 슬롯 끝
MIN_SLOT = 10            # 이보다 짧은 빈 시간은 무시
BUFFER = 5               # 다음 수업 전 여유
LUNCH = ("11:00", "14:00")
MIN_PER_PX = 0.02        # 좌표 1px ≈ 0.02분 (23→21 실측 2분 기준으로 맞춘 값)


def to_min(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def to_hhmm(m: int) -> str:
    m = max(0, min(m, 23 * 60 + 59))
    return f"{m // 60:02d}:{m % 60:02d}"


def load_campus():
    raw = json.loads((DATA / "campus.json").read_text(encoding="utf-8"))
    buildings = [Building(**b) for b in raw["buildings"]]
    places = [FoodPlace(**p) for p in raw["foodPlaces"]]
    overrides = {k: v for k, v in raw.get("walkOverrides", {}).items() if not k.startswith("_")}
    return buildings, places, overrides


def load_timetable() -> list[ClassItem]:
    raw = json.loads((DATA / "timetable.json").read_text(encoding="utf-8"))
    return [ClassItem(**c) for c in raw["classes"]]


BUILDINGS, PLACES, OVERRIDES = load_campus()
_POS = {b.id: (b.x, b.y) for b in BUILDINGS}


def walk(a: int, b: int) -> int:
    """건물 a→b 도보 분. 같은 건물이면 1분(층 이동)."""
    if a == b:
        return 1
    key = f"{min(a, b)}-{max(a, b)}"
    if key in OVERRIDES:
        return int(OVERRIDES[key])
    (x1, y1), (x2, y2) = _POS[a], _POS[b]
    return max(1, math.ceil(math.hypot(x1 - x2, y1 - y2) * MIN_PER_PX))


def free_slots(day: str, classes: list[ClassItem]) -> list[FreeSlot]:
    today = sorted((c for c in classes if c.day == day), key=lambda c: to_min(c.start))
    if not today:
        return []
    slots: list[FreeSlot] = []

    def add(start: str, end: str, frm: int, to: int):
        mins = to_min(end) - to_min(start)
        if mins >= MIN_SLOT:
            slots.append(FreeSlot(day=day, start=start, end=end, minutes=mins, fromBuilding=frm, toBuilding=to))

    add(DAY_START, today[0].start, GATE, today[0].building)
    for prev, nxt in zip(today, today[1:]):
        add(prev.end, nxt.start, prev.building, nxt.building)
    add(today[-1].end, DAY_END, today[-1].building, GATE)
    return slots


def lunch_warning(day: str, classes: list[ClassItem], slots: list[FreeSlot]) -> str | None:
    if not any(c.day == day for c in classes):
        return None
    ls, le = to_min(LUNCH[0]), to_min(LUNCH[1])
    for s in slots:
        overlap = min(to_min(s.end), le) - max(to_min(s.start), ls)
        if overlap >= 20:
            return None
    return "오늘은 점심시간(11~14시)에 빈 시간이 없어요. 수업 전에 미리 먹거나 사두세요."


def get_slots(day: str) -> SlotsResponse:
    classes = load_timetable()
    slots = free_slots(day, classes)
    return SlotsResponse(day=day, slots=slots, lunchWarning=lunch_warning(day, classes, slots))


def plan_place(p: FoodPlace, slot: FreeSlot, now: int) -> PlaceRecommendation | None:
    start = max(now, to_min(slot.start))
    go = walk(slot.fromBuilding, p.building)
    back = walk(p.building, slot.toBuilding)
    arrive = start + go
    begin = max(arrive, to_min(p.open))            # 문 열 때까지 기다림
    finish = begin + p.eatMinutes
    done = finish + back + BUFFER
    if finish > to_min(p.close) or done > to_min(slot.end):
        return None
    latest_leave = to_min(slot.end) - BUFFER - back - p.eatMinutes - go
    return PlaceRecommendation(
        placeId=p.id, placeName=p.name, type=p.type, building=p.building,
        walkMinutes=go, totalMinutes=done - start, leaveBy=to_hhmm(latest_leave), menus=p.menus,
    )


def recommend(day: str, now_hhmm: str) -> SchoolRecommendResponse:
    classes = load_timetable()
    slots = free_slots(day, classes)
    now = to_min(now_hhmm)
    # 점심 경고는 점심시간이 끝나기 전에만 보여줌
    warning = lunch_warning(day, classes, slots) if now < to_min(LUNCH[1]) else None

    slot = next((s for s in slots if to_min(s.start) <= now < to_min(s.end)), None)
    if slot is None:
        slot = next((s for s in slots if to_min(s.start) > now), None)
    if slot is None:
        return SchoolRecommendResponse(day=day, now=now_hhmm, slot=None, availableMinutes=0,
                                       lunchWarning=warning, message="오늘 남은 빈 시간이 없어요.",
                                       recommendations=[])

    start = max(now, to_min(slot.start))
    available = to_min(slot.end) - start
    recs = [r for p in PLACES if (r := plan_place(p, slot, now))]

    # 50분 이상 여유 → 제대로 된 한 끼 우선 / 짧으면 편의점 우선
    prefer_meal = available >= 50
    rank = {"학생식당": 0, "식당": 1, "편의점": 2, "카페": 3} if prefer_meal else \
           {"편의점": 0, "카페": 1, "학생식당": 2, "식당": 3}
    recs.sort(key=lambda r: (rank[r.type], r.totalMinutes))
    # 같은 종류만 3개 나오지 않게: 종류별 1등을 먼저 고르고 남는 자리를 채움
    picked = []
    for r in recs:
        if r.type not in {p.type for p in picked}:
            picked.append(r)
    picked += [r for r in recs if r not in picked]
    recs = sorted(picked[:3], key=lambda r: (rank[r.type], r.totalMinutes))

    after_last = slot.toBuilding == GATE and slot.fromBuilding != GATE
    if not recs:
        msg = f"{slot.start}~{slot.end} 빈 시간 {available}분 안에 다녀올 수 있는 곳이 없어요."
    elif start > now:
        msg = f"다음 빈 시간은 {slot.start}~{slot.end}({slot.minutes}분)이에요."
    elif after_last:
        msg = "오늘 수업 끝! 집에 가기 전에 먹을 수 있는 곳이에요."
    else:
        msg = f"다음 수업까지 {available}분 남았어요."
    return SchoolRecommendResponse(day=day, now=now_hhmm, slot=slot, availableMinutes=available,
                                   lunchWarning=warning, message=msg, recommendations=recs)
=======
from fastapi import APIRouter

from . import data, logic
from .models import (
    CampusResponse,
    DayOfWeek,
    SchoolRecommendation,
    SchoolRecommendRequest,
    SchoolRecommendResponse,
    SlotsResponse,
    TimetableResponse,
)

router = APIRouter(prefix="/api", tags=["B:학교"])


def _classes_of(day: str) -> list[dict]:
    return [cls for cls in data.load_timetable().get("classes", []) if cls.get("day") == day]


@router.get("/campus", response_model=CampusResponse)
def campus():
    return CampusResponse(**data.load_campus())


@router.get("/timetable", response_model=TimetableResponse)
def timetable():
    return TimetableResponse(**data.load_timetable())


@router.get("/school/slots", response_model=SlotsResponse)
def slots(day: DayOfWeek):
    slot_list = logic.free_slots(_classes_of(day))
    return SlotsResponse(day=day, slots=slot_list, lunch_warning=not logic.has_lunch_time(slot_list))


@router.post("/school/recommend", response_model=SchoolRecommendResponse)
def recommend(req: SchoolRecommendRequest):
    campus_data = data.load_campus()
    slot_list = logic.free_slots(_classes_of(req.day))
    now_minutes = logic.to_minutes(req.now)
    slot = next(
        (
            s
            for s in slot_list
            if logic.to_minutes(s["start"]) <= now_minutes < logic.to_minutes(s["end"])
        ),
        None,
    )
    if slot is None:
        return SchoolRecommendResponse(day=req.day, now=req.now, slot=None, recommendations=[])
    candidates = logic.place_candidates(campus_data, req.now, logic.to_minutes(slot["end"]), slot["to_building"])
    picked = logic.rank_places(candidates, logic.to_minutes(slot["end"]) - now_minutes)
    recommendations = [
        SchoolRecommendation(
            place_id=place["id"],
            place_name=place["name"],
            type=place["type"],
            walk_minutes=walk,
            arrive_by=arrive,
            reason=f"다음 수업에 {margin}분 여유로 돌아갈 수 있어요",
            menus=place["menus"][:3],
        )
        for place, walk, arrive, margin in picked
    ]
    return SchoolRecommendResponse(day=req.day, now=req.now, slot=slot, recommendations=recommendations)
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
