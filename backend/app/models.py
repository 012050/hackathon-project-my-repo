<<<<<<< HEAD
"""
API 데이터 규격 (프론트 src/lib/types.ts 와 필드 이름·타입이 1:1로 같아야 함)
- JSON 필드는 전부 camelCase
- 시간 "HH:MM", 날짜 "YYYY-MM-DD"
- 영양소 단위: kcal / g(carb, protein, fat) / mg(sodium)
"""
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

TIME = r"^([01]\d|2[0-3]):[0-5]\d$"
DATE = r"^\d{4}-\d{2}-\d{2}$"

MenuSource = Literal["home", "school"]
Day = Literal["월", "화", "수", "목", "금"]
PlaceType = Literal["편의점", "학생식당", "식당", "카페"]
Light = Literal["green", "yellow", "red"]
NutrientKey = Literal["kcal", "carb", "protein", "fat", "sodium"]


class Strict(BaseModel):
    # 정의 안 된 필드가 들어오면 에러 → 오타를 바로 잡아줌
    model_config = ConfigDict(extra="forbid")


# ---------- 공통 ----------
class Nutrition(Strict):
    kcal: float = Field(ge=0)
    carb: float = Field(ge=0)
    protein: float = Field(ge=0)
    fat: float = Field(ge=0)
    sodium: float = Field(ge=0)


class Menu(Nutrition):
    id: str
    name: str
    source: MenuSource
    price: Optional[int] = Field(default=None, ge=0)
    estimated: bool
    placeId: Optional[str] = None


# ---------- 🅰️ 영수증 파트 ----------
class Ingredient(Strict):
    name: str
    qty: float = Field(gt=0)
    unit: str
    price: Optional[int] = Field(default=None, ge=0)


class ReceiptResult(Strict):
    ingredients: list[Ingredient]


class RecipeMenu(Menu):
    source: Literal["home"] = "home"
    minutes: int = Field(ge=1)
    ingredientsUsed: list[str]
    steps: list[str]


class HomeMenuRequest(Strict):
    ingredients: list[Ingredient] = Field(min_length=1)
    lacking: list[NutrientKey] = []  # 하루 합계에서 부족한 영양 → 추천에 반영


class HomeMenuResponse(Strict):
    menus: list[RecipeMenu]


# ---------- 🅱️ 학교 파트 ----------
class Building(Strict):
    id: int
=======
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
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
    name: str
    x: float
    y: float


<<<<<<< HEAD
class ClassItem(Strict):
    day: Day
    start: str = Field(pattern=TIME)
    end: str = Field(pattern=TIME)
    name: str
    room: str
    building: int


class FoodPlace(Strict):
    id: str
    name: str
    building: int
    floor: str
    type: PlaceType
    eatMinutes: int = Field(ge=1)
    open: str = Field(pattern=TIME)
    close: str = Field(pattern=TIME)
    menus: list[Menu]


class FreeSlot(Strict):
    day: Day
    start: str = Field(pattern=TIME)
    end: str = Field(pattern=TIME)
    minutes: int
    fromBuilding: int
    toBuilding: int


class CampusResponse(Strict):
    buildings: list[Building]
    foodPlaces: list[FoodPlace]


class TimetableResponse(Strict):
    classes: list[ClassItem]


class SlotsResponse(Strict):
    day: Day
    slots: list[FreeSlot]
    lunchWarning: Optional[str] = None  # 점심 시간대에 빈 시간이 없으면 안내 문구


class SchoolRecommendRequest(Strict):
    day: Day
    now: str = Field(pattern=TIME)


class PlaceRecommendation(Strict):
    placeId: str
    placeName: str
    type: PlaceType
    building: int
    walkMinutes: int    # 편도 도보
    totalMinutes: int   # 가서 먹고 다음 수업 건물까지 (여유 5분 포함)
    leaveBy: str        # 늦어도 이 시간엔 출발
    menus: list[Menu]


class SchoolRecommendResponse(Strict):
    day: Day
    now: str
    slot: Optional[FreeSlot] = None
    availableMinutes: int
    lunchWarning: Optional[str] = None
    message: str
    recommendations: list[PlaceRecommendation]


# ---------- 공통: [먹었어요] & 하루 합계 ----------
class MealLogCreate(Strict):
    date: str = Field(pattern=DATE)
    time: str = Field(pattern=TIME)
=======
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
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
    menu: Menu


class MealLog(MealLogCreate):
    id: str


<<<<<<< HEAD
class MealListResponse(Strict):
    meals: list[MealLog]


class Lights(Strict):
=======
class MealListResponse(BaseModel):
    model_config = BASE_MODEL

    meals: list[MealLog]


class Lights(BaseModel):
    model_config = BASE_MODEL

>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
    kcal: Light
    carb: Light
    protein: Light
    fat: Light
    sodium: Light


<<<<<<< HEAD
class DailySummary(Strict):
    date: str
    total: Nutrition
    lights: Lights
    lacking: list[NutrientKey]


class MenuLightsRequest(Strict):
    menu: Nutrition


class HealthResponse(Strict):
    status: Literal["ok"]
    mock: bool


class ErrorBody(Strict):
    code: str
    message: str


class ErrorResponse(Strict):
    error: ErrorBody
=======
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
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
