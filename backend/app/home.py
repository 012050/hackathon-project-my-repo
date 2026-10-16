<<<<<<< HEAD
"""🅰️ 영수증 파트: 영수증 → 재료 → 메뉴

- ANTHROPIC_API_KEY 가 없거나 MOCK=1 이면 아래 MOCK 응답을 돌려줌 (발표 중 사고 방지)
- AI 응답이 규격(models.py)과 안 맞으면 자동으로 MOCK 으로 대체하고 로그를 남김
  → 프론트는 항상 같은 형식만 받으므로 화면이 깨지지 않음
"""
import base64
import json
import logging
import os
import re

from pydantic import ValidationError

from .models import HomeMenuRequest, HomeMenuResponse, ReceiptResult

log = logging.getLogger("home")
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")


def use_mock() -> bool:
    return os.getenv("MOCK") == "1" or not os.getenv("ANTHROPIC_API_KEY")


MOCK_RECEIPT = {
    "ingredients": [
        {"name": "계란", "qty": 10, "unit": "개", "price": 4980},
        {"name": "두부", "qty": 1, "unit": "모", "price": 1500},
        {"name": "양파", "qty": 3, "unit": "개", "price": 2000},
        {"name": "햄", "qty": 1, "unit": "개", "price": 3500},
        {"name": "즉석밥", "qty": 3, "unit": "개", "price": 3600},
        {"name": "양배추", "qty": 0.5, "unit": "통", "price": 2500},
    ]
}

MOCK_MENUS = {
    "menus": [
        {"id": "home-1", "name": "두부계란덮밥", "source": "home", "price": 1800, "estimated": True,
         "kcal": 520, "carb": 68, "protein": 24, "fat": 15, "sodium": 780, "minutes": 15,
         "ingredientsUsed": ["두부", "계란", "양파", "즉석밥"],
         "steps": ["두부를 깍둑썰어 팬에 굽는다", "양파를 넣고 간장 1스푼으로 볶는다", "계란 2개를 풀어 넣고 익힌다", "밥 위에 올린다"]},
        {"id": "home-2", "name": "햄양배추볶음밥", "source": "home", "price": 2100, "estimated": True,
         "kcal": 610, "carb": 82, "protein": 18, "fat": 22, "sodium": 1100, "minutes": 12,
         "ingredientsUsed": ["햄", "양배추", "즉석밥", "계란"],
         "steps": ["햄과 양배추를 잘게 썬다", "기름 두른 팬에 햄, 양배추 순으로 볶는다", "밥을 넣고 볶다가 계란 1개를 넣는다"]},
        {"id": "home-3", "name": "양파계란국", "source": "home", "price": 900, "estimated": True,
         "kcal": 180, "carb": 10, "protein": 13, "fat": 9, "sodium": 900, "minutes": 10,
         "ingredientsUsed": ["양파", "계란"],
         "steps": ["물 400ml를 끓인다", "양파 반 개를 넣고 3분 끓인다", "계란 2개를 풀어 넣고 소금으로 간한다"]},
    ]
}

RECEIPT_PROMPT = """이 영수증에서 식재료만 뽑아줘. 봉투·생활용품 등 비식품은 제외.
상품명 약어는 일반 재료명으로 바꿔줘 (예: "CJ햇반210G*3" → 즉석밥 3개).
아래 JSON 형식으로만 답해. 다른 말은 쓰지 마.
{"ingredients":[{"name":"두부","qty":1,"unit":"모","price":1500}]}"""

MENU_PROMPT = """자취생 1인분 메뉴 3개를 추천해줘.
- 아래 재료만 사용 (소금, 간장, 식용유, 설탕 같은 기본 양념은 있다고 가정)
- 프라이팬 하나로 가능한 메뉴
- 영양소는 1인분 추정치 (kcal, g, mg)
- price 는 재료 가격 × 사용 비율로 계산한 원가(원, 정수)
- 부족한 영양: {lacking} → 이 영양이 많은 메뉴를 우선
재료: {ingredients}
아래 JSON 형식으로만 답해. 다른 말은 쓰지 마.
{{"menus":[{{"id":"home-1","name":"두부계란덮밥","source":"home","price":1800,"estimated":true,
"kcal":520,"carb":68,"protein":24,"fat":15,"sodium":780,"minutes":15,
"ingredientsUsed":["두부","계란"],"steps":["...","..."]}}]}}"""


