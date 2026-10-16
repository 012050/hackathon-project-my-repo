import math

from app import data, logic
from app.models import CampusResponse, TimetableResponse


def _cls(start, end, building="23"):
    return {"day": "화", "start": start, "end": end, "room": f"23-{start[:2]}", "building": building}


def test_time_helpers():
    assert logic.to_minutes("08:30") == 510
    assert logic.to_hhmm(510) == "08:30"
    assert logic.to_hhmm(1245) == "20:45"
    assert logic.is_open("00:00", "23:59", "00:30")
    assert logic.is_open("22:00", "02:00", "01:00")
    assert not logic.is_open("10:30", "15:00", "16:00")


def test_free_slots_back_to_back_tuesday():
    classes = [_cls("11:00", "12:00"), _cls("12:00", "13:00"), _cls("13:00", "14:00"), _cls("14:00", "15:00"), _cls("15:00", "16:00")]
    slots = logic.free_slots(classes)
    assert slots[0] == {"start": "08:30", "end": "11:00", "minutes": 150, "from_building": None, "to_building": "23"}
    assert slots[-1]["start"] == "16:00"
    assert slots[-1]["minutes"] == 240
    assert len(slots) == 2
    assert not logic.has_lunch_time(slots)  # 11~16시 연강 → 점심 시간 없음


def test_free_slots_wednesday_has_lunch():
    classes = [_cls("09:00", "10:00", "11"), _cls("10:00", "11:00", "11"), _cls("11:00", "12:00", "11"), _cls("14:00", "15:00"), _cls("15:00", "16:00")]
    slots = logic.free_slots(classes)
    lunch_slot = [s for s in slots if s["start"] == "12:00" and s["end"] == "14:00"]
    assert lunch_slot and lunch_slot[0]["minutes"] == 120
    assert logic.has_lunch_time(slots)


def test_free_slots_no_classes():
    slots = logic.free_slots([])
    assert slots == [{"start": "08:30", "end": "20:00", "minutes": 690, "from_building": None, "to_building": None}]


def test_walk_minutes():
    campus = data.load_campus()
    assert logic.walk_minutes(campus, "23", "23") == 0
    assert logic.walk_minutes(campus, None, "23") == 0
    assert logic.walk_minutes(campus, "23", "10") == 4  # walkOverrides
    expected = max(1, round(math.hypot(120, 80) / logic.WALK_SPEED_M_PER_MIN))
    assert logic.walk_minutes(campus, "99", "10") == 5  # 모르는 건물 → 기본값
    assert expected == 2


def test_place_candidates_long_slot():
    campus = data.load_campus()
    candidates = logic.place_candidates(campus, "10:00", logic.to_minutes("11:00"), "23")
    types = {p["type"] for p, *_ in candidates}
    assert "student_dining" in types  # 같은 건물 F01: 도보 0 + 25분 + 여유 5분
    for place, walk, arrive, margin in candidates:
        walk_back = logic.walk_minutes(campus, place["building"], "23")
        finish = logic.to_minutes(arrive) + place["eatMinutes"] + walk_back + logic.BUFFER_MINUTES
        assert finish <= logic.to_minutes("11:00")


def test_place_candidates_short_slot_only_convenience():
    campus = data.load_campus()
    # 10:15~10:40 (25분): 편의점(10분)만 가능
    candidates = logic.place_candidates(campus, "10:15", logic.to_minutes("10:40"), "23")
    assert candidates
    assert all(p["type"] == "convenience" for p, *_ in candidates)


def test_rank_places_priority_and_mix():
    short = [
        ({"type": "convenience"}, 0, "10:00", 10),
        ({"type": "convenience"}, 1, "10:01", 9),
        ({"type": "convenience"}, 2, "10:02", 8),
        ({"type": "cafe"}, 3, "10:03", 7),
    ]
    picked = logic.rank_places(short, remaining_minutes=30)
    assert len(picked) == 3
    types = [p["type"] for p, *_ in picked]
    assert types.count("convenience") == 2  # 같은 종류 3개 불가
    assert "cafe" in types

    long = [
        ({"type": "student_dining"}, 0, "10:00", 100),
        ({"type": "student_dining"}, 1, "10:01", 99),
        ({"type": "student_dining"}, 2, "10:02", 98),
        ({"type": "convenience"}, 3, "10:03", 97),
    ]
    picked = logic.rank_places(long, remaining_minutes=200)
    types = [p["type"] for p, *_ in picked]
    assert types.count("student_dining") == 2
    assert "convenience" in types


def test_lights():
    assert logic.lights_for({"kcal": 2000, "carb": 324, "protein": 55, "fat": 54, "sodium": 2000}) == {
        k: "green" for k in logic.NUTRIENT_KEYS
    }
    lights = logic.lights_for({"kcal": 0, "carb": 0, "protein": 0, "fat": 0, "sodium": 0})
    assert all(v == "red" for v in lights.values())
    assert logic.light_for(2600, 2000) == "yellow"
    assert logic.light_for(3200, 2000) == "red"
    assert logic.meal_lights_for({"kcal": 666.7, "carb": 108, "protein": 18.33, "fat": 18, "sodium": 666.7}) == {
        k: "green" for k in logic.NUTRIENT_KEYS
    }


def test_lacking_nutrients():
    assert logic.lacking_nutrients({"kcal": 0, "carb": 0, "protein": 0, "fat": 0, "sodium": 0}) == [
        "kcal", "carb", "protein", "fat", "sodium"
    ]
    assert logic.lacking_nutrients(dict(logic.DAILY_REFERENCES)) == []
    assert "protein" in logic.lacking_nutrients({**logic.DAILY_REFERENCES, "protein": 10})


def test_data_files_are_valid():
    campus = data.load_campus()
    CampusResponse(**campus)
    timetable = data.load_timetable()
    TimetableResponse(**timetable)
    for place in campus["foodPlaces"]:
        assert place["type"] in ("student_dining", "restaurant", "cafe", "convenience")
        for menu in place["menus"]:
            assert menu["source"] == "school"
            assert menu["placeId"] == place["id"]
            assert menu["id"].startswith(place["id"] + "-m")
