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
