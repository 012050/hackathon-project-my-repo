import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
