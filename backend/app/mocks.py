MOCK_RECEIPT = [
    {"name": "두부", "qty": 1, "unit": "모", "price": 1200},
    {"name": "계란", "qty": 10, "unit": "개", "price": 2500},
    {"name": "양파", "qty": 2, "unit": "개", "price": 800},
    {"name": "파", "qty": 1, "unit": "단", "price": 1000},
    {"name": "닭가슴살", "qty": 1, "unit": "팩", "price": 3500},
    {"name": "쌀", "qty": 1, "unit": "kg", "price": 4200},
]

MOCK_RECIPES = [
    {
        "name": "두부계란덮밥",
        "minutes": 15,
        "ingredientsUsed": ["두부", "계란", "양파"],
        "steps": [
            "두부, 양파, 파를 다져 볶는다",
            "풀어 두른 계란을 부어 잘 섞는다",
            "밥 위에 올리고 간장·참기름을 뿌려낸다",
        ],
        "kcal": 520, "carb": 68, "protein": 24, "fat": 15, "sodium": 780,
    },
    {
        "name": "닭가슴살 샐러드",
        "minutes": 10,
        "ingredientsUsed": ["닭가슴살", "양파"],
        "steps": [
            "닭가슴살을 데쳐 찢는다",
            "양파를 얇게 썰어 드레싱과 섞는다",
            "채소 위에 닭가슴살을 올린다",
        ],
        "kcal": 480, "carb": 40, "protein": 42, "fat": 12, "sodium": 650,
    },
    {
        "name": "양파계란말이",
        "minutes": 12,
        "ingredientsUsed": ["계란", "양파", "파"],
        "steps": [
            "계란에 다진 양파·파를 섞는다",
            "얇게 여러 겹으로 부친다",
            "한 입 크기로 썰어 소스와 함께 낸다",
        ],
        "kcal": 380, "carb": 22, "protein": 26, "fat": 20, "sodium": 900,
    },
]


def mock_receipt() -> dict:
    return {"ingredients": [dict(item) for item in MOCK_RECEIPT]}


def mock_home_menus(ingredients: list[str]) -> dict:
    given = set(ingredients)
    menus = []
    for index, recipe in enumerate(MOCK_RECIPES, 1):
        used = [name for name in recipe["ingredientsUsed"] if name in given] or list(recipe["ingredientsUsed"])
        menus.append(
            {
                **recipe,
                "id": f"home-{index}",
                "source": "home",
                "estimated": True,
                "ingredientsUsed": used,
            }
        )
    return {"menus": menus}
