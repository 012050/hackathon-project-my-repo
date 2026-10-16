"""순수 로직 (FastAPI 없이 테스트 가능)."""
import math

DAILY_REFERENCES = {"kcal": 2000.0, "carb": 324.0, "protein": 55.0, "fat": 54.0, "sodium": 2000.0}
NUTRIENT_KEYS = ("kcal", "carb", "protein", "fat", "sodium")

DAY_START = "08:30"
DAY_END = "20:00"
MIN_SLOT_MINUTES = 10
LUNCH_START = "11:00"
LUNCH_END = "14:00"
LUNCH_MIN_MINUTES = 20
BUFFER_MINUTES = 5
WALK_SPEED_M_PER_MIN = 75

PRIORITY_LONG = {"student_dining": 0, "restaurant": 1, "cafe": 2, "convenience": 3}
PRIORITY_SHORT = {"convenience": 0, "student_dining": 1, "restaurant": 1, "cafe": 2}


def to_minutes(hhmm: str) -> int:
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


def to_hhmm(minutes: int) -> str:
    minutes = max(0, min(minutes, 24 * 60 - 1))
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def is_open(open_str: str, close_str: str, at: str) -> bool:
    o, c, t = to_minutes(open_str), to_minutes(close_str), to_minutes(at)
    if o <= c:
        return o <= t < c
    return t >= o or t < c


def free_slots(classes: list[dict]) -> list[dict]:
    """한 요일 수업 목록 → 10분 이상 공강 목록 (08:30~20:00)."""
    ordered = sorted(classes, key=lambda c: to_minutes(c["start"]))
    slots: list[dict] = []
    cursor = to_minutes(DAY_START)
    prev_building = None
    for cls in ordered:
        start, end = to_minutes(cls["start"]), to_minutes(cls["end"])
        if start - cursor >= MIN_SLOT_MINUTES:
            slots.append(_slot(cursor, start, prev_building, cls["building"]))
        prev_building = cls["building"]
        cursor = max(cursor, end)
    if to_minutes(DAY_END) - cursor >= MIN_SLOT_MINUTES:
        slots.append(_slot(cursor, to_minutes(DAY_END), prev_building, None))
    return slots


def _slot(start: int, end: int, from_building, to_building) -> dict:
    return {
        "start": to_hhmm(start),
        "end": to_hhmm(end),
        "minutes": end - start,
        "from_building": from_building,
        "to_building": to_building,
    }


def has_lunch_time(slots: list[dict]) -> bool:
    """점심(11~14시)에 20분 이상 빈 시간이 있는지."""
    lunch_start, lunch_end = to_minutes(LUNCH_START), to_minutes(LUNCH_END)
    for slot in slots:
        overlap_start = max(lunch_start, to_minutes(slot["start"]))
        overlap_end = min(lunch_end, to_minutes(slot["end"]))
        if overlap_end - overlap_start >= LUNCH_MIN_MINUTES:
            return True
    return False


def walk_minutes(campus: dict, a, b) -> int:
    if not a or not b or a == b:
        return 0
    overrides = campus.get("walkOverrides", {})
    if f"{a}-{b}" in overrides:
        return int(overrides[f"{a}-{b}"])
    if f"{b}-{a}" in overrides:
        return int(overrides[f"{b}-{a}"])
    buildings = {bl["id"]: bl for bl in campus.get("buildings", [])}
    if a not in buildings or b not in buildings:
        return 5
    meters = math.hypot(buildings[a]["x"] - buildings[b]["x"], buildings[a]["y"] - buildings[b]["y"])
    return max(1, round(meters / WALK_SPEED_M_PER_MIN))


def place_candidates(campus: dict, now_hhmm: str, slot_end_minutes: int, next_building) -> list[tuple]:
    """now 시점에 슬롯 끝까지 갔다 올 수 있는 (식당, 왕복도보, 도착시각, 여유분) 목록.

    기준: 출발(=다음 수업 건물) → 식당 도보 + 식사 + 식당 → 다음 수업 도보 + 여유 5분
    ≤ 공강 끝 시각, 그리고 도착 시점에 식당이 운영 중.
    """
    now_minutes = to_minutes(now_hhmm)
    candidates: list[tuple] = []
    for place in campus.get("foodPlaces", []):
        walk = walk_minutes(campus, next_building, place["building"])
        walk_back = walk_minutes(campus, place["building"], next_building)
        arrive = now_minutes + walk
        if not is_open(place["open"], place["close"], to_hhmm(arrive)):
            continue
        finish = arrive + place["eatMinutes"] + walk_back + BUFFER_MINUTES
        if finish > slot_end_minutes:
            continue
        candidates.append((place, walk, to_hhmm(arrive), slot_end_minutes - finish))
    return candidates


def rank_places(candidates: list[tuple], remaining_minutes: int, limit: int = 3) -> list[tuple]:
    """50분 이상 남으면 학식·식당 먼저, 짧으면 편의점 먼저. 같은 종류 3개 안 나오게 섞음."""
    priority = PRIORITY_LONG if remaining_minutes >= 50 else PRIORITY_SHORT
    ordered = sorted(candidates, key=lambda c: (priority[c[0]["type"]], c[1]))
    picked: list[tuple] = []
    for cand in ordered:
        if len(picked) >= limit:
            break
        same_type = sum(1 for p, *_ in picked if p["type"] == cand[0]["type"])
        if same_type >= 2:
            continue
        picked.append(cand)
    return picked


def light_for(value: float, reference: float) -> str:
    """기준치의 80~120%: green / 50~80% or 120~150%: yellow / 그 외: red."""
    if reference <= 0:
        return "green"
    ratio = value / reference
    if 0.8 <= ratio <= 1.2:
        return "green"
    if 0.5 <= ratio < 0.8 or 1.2 < ratio <= 1.5:
        return "yellow"
    return "red"


def lights_for(nutrition: dict) -> dict:
    """하루 합계 → 1일 기준치 대비 신호등."""
    return {key: light_for(float(nutrition.get(key, 0.0)), DAILY_REFERENCES[key]) for key in NUTRIENT_KEYS}


def meal_lights_for(nutrition: dict) -> dict:
    """한 끼 → 1일 기준치의 1/3 대비 신호등."""
    return {key: light_for(float(nutrition.get(key, 0.0)), DAILY_REFERENCES[key] / 3) for key in NUTRIENT_KEYS}


def lacking_nutrients(total: dict) -> list[str]:
    """하루 기준치의 80% 미만인 영양소 키 목록 (kcal, carb, protein, fat, sodium 순)."""
    return [key for key in NUTRIENT_KEYS if float(total.get(key, 0.0)) < 0.8 * DAILY_REFERENCES[key]]
