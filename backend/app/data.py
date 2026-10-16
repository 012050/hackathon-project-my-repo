import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CAMPUS_FILE = DATA_DIR / "campus.json"
TIMETABLE_FILE = DATA_DIR / "timetable.json"
MEALS_FILE = DATA_DIR / "meals.json"


def _load(name: str, default):
    path = DATA_DIR / name
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_campus() -> dict:
    return _load("campus.json", {"buildings": [], "foodPlaces": [], "walkOverrides": {}})


def load_timetable() -> dict:
    return _load("timetable.json", {"classes": []})


def load_meals() -> list[dict]:
    return _load("meals.json", [])


def save_meals(meals: list[dict]) -> None:
    MEALS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(MEALS_FILE, "w", encoding="utf-8") as f:
        json.dump(meals, f, ensure_ascii=False, indent=2)
