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