def _ask_claude(content: list) -> dict:
    """Claude 호출 → JSON dict. 실패하면 예외."""
    import anthropic  # pip install anthropic

    client = anthropic.Anthropic()
    msg = client.messages.create(model=MODEL, max_tokens=2000, messages=[{"role": "user", "content": content}])
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    match = re.search(r"\{.*\}", text, re.S)  # 앞뒤에 말이 붙어도 JSON만 꺼냄
    if not match:
        raise ValueError(f"JSON 없음: {text[:200]}")
    return json.loads(match.group(0))


def parse_receipt(image: bytes, media_type: str) -> tuple[ReceiptResult, bool]:
    """(결과, mock 여부)"""
    if not use_mock():
        try:
            data = _ask_claude([
                {"type": "image", "source": {"type": "base64", "media_type": media_type,
                                             "data": base64.b64encode(image).decode()}},
                {"type": "text", "text": RECEIPT_PROMPT},
            ])
            return ReceiptResult(**data), False
        except (ValidationError, Exception) as e:  # noqa: BLE001 - 발표 중엔 절대 안 깨지게
            log.warning("영수증 AI 실패 → mock 사용: %s", e)
    return ReceiptResult(**MOCK_RECEIPT), True


def recommend_home(req: HomeMenuRequest) -> tuple[HomeMenuResponse, bool]:
    if not use_mock():
        try:
            prompt = MENU_PROMPT.format(
                lacking=", ".join(req.lacking) or "없음",
                ingredients=", ".join(f"{i.name} {i.qty:g}{i.unit}" + (f"({i.price}원)" if i.price else "")
                                      for i in req.ingredients),
            )
            data = _ask_claude([{"type": "text", "text": prompt}])
            for i, m in enumerate(data.get("menus", []), 1):  # AI가 id/source를 틀려도 보정
                m["id"], m["source"], m["estimated"] = f"home-{i}", "home", True
            return HomeMenuResponse(**data), False
        except (ValidationError, Exception) as e:  # noqa: BLE001
            log.warning("메뉴 AI 실패 → mock 사용: %s", e)
    return HomeMenuResponse(**MOCK_MENUS), True
=======
import base64
import logging

from fastapi import APIRouter, UploadFile

from . import ai, mocks
from .errors import api_error
from .models import HomeMenuRequest, HomeMenuResponse, ReceiptResult, RecipeMenu

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["A:영수증"])

