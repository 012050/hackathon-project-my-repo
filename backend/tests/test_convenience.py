import os

os.environ["MOCK"] = "1"

from fastapi.testclient import TestClient

from app import convenience
from app.main import app

client = TestClient(app)

PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d4944415478da63fcffff3f0300050001"
)
NUTRIENTS = ("kcal", "carb", "protein", "fat", "sodium")


def _post(filename: str, content_type: str = "image/png"):
    return client.post("/api/receipt/nutrition", files={"file": (filename, PNG_1PX, content_type)})


def test_receipt_nutrition_mock_convenience():
    res = _post("receipt.png")
    assert res.status_code == 200
    body = res.json()
    assert body["storeType"] == "convenience"
    assert [i["name"] for i in body["items"]] == ["햄치즈 샌드위치", "아메리카노 350mL"]
    for item in body["items"]:
        assert set(item) >= {"name", "qty", "price", "estimated", "found", *NUTRIENTS}
        assert item["found"] is True
    for key in NUTRIENTS:
        assert abs(body["total"][key] - sum(i[key] for i in body["items"])) < 0.01


def test_receipt_nutrition_mock_grocery():
    res = _post("mart-receipt.png")
    assert res.status_code == 200
    assert res.json()["storeType"] == "grocery"


def test_receipt_nutrition_rejects_non_image():
    res = _post("a.txt", "text/plain")
    assert res.status_code == 415
    assert res.json()["error"]["code"] == "unsupported_image"


def test_find_product_ignores_volume_and_spaces():
    products = convenience.load_products()
    assert convenience.find_product("아메리카노 350mL", products)["name"] == "아메리카노"
    assert convenience.find_product("GS)햄치즈샌드위치", products)["name"] == "햄치즈 샌드위치"
    assert convenience.find_product("제로콜라 500ml", products)["name"] == "제로콜라"
    assert convenience.find_product("자전거", products) is None


def test_qty_multiplies_nutrition():
    res = convenience.build_response([{"name": "삶은계란", "qty": 2, "price": 2000, "kind": "ready"}], use_ai=False)
    assert res.items[0].kcal == 150
    assert res.total.kcal == 150


def test_unknown_item_without_ai_is_not_found():
    res = convenience.build_response([{"name": "이상한과자", "qty": 1, "kind": "ready"}], use_ai=False)
    assert res.items[0].found is False
    assert res.items[0].kcal is None
    assert res.total.kcal == 0
