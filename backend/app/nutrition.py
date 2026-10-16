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
