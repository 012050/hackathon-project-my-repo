from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

DayOfWeek = Literal["월", "화", "수", "목", "금"]
Source = Literal["home", "school"]
PlaceType = Literal["student_dining", "restaurant", "cafe", "convenience"]
Light = Literal["green", "yellow", "red"]

BASE_MODEL = ConfigDict(alias_generator=to_camel, populate_by_name=True)
STRICT_MODEL = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class Nutrition(BaseModel):
    """영양소. 단위: kcal / g / mg, 숫자만."""

    model_config = BASE_MODEL

    kcal: float
    carb: float = 0.0
    protein: float = 0.0
    fat: float = 0.0
    sodium: float = 0.0


class Menu(BaseModel):
    """공통 메뉴 형식. 집·학교 모두 같은 형식, source만 home / school."""

    model_config = STRICT_MODEL

    id: Optional[str] = None
    name: str
    source: Source
    place_id: Optional[str] = None
    price: Optional[float] = None
    kcal: float
    carb: float
    protein: float
    fat: float
    sodium: float
    estimated: bool = True
    minutes: Optional[int] = None
    ingredients_used: Optional[list[str]] = None
    steps: Optional[list[str]] = None


class RecipeMenu(Menu):
    """집 메뉴 = Menu + 조리 시간, 사용 재료, 단계."""

    minutes: int
    ingredients_used: list[str]
    steps: list[str]


class Ingredient(BaseModel):
    name: str
    qty: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None


class ReceiptResult(BaseModel):
    model_config = BASE_MODEL

    ingredients: list[Ingredient]


class HomeMenuRequest(BaseModel):
    model_config = STRICT_MODEL

    ingredients: list[str] = Field(min_length=1)
    lacking: Optional[list[str]] = None


class HomeMenuResponse(BaseModel):
    model_config = BASE_MODEL

    menus: list[RecipeMenu]


class Building(BaseModel):
    model_config = BASE_MODEL

    id: str
    name: str
    x: float
    y: float


class FoodPlace(BaseModel):
    model_config = BASE_MODEL

    id: str
    name: str
    building: str
    type: PlaceType
    eat_minutes: int
    open: str
    close: str
    menus: list[Menu]


class CampusResponse(BaseModel):
    model_config = BASE_MODEL

    buildings: list[Building]
    food_places: list[FoodPlace]
    walk_overrides: dict[str, int] = {}


class ClassItem(BaseModel):
    model_config = BASE_MODEL

    day: DayOfWeek
    start: str
    end: str
    room: str
    building: str


class TimetableResponse(BaseModel):
    model_config = BASE_MODEL

    classes: list[ClassItem]


class FreeSlot(BaseModel):
    model_config = BASE_MODEL

    start: str
    end: str
    minutes: int
    from_building: Optional[str] = None
    to_building: Optional[str] = None


class SlotsResponse(BaseModel):
    model_config = BASE_MODEL

    day: str
    slots: list[FreeSlot]
    lunch_warning: bool


class SchoolRecommendRequest(BaseModel):
    model_config = STRICT_MODEL

    day: DayOfWeek
    now: str = Field(pattern=r"^\d{2}:\d{2}$")


class SchoolRecommendation(BaseModel):
    model_config = BASE_MODEL

    place_id: str
    place_name: str
    type: PlaceType
    walk_minutes: int
    arrive_by: str
    reason: Optional[str] = None
    menus: list[Menu]


class SchoolRecommendResponse(BaseModel):
    model_config = BASE_MODEL

    day: str
    now: str
    slot: Optional[FreeSlot] = None
    recommendations: list[SchoolRecommendation]


class MealLogCreate(BaseModel):
    model_config = STRICT_MODEL

    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    menu: Menu


class MealLog(MealLogCreate):
    id: str


class MealListResponse(BaseModel):
    model_config = BASE_MODEL

    meals: list[MealLog]


class Lights(BaseModel):
    model_config = BASE_MODEL

    kcal: Light
    carb: Light
    protein: Light
    fat: Light
    sodium: Light


class MealLightsRequest(BaseModel):
    model_config = STRICT_MODEL

    menu: Nutrition


class DailySummary(BaseModel):
    model_config = BASE_MODEL

    date: str
    count: int
    total: Nutrition
    lights: Lights
    lacking: list[str]


class HealthResponse(BaseModel):
    model_config = BASE_MODEL

    status: str
    mock: bool
