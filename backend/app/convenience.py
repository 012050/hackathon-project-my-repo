"""편의점 영수증 → 상품별 영양소 (학교 파트).

영수증 읽기·영양 추정은 ai.chat_json 을 호출만 해서 재사용한다 (ai.py 는 수정하지 않음).
"""
import base64
import logging
import re
import socket
from typing import Literal, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, UploadFile
from pydantic import BaseModel

from . import ai, data, mocks
from .errors import api_error
from .models import BASE_MODEL, Nutrition

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["B:편의점 영수증"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024
NUTRIENTS = ("kcal", "carb", "protein", "fat", "sodium")

# mock 모드에서 돌려줄 편의점 영수증 (데모·테스트용)
MOCK_CONVENIENCE_RECEIPT = [
    {"name": "햄치즈 샌드위치", "qty": 1, "price": 3500, "kind": "ready"},
    {"name": "아메리카노 350mL", "qty": 1, "price": 1500, "kind": "ready"},
]

# 조리해야 하는 식재료 (이게 대부분이면 마트 영수증)
INGREDIENT_WORDS = (
    "두부", "계란", "달걀", "양파", "대파", "쪽파", "파", "마늘", "감자", "고구마", "당근", "애호박", "호박",
    "버섯", "배추", "양배추", "상추", "시금치", "콩나물", "숙주", "무", "오이", "고추", "토마토",
    "쌀", "현미", "밀가루", "국수", "소면", "파스타", "돼지", "삼겹", "목살", "소고기", "쇠고기", "닭고기",
    "닭다리", "생닭", "다짐육", "고등어", "연어", "오징어", "새우", "어묵", "햄", "베이컨", "참치캔",
    "간장", "된장", "고추장", "식용유", "참기름", "설탕", "소금", "후추", "치즈",
)

RECEIPT_PROMPT = """이미지는 편의점 또는 마트 영수증 사진입니다. 영수증의 품목을 모두 추출하세요.
다음 JSON 배열만 반환하세요. 설명, markdown, 코드 블록은 쓰지 마세요.
[{"name":"상품명(영수증 표기 그대로, 한국어)","qty":수량(숫자, 모르면 1),"price":그 줄의 금액(원, 숫자, 모르면 null),"kind":"ready 또는 ingredient 또는 other"}]
kind: ready = 바로 먹는 완제품·음료(삼각김밥, 샌드위치, 우유 등), ingredient = 조리해야 하는 식재료(계란 한 판, 양파 등), other = 음식이 아닌 것.
other 품목은 제외하세요."""

ESTIMATE_PROMPT = """다음 편의점 상품들의 1개 기준 영양성분을 일반적인 값으로 추정하세요.
상품: {names}
다음 JSON 배열만 반환하세요. 설명, markdown, 코드 블록은 쓰지 마세요.
[{{"name":"상품명(입력 그대로)","kcal":숫자,"carb":탄수화물 g 숫자,"protein":단백질 g 숫자,"fat":지방 g 숫자,"sodium":나트륨 mg 숫자}}]"""


class ReceiptItem(BaseModel):
    model_config = BASE_MODEL

    name: str
    qty: float = 1
    price: Optional[float] = None
    kcal: Optional[float] = None
    carb: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    sodium: Optional[float] = None
    estimated: bool = True
    found: bool = False


class ReceiptNutritionResponse(BaseModel):
    model_config = BASE_MODEL

    store_type: Literal["convenience", "grocery", "unknown"]
    items: list[ReceiptItem]
    total: Nutrition


# ---------- 이름 비교 (공백·용량·괄호·브랜드 접두어 무시) ----------
_VOLUME = re.compile(r"\d+(?:\.\d+)?\s*(?:ml|l|g|kg|개입|입|개|봉|팩|ea)\b", re.IGNORECASE)


def normalize(name: str) -> str:
    s = name.lower()
    s = re.sub(r"^\s*[a-z가-힣]{1,4}\)\s*", "", s)  # "GS)", "CU)", "세)" 같은 접두어
    s = re.sub(r"\(.*?\)|\[.*?\]", "", s)
    s = _VOLUME.sub("", s)
    s = re.sub(r"\d+(?:\.\d+)?\s*(?:ml|l|g|kg)$", "", s)
    return re.sub(r"[\s\-_/·.,*]", "", s)


def load_products() -> list[dict]:
    return data._load("products.json", {"products": []}).get("products", [])


def find_product(name: str, products: list[dict]) -> Optional[dict]:
    """정확히 같으면 그것, 아니면 이름에 포함된 상품 중 가장 긴 이름."""
    key = normalize(name)
    if not key:
        return None
    best, best_len = None, 0
    for product in products:
        for alias in [product["name"], *product.get("aliases", [])]:
            a = normalize(alias)
            if not a:
                continue
            if a == key:
                return product
            if a in key and len(a) > best_len:
                best, best_len = product, len(a)
    return best


def is_ingredient(name: str) -> bool:
    key = normalize(name)
    return any(word in key for word in INGREDIENT_WORDS)


# ---------- AI ----------
def ai_available() -> bool:
    """mock 모드가 아니고 AI 서버에 1초 안에 연결되면 True (꺼져 있으면 오래 기다리지 않게)."""
    if ai.mock_mode():
        return False
    url = urlparse(ai.AI_BASE_URL)
    host = url.hostname
    port = url.port or (443 if url.scheme == "https" else 80)
    if not host:
        return False
    try:
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except OSError:
        return False


def _number(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def read_receipt(payload: bytes, content_type: str) -> list[dict]:
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
    rows = raw if isinstance(raw, list) else raw.get("items", [])
    items = []
    for row in rows:
        if not isinstance(row, dict) or row.get("kind") == "other":
            continue
        name = str(row.get("name", "")).strip()
        if name:
            items.append(
                {
                    "name": name,
                    "qty": _number(row.get("qty"), 1) or 1,
                    "price": _number(row.get("price")),
                    "kind": row.get("kind"),
                }
            )
    return items


def estimate_nutrition(names: list[str]) -> dict[str, dict]:
    raw = ai.chat_json([{"role": "user", "content": ESTIMATE_PROMPT.format(names=", ".join(names))}])
    rows = raw if isinstance(raw, list) else raw.get("items", [])
    result = {}
    for row in rows:
        if isinstance(row, dict) and str(row.get("name", "")).strip() in names:
            values = {k: _number(row.get(k)) for k in NUTRIENTS}
            if values["kcal"] is not None:
                result[str(row["name"]).strip()] = {k: v or 0.0 for k, v in values.items()}
    return result


def mock_items(filename: str) -> list[dict]:
    """mock 모드: 파일 이름에 mart/마트/grocery 가 있으면 팀원의 마트 예시, 아니면 편의점 예시."""
    if re.search(r"mart|마트|grocery", filename or "", re.IGNORECASE):
        return [
            {"name": i["name"], "qty": 1, "price": i.get("price"), "kind": "ingredient"}
            for i in mocks.mock_receipt()["ingredients"]
        ]
    return [dict(i) for i in MOCK_CONVENIENCE_RECEIPT]


def store_type_of(rows: list[dict], matched: list[bool]) -> str:
    if not rows:
        return "unknown"
    ingredient = sum(
        1
        for row, hit in zip(rows, matched)
        if row.get("kind") == "ingredient" or (row.get("kind") != "ready" and not hit and is_ingredient(row["name"]))
    )
    if ingredient * 2 > len(rows):
        return "grocery"
    return "convenience"


def build_response(rows: list[dict], use_ai: bool) -> ReceiptNutritionResponse:
    products = load_products()
    hits = [find_product(row["name"], products) for row in rows]
    store_type = store_type_of(rows, [h is not None for h in hits])

    estimates: dict[str, dict] = {}
    missing = [row["name"] for row, hit in zip(rows, hits) if hit is None]
    if missing and use_ai and store_type != "grocery":
        try:
            estimates = estimate_nutrition(missing)
        except Exception as exc:  # AI 실패 → 표에 있는 것만 보여줌
            logger.warning("영양 추정 실패: %s", exc)

    items: list[ReceiptItem] = []
    total = {k: 0.0 for k in NUTRIENTS}
    for row, hit in zip(rows, hits):
        qty = row.get("qty") or 1
        per_unit = hit or estimates.get(row["name"])
        if per_unit is None:
            items.append(ReceiptItem(name=row["name"], qty=qty, price=row.get("price"), found=False))
            continue
        values = {k: round(float(per_unit.get(k, 0) or 0) * qty, 1) for k in NUTRIENTS}
        for k in NUTRIENTS:
            total[k] += values[k]
        items.append(
            ReceiptItem(
                name=row["name"],
                qty=qty,
                price=row.get("price"),
                estimated=bool(per_unit.get("estimated", True)) if hit else True,
                found=True,
                **values,
            )
        )
    return ReceiptNutritionResponse(
        store_type=store_type,
        items=items,
        total=Nutrition(**{k: round(v, 1) for k, v in total.items()}),
    )


@router.post("/receipt/nutrition", response_model=ReceiptNutritionResponse)
async def receipt_nutrition(file: UploadFile):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise api_error(415, "unsupported_image", f"jpg/png/webp 이미지만 올릴 수 있어요 (수신: {content_type or '알 수 없음'})")
    payload = await file.read()
    if not payload:
        raise api_error(400, "empty_file", "파일이 비어 있어요")
    if len(payload) > MAX_FILE_SIZE:
        raise api_error(413, "file_too_large", "이미지는 10MB 이하로 올려주세요")

    if ai.mock_mode():
        return build_response(mock_items(file.filename or ""), use_ai=False)

    if not ai_available():
        raise api_error(503, "ai_unavailable", "AI 서버에 연결할 수 없어 영수증을 읽지 못했어요. (발표용: MOCK=1 로 실행)")
    try:
        rows = read_receipt(payload, content_type)
    except Exception as exc:
        logger.warning("편의점 영수증 인식 실패: %s", exc)
        raise api_error(502, "receipt_read_failed", "영수증을 읽지 못했어요. 글씨가 잘 보이게 다시 찍어 주세요.")
    if not rows:
        raise api_error(422, "no_items", "영수증에서 상품을 찾지 못했어요.")
    return build_response(rows, use_ai=True)
