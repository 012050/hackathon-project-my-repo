import uuid

from fastapi import APIRouter, Query

from . import data
from .errors import api_error
from .models import MealListResponse, MealLog, MealLogCreate

router = APIRouter(prefix="/api", tags=["공통:먹었어요"])


@router.post("/meals", status_code=201, response_model=MealLog)
def add_meal(payload: MealLogCreate):
    meals = data.load_meals()
    meal = MealLog(id=f"meal-{uuid.uuid4().hex[:8]}", **payload.model_dump())
    meals.append(meal.model_dump(by_alias=True))
    data.save_meals(meals)
    return meal


@router.get("/meals", response_model=MealListResponse)
def list_meals(date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$")):
    meals = [m for m in data.load_meals() if m.get("date") == date]
    meals.sort(key=lambda m: m.get("time", ""))
    return MealListResponse(meals=[MealLog(**m) for m in meals])


@router.delete("/meals/{meal_id}", status_code=204)
def delete_meal(meal_id: str):
    meals = data.load_meals()
    rest = [m for m in meals if m.get("id") != meal_id]
    if len(rest) == len(meals):
        raise api_error(404, "meal_not_found", f"meal-{meal_id} 기록이 없어요")
    data.save_meals(rest)
