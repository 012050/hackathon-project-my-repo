<<<<<<< HEAD
"""영양 기준과 신호등 규칙. 프론트 types.ts 의 light() 와 반드시 같은 규칙."""
from .models import DailySummary, Lights, MealLog, Nutrition

# 식약처 1일 영양성분 기준치
DAILY = {"kcal": 2000, "carb": 324, "protein": 55, "fat": 54, "sodium": 2000}
PER_MEAL = {k: v / 3 for k, v in DAILY.items()}
KEYS = ("kcal", "carb", "protein", "fat", "sodium")


def light(key: str, value: float, target: float) -> str:
    r = value / target if target else 0
    if key == "protein":  # 많을수록 좋음
        return "green" if r >= 1 else "yellow" if r >= 0.5 else "red"
    if key == "sodium":   # 적을수록 좋음
        return "green" if r <= 1 else "yellow" if r <= 1.5 else "red"
    if 0.7 <= r <= 1.3:
        return "green"
    if 0.5 <= r <= 1.5:
        return "yellow"
    return "red"


def lights_for(n: Nutrition, target: dict) -> Lights:
    return Lights(**{k: light(k, getattr(n, k), target[k]) for k in KEYS})


def summary_target(meal_count: int) -> dict:
    """지금까지 먹은 끼니 수만큼의 기준 (1끼 = 1/3, 최대 3끼 = 하루 기준)."""
    n = min(max(meal_count, 1), 3)
    return {k: PER_MEAL[k] * n for k in KEYS}


def daily_summary(date: str, meals: list[MealLog]) -> DailySummary:
    total = Nutrition(**{k: round(sum(getattr(m.menu, k) for m in meals), 1) for k in KEYS})
    target = summary_target(len(meals))
    lights = lights_for(total, target)
    # 부족 = 지금까지 끼니 기준의 70% 미만 (나트륨은 부족 판정 안 함)
    lacking = [k for k in ("kcal", "carb", "protein", "fat") if getattr(total, k) < target[k] * 0.7]
    return DailySummary(date=date, total=total, lights=lights, lacking=lacking)
=======
from fastapi import APIRouter, Query

from . import data, logic
from .models import DailySummary, Lights, MealLightsRequest, Nutrition

router = APIRouter(prefix="/api", tags=["B:영양"])


@router.get("/summary", response_model=DailySummary)
def summary(date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$")):
    meals = [m for m in data.load_meals() if m.get("date") == date]
    total = {key: 0.0 for key in logic.NUTRIENT_KEYS}
    for meal in meals:
        menu = meal.get("menu", {})
        for key in total:
            total[key] += float(menu.get(key, 0) or 0)
    return DailySummary(
        date=date,
        count=len(meals),
        total=Nutrition(**total),
        lights=logic.lights_for(total),
        lacking=logic.lacking_nutrients(total),
    )


@router.post("/nutrition/lights", response_model=Lights)
def lights(req: MealLightsRequest):
    return Lights(**logic.meal_lights_for(req.menu.model_dump()))
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
