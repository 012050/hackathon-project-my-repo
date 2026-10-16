import io
import os

os.environ["MOCK"] = "1"

import pytest
from fastapi.testclient import TestClient

from app import data
from app.main import app

client = TestClient(app)
TODAY = "2026-10-16"

PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d4944415478da63fcffff3f0300050001"
)

SAMPLE_MENU = {
    "id": "home-1",
    "name": "두부계란덮밥",
    "source": "home",
    "kcal": 520,
    "carb": 68,
    "protein": 24,
    "fat": 15,
    "sodium": 780,
    "estimated": True,
    "minutes": 15,
    "ingredientsUsed": ["두부", "계란"],
    "steps": ["재료 손질", "조리"],
}


@pytest.fixture(autouse=True)
def clean_meals():
    data.save_meals([])
    yield
    data.save_meals([])


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body == {"status": "ok", "mock": True}


def test_receipt_mock():
    res = client.post("/api/receipt", files={"file": ("receipt.png", io.BytesIO(PNG_1PX), "image/png")})
    assert res.status_code == 200
    ingredients = res.json()["ingredients"]
    assert ingredients and all(item["name"] for item in ingredients)


def test_receipt_unsupported_type():
    res = client.post("/api/receipt", files={"file": ("receipt.txt", io.BytesIO(b"hello"), "text/plain")})
    assert res.status_code == 415
    assert res.json()["error"]["code"] == "unsupported_image"


def test_receipt_empty_file():
    res = client.post("/api/receipt", files={"file": ("receipt.png", io.BytesIO(b""), "image/png")})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "empty_file"


def test_receipt_too_large():
    big = b"\x00" * (10 * 1024 * 1024 + 1)
    res = client.post("/api/receipt", files={"file": ("big.png", io.BytesIO(big), "image/png")})
    assert res.status_code == 413
    assert res.json()["error"]["code"] == "file_too_large"


def test_home_menus():
    res = client.post("/api/menus/home", json={"ingredients": ["두부", "계란", "양파"], "lacking": ["protein"]})
    assert res.status_code == 200
    menus = res.json()["menus"]
    assert len(menus) == 3
    for menu in menus:
        assert menu["source"] == "home"
        assert menu["minutes"] > 0
        assert menu["steps"]
        assert menu["ingredientsUsed"]


def test_home_menus_missing_field():
    res = client.post("/api/menus/home", json={})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "invalid_request"


def test_home_menus_unknown_field():
    res = client.post("/api/menus/home", json={"ingredients": ["두부"], "wrongField": 1})
    assert res.status_code == 422


def test_campus_and_timetable():
    campus = client.get("/api/campus")
    assert campus.status_code == 200
    body = campus.json()
    assert body["buildings"] and body["foodPlaces"]
    timetable = client.get("/api/timetable")
    assert timetable.status_code == 200
    assert timetable.json()["classes"]


def test_slots_tuesday_lunch_warning():
    res = client.get("/api/school/slots", params={"day": "화"})
    assert res.status_code == 200
    body = res.json()
    assert body["lunchWarning"] is True
    assert body["slots"]


def test_slots_weekend_rejected():
    res = client.get("/api/school/slots", params={"day": "토"})
    assert res.status_code == 422


def test_school_recommend():
    res = client.post("/api/school/recommend", json={"day": "화", "now": "10:00"})
    assert res.status_code == 200
    body = res.json()
    assert body["slot"] is not None
    assert len(body["recommendations"]) <= 3
    assert body["recommendations"]
    for rec in body["recommendations"]:
        assert rec["menus"]
        assert len(rec["arriveBy"]) == 5


def test_school_recommend_no_slot():
    res = client.post("/api/school/recommend", json={"day": "화", "now": "21:00"})
    assert res.status_code == 200
    body = res.json()
    assert body["slot"] is None
    assert body["recommendations"] == []


def test_school_recommend_bad_now():
    res = client.post("/api/school/recommend", json={"day": "화", "now": "105"})
    assert res.status_code == 422


def test_meals_flow():
    created = client.post("/api/meals", json={"date": TODAY, "time": "18:30", "menu": SAMPLE_MENU})
    assert created.status_code == 201
    meal_id = created.json()["id"]

    listed = client.get("/api/meals", params={"date": TODAY})
    assert listed.status_code == 200
    assert [m["id"] for m in listed.json()["meals"]] == [meal_id]

    deleted = client.delete(f"/api/meals/{meal_id}")
    assert deleted.status_code == 204

    again = client.delete(f"/api/meals/{meal_id}")
    assert again.status_code == 404
    assert again.json()["error"]["code"] == "meal_not_found"


def test_meals_unknown_menu_field():
    menu = {**SAMPLE_MENU, "foo": "bar"}
    res = client.post("/api/meals", json={"date": TODAY, "time": "18:30", "menu": menu})
    assert res.status_code == 422


def test_summary():
    client.post("/api/meals", json={"date": TODAY, "time": "12:00", "menu": SAMPLE_MENU})
    res = client.get("/api/summary", params={"date": TODAY})
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 1
    assert body["total"]["kcal"] == 520
    assert "protein" in body["lacking"]
    assert set(body["lights"].keys()) == {"kcal", "carb", "protein", "fat", "sodium"}


def test_nutrition_lights():
    res = client.post(
        "/api/nutrition/lights",
        json={"menu": {"kcal": 666.7, "carb": 108, "protein": 18.33, "fat": 18, "sodium": 666.7}},
    )
    assert res.status_code == 200
    assert all(v == "green" for v in res.json().values())


def test_unknown_route():
    res = client.get("/api/nope")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "http_error"