ALLOWED_CONTENT_TYPES = {"image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024

RECEIPT_PROMPT = """이미지는 마트 영수증 사진입니다. 영수증에 있는 식재료만 추출하세요.
다음 JSON 배열만 반환하세요. 설명, markdown, 코드 블록은 쓰지 마세요.
[{"name":"재료명(한국어)","qty":수량(숫자, 모름이면 null),"unit":"단위(g/kg/개/팩 등, 모름이면 null)","price":가격(원, 숫자, 모름이면 null)}]
식재료가 아닌 품목(티슈, 세제 등)은 제외하세요."""

MENU_PROMPT = """자취생을 위한 메뉴 추천 앱입니다. 집에 있는 재료로 만들 수 있는 1인분 메뉴 3개를 다른 종류로 추천하세요.
재료: {ingredients}
하루 섭취가 부족한 영양소: {lacking}
{lacking_note}
다음 JSON 배열만 반환하세요. 설명, markdown, 코드 블록은 쓰지 마세요.
[{{"name":"메뉴명","minutes":"조리시간(분, 숫자)","ingredientsUsed":["실제로 사용한 재료명"],"steps":["단계 1","단계 2"],"kcal":"칼로리(숫자)","carb":"탄수화물(g, 숫자)","protein":"단백질(g, 숫자)","fat":"지방(g, 숫자)","sodium":"나트륨(mg, 숫자)"}}]
재료가 조금 모자라면 흔한 저렴한 재료를 더해도 되며, steps에 추가 재료를 명시하세요."""


def _to_number(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


@router.post("/receipt", response_model=ReceiptResult)
async def upload_receipt(file: UploadFile):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise api_error(415, "unsupported_image", f"jpg/png/webp 이미지만 올릴 수 있어요 (수신: {content_type or '알 수 없음'})")
    payload = await file.read()
    if not payload:
        raise api_error(400, "empty_file", "파일이 비어 있어요")
    if len(payload) > MAX_FILE_SIZE:
        raise api_error(413, "file_too_large", "이미지는 10MB 이하로 올려주세요")
    if ai.mock_mode():
        return mocks.mock_receipt()
    try:
        data_url = f"data:{content_type};base64,{base64.b64encode(payload).decode()}"
        raw = ai.chat_json(
            [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": RECEIPT_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ]
        )
        items = raw if isinstance(raw, list) else raw.get("ingredients", [])
        ingredients = []
        for item in items:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            if not name:
                continue
            ingredients.append(
                {
                    "name": name,
                    "qty": _to_number(item.get("qty"), None) if item.get("qty") is not None else None,
                    "unit": str(item.get("unit")).strip() if item.get("unit") else None,
                    "price": _to_number(item.get("price"), None) if item.get("price") is not None else None,
                }
            )
        if not ingredients:
            raise ValueError("재료가 추출되지 않음")
        return ReceiptResult(ingredients=ingredients)
    except Exception as exc:
        logger.warning("영수증 인식 실패 → 예시 데이터 사용: %s", exc)
        return mocks.mock_receipt()


def _to_recipe_menu(item: dict, index: int) -> RecipeMenu:
    name = str(item.get("name", "")).strip()
    if not name:
        raise ValueError("메뉴 이름 누락")

    def str_list(value) -> list[str]:
        return [str(x).strip() for x in (value or []) if str(x).strip()]

    return RecipeMenu(
        id=f"home-{index}",
        name=name,
        source="home",
        estimated=True,
        minutes=int(_to_number(item.get("minutes"), 15)),
        ingredients_used=str_list(item.get("ingredientsUsed")),
        steps=str_list(item.get("steps")),
        kcal=_to_number(item.get("kcal"), 500),
        carb=_to_number(item.get("carb"), 0),
        protein=_to_number(item.get("protein"), 0),
        fat=_to_number(item.get("fat"), 0),
        sodium=_to_number(item.get("sodium"), 0),
    )


@router.post("/menus/home", response_model=HomeMenuResponse)
def home_menus(req: HomeMenuRequest):
    if ai.mock_mode():
        return HomeMenuResponse(**mocks.mock_home_menus(req.ingredients))
    try:
        lacking = ", ".join(req.lacking) if req.lacking else "없음"
        lacking_note = (
            "추천 메뉴가 이 영양소를 채워줄 수 있도록 신경 써주세요.\n" if req.lacking else ""
        )
        prompt = MENU_PROMPT.format(
            ingredients=", ".join(req.ingredients), lacking=lacking, lacking_note=lacking_note
        )
        raw = ai.chat_json([{"role": "user", "content": prompt}])
        items = raw if isinstance(raw, list) else raw.get("menus", [])
        menus = [_to_recipe_menu(item, index) for index, item in enumerate(items, 1) if isinstance(item, dict)]
        if len(menus) < 3:
            for extra in mocks.mock_home_menus(req.ingredients)["menus"][len(menus):3]:
                menus.append(RecipeMenu(**extra))
        return HomeMenuResponse(menus=menus[:3])
    except Exception as exc:
        logger.warning("메뉴 생성 실패 → 예시 데이터 사용: %s", exc)
        return HomeMenuResponse(**mocks.mock_home_menus(req.ingredients))
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
