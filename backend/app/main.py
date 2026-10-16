<<<<<<< HEAD
"""
실행:  uvicorn app.main:app --reload --port 8000   (backend 폴더에서)
문서:  http://localhost:8000/docs  ← 모든 API를 브라우저에서 바로 테스트 가능
"""
import json
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
=======
import logging

from fastapi import FastAPI, Request
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

<<<<<<< HEAD
from . import home, nutrition, school
from .models import (
    CampusResponse, DailySummary, Day, HealthResponse, HomeMenuRequest, HomeMenuResponse,
    Lights, MealListResponse, MealLog, MealLogCreate, MenuLightsRequest, ReceiptResult,
    SchoolRecommendRequest, SchoolRecommendResponse, SlotsResponse, TimetableResponse,
)

app = FastAPI(title="자취생 하루 영양 API", version="1.0.0")

# 프론트(Next.js 3000번 포트 등)에서 호출 허용
=======
from . import ai
from .errors import ApiError
from .home import router as home_router
from .meals import router as meals_router
from .models import HealthResponse
from .nutrition import router as nutrition_router
from .school import router as school_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="자취생 하루 영양 채우기 API", version="0.1.0")

>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< HEAD
MEALS_FILE = Path(__file__).resolve().parent.parent / "data" / "meals.json"
MAX_UPLOAD = 10 * 1024 * 1024  # 10MB
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


# ---------- 에러는 항상 {"error": {"code", "message"}} 한 가지 형식 ----------
def err(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(StarletteHTTPException)  # 404(없는 주소) 등 프레임워크 에러까지 같은 형식으로
async def http_error(_: Request, e: StarletteHTTPException):
    code, message = (e.detail if isinstance(e.detail, tuple) else ("http_error", str(e.detail)))
    return err(e.status_code, code, message)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, e: RequestValidationError):
    first = e.errors()[0] if e.errors() else {}
    where = ".".join(str(p) for p in first.get("loc", []))
    return err(422, "invalid_request", f"{where}: {first.get('msg', '형식이 맞지 않아요')}")


@app.exception_handler(Exception)
async def unknown_error(_: Request, e: Exception):
    return err(500, "server_error", f"서버 오류: {type(e).__name__}")


def fail(status: int, code: str, message: str):
    raise HTTPException(status_code=status, detail=(code, message))


# ---------- 기록 저장 (파일에 저장해서 서버를 껐다 켜도 유지) ----------
def load_meals() -> list[MealLog]:
    if not MEALS_FILE.exists():
        return []
    return [MealLog(**m) for m in json.loads(MEALS_FILE.read_text(encoding="utf-8"))]


def save_meals(meals: list[MealLog]) -> None:
    MEALS_FILE.write_text(json.dumps([m.model_dump() for m in meals], ensure_ascii=False, indent=2),
                          encoding="utf-8")


# ================= 공통 =================
@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", mock=home.use_mock())


@app.post("/api/nutrition/lights", response_model=Lights)
def menu_lights(req: MenuLightsRequest):
    """메뉴 1개의 신호등 (한 끼 기준). 프론트에서 계산해도 되고 이걸 불러도 됨."""
    return nutrition.lights_for(req.menu, nutrition.PER_MEAL)


# ================= 🅰️ 영수증 파트 =================
@app.post("/api/receipt", response_model=ReceiptResult)
async def receipt(file: UploadFile = File(...)):
    if file.content_type not in IMAGE_TYPES:
        fail(415, "unsupported_image", "jpg, png, webp, gif 이미지만 올릴 수 있어요.")
    image = await file.read()
    if not image:
        fail(400, "empty_file", "빈 파일이에요.")
    if len(image) > MAX_UPLOAD:
        fail(413, "file_too_large", "10MB 이하 이미지만 올릴 수 있어요.")
    result, _ = home.parse_receipt(image, file.content_type)
    return result


@app.post("/api/menus/home", response_model=HomeMenuResponse)
def menus_home(req: HomeMenuRequest):
    result, _ = home.recommend_home(req)
    return result


# ================= 🅱️ 학교 파트 =================
@app.get("/api/campus", response_model=CampusResponse)
def campus():
    return CampusResponse(buildings=school.BUILDINGS, foodPlaces=school.PLACES)


@app.get("/api/timetable", response_model=TimetableResponse)
def timetable():
    return TimetableResponse(classes=school.load_timetable())


@app.get("/api/school/slots", response_model=SlotsResponse)
def school_slots(day: Day = Query(..., description="월 화 수 목 금")):
    return school.get_slots(day)


@app.post("/api/school/recommend", response_model=SchoolRecommendResponse)
def school_recommend(req: SchoolRecommendRequest):
    return school.recommend(req.day, req.now)


# ================= 공통: [먹었어요] & 하루 합계 =================
@app.post("/api/meals", response_model=MealLog, status_code=201)
def add_meal(req: MealLogCreate):
    meals = load_meals()
    meal = MealLog(id=uuid.uuid4().hex[:8], **req.model_dump())
    meals.append(meal)
    save_meals(meals)
    return meal


@app.get("/api/meals", response_model=MealListResponse)
def list_meals(date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$")):
    meals = sorted((m for m in load_meals() if m.date == date), key=lambda m: m.time)
    return MealListResponse(meals=meals)


@app.delete("/api/meals/{meal_id}", status_code=204)
def delete_meal(meal_id: str):
    meals = load_meals()
    left = [m for m in meals if m.id != meal_id]
    if len(left) == len(meals):
        fail(404, "meal_not_found", "그 기록을 찾을 수 없어요.")
    save_meals(left)


@app.get("/api/summary", response_model=DailySummary)
def summary(date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$")):
    return nutrition.daily_summary(date, [m for m in load_meals() if m.date == date])
=======
for r in (home_router, school_router, meals_router, nutrition_router):
    app.include_router(r)


@app.get("/api/health", response_model=HealthResponse, tags=["공통"])
def health():
    return HealthResponse(status="ok", mock=ai.mock_mode())


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(x) for x in first.get("loc", []) if x != "body")
    message = f"형식이 틀렸어요: {loc or '필드'} ({first.get('msg', '')})"
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "invalid_request", "message": message}},
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "http_error", "message": f"{request.url.path} 주소가 없어요"}},
        )
    if exc.status_code == 405:
        return JSONResponse(
            status_code=405,
            content={"error": {"code": "http_error", "message": f"{request.method} 메서드를 지원하지 않아요"}},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "http_error", "message": str(exc.detail)}},
    )


@app.exception_handler(Exception)
async def server_error_handler(request: Request, exc: Exception):
    logger.exception("server_error")
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "server_error", "message": "서버 오류가 발생했어요. 백엔드 터미널 로그를 확인하세요."}},
    )
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
