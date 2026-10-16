# API 문서 — 자취생 하루 영양 채우기

> 2026-10-16 기준, **현재 구현된 상태**의 문서입니다.
> 요청/응답 예시는 실제 서버 응답에서 가져온 것입니다.
> 설계 의도·협약은 `개발 가이드.md`, 변경점·할 일은 `협업 안내.md` 참고.

## 1. 개요

- Base URL: `http://<서버 주소>:8000` (로컬: `http://localhost:8000`)
- Swagger UI: `http://<서버 주소>:8000/docs` — 모든 엔드포인트를 브라우저에서 바로 테스트
- OpenAPI 스펙: `GET /openapi.json`

### 환경 변수 (백엔드)

| 변수 | 기본값 | 뜻 |
| --- | --- | --- |
| `AI_BASE_URL` | `http://192.168.1.221:8000/v1` | LLM API 주소 (내부망) |
| `AI_MODEL` | `qwen` | 모델명 |
| `AI_API_KEY` | `anything` | 키는 무시됨 (클라이언트 요구용) |
| `MOCK` | (비어 있음) | `1`이면 항상 예시 데이터. LLM 호출 실패 시에도 예시 데이터로 자동 폴백 |

## 2. 공통 규칙

1. 필드 이름은 **camelCase** (`placeId`, `eatMinutes`, `ingredientsUsed`). 모르는 필드가 오면 422
2. 시간 `"HH:MM"`, 날짜 `"YYYY-MM-DD"` 문자열
3. 요일은 `"월"`~`"금"` 한 글자. 주말 값은 422
4. 영양 단위: kcal / g / mg, **숫자만**
5. 메뉴는 집·학교 모두 `Menu` 한 형식, `source`만 `home` / `school`
6. 에러는 항상 아래 모양 (에러 외 본문 없음):

```json
{ "error": { "code": "invalid_request", "message": "형식이 틀렸어요: ingredients (list type expected...)" } }
```

| code | 상태 | 뜻 |
| --- | --- | --- |
| `invalid_request` | 422 | 형식 틀림 (message에 필드명 포함) |
| `unsupported_image` | 415 | jpg/png/webp가 아닌 파일 |
| `empty_file` | 400 | 빈 파일 |
| `file_too_large` | 413 | 10MB 초과 |
| `meal_not_found` | 404 | 없는 meal id를 DELETE |
| `http_error` | 404/405 등 | 없는 주소 / 메서드 |
| `server_error` | 500 | 서버 버그 (백엔드 로그 확인) |

## 3. 엔드포인트

| # | 메서드 | 주소 | 담당 | 요약 |
| --- | --- | --- | --- | --- |
| 1 | GET | `/api/health` | 공통 | 서버 상태 + mock 여부 |
| 2 | POST | `/api/receipt` | A | 영수증 이미지 → 재료 목록 |
| 3 | POST | `/api/menus/home` | A | 보유 재료(+lacking) → 메뉴 3개 |
| 4 | GET | `/api/campus` | B | 건물·식당·도보 데이터 |
| 5 | GET | `/api/timetable` | B | 시간표 |
| 6 | GET | `/api/school/slots?day=` | B | 요일별 공강 + 점심 경고 |
| 7 | POST | `/api/school/recommend` | B | 현재 시간 기준 가볼 곳 3곳 |
| 8 | POST | `/api/meals` | 공통 | [먹었어요] 저장 |
| 9 | GET | `/api/meals?date=` | 공통 | 날짜별 식사 기록 |
| 10 | DELETE | `/api/meals/{id}` | 공통 | 식사 기록 삭제 |
| 11 | GET | `/api/summary?date=` | B | 하루 합계 + 신호등 + lacking |
| 12 | POST | `/api/nutrition/lights` | 공통 | 한 끼 영양 → 신호등 |

---

### 1. `GET /api/health`

```bash
curl http://localhost:8000/api/health
```

응답 `200`:

```json
{ "status": "ok", "mock": false }
```

`mock: true`이면 예시 데이터 모드. 프론트는 이 값으로 "예시 데이터 표시 중" 배너를 붙여도 됨.

---

### 2. `POST /api/receipt` — 영수증 → 재료

요청: `multipart/form-data`, 필드 `file` (jpg/png/webp, 10MB 이하)

```bash
curl -X POST http://localhost:8000/api/receipt -F "file=@receipt.jpg;type=image/jpeg"
```

응답 `200`:

```json
{
  "ingredients": [
    { "name": "두부", "qty": 1, "unit": "모", "price": 1200 },
    { "name": "계란", "qty": 10, "unit": "개", "price": 2500 },
    { "name": "양파", "qty": null, "unit": null, "price": null }
  ]
}
```

- LLM(qwen 비전)이 이미지를 보고 추출. 인식 실패·비어 있으면 **예시 데이터**로 자동 폴백 (200)
- `qty`/`unit`/`price`는 모름이면 `null`
- 오류: 415 `unsupported_image` / 400 `empty_file` / 413 `file_too_large`

---

### 3. `POST /api/menus/home` — 재료 → 메뉴 3개

요청:

```json
{ "ingredients": ["두부", "계란", "양파", "닭가슴살"], "lacking": ["protein"] }
```

```bash
curl -X POST http://localhost:8000/api/menus/home \
  -H 'Content-Type: application/json' \
  -d '{"ingredients":["두부","계란","양파"],"lacking":["protein"]}'
```

- `lacking`: 선택. `/api/summary`가 반환한 `lacking` 배열을 그대로 넣으면 부족 영양소를 채우는 메뉴가 우선
- 응답 `200` (메뉴 3개, `RecipeMenu` = `Menu` + `minutes`/`ingredientsUsed`/`steps`):

```json
{
  "menus": [
    {
      "id": "home-1",
      "name": "닭가슴살 양파 간장볶음",
      "source": "home",
      "placeId": null, "price": null,
      "kcal": 550, "carb": 30, "protein": 42, "fat": 18, "sodium": 800,
      "estimated": true,
      "minutes": 15,
      "ingredientsUsed": ["닭가슴살", "양파"],
      "steps": ["양파 채 썰기", "닭가슴살 볶기", "간장 조리기"]
    }
  ]
}
```

- `ingredients`가 1개 이상 필요 (빈 배열 422). LLM 실패 시 예시 데이터 3개 (200)
- 응답 시간: 실측 **약 15~40초** (thinking 모델)

---

### 4. `GET /api/campus`

응답 `200` — `backend/data/campus.json` 그대로:

```json
{
  "buildings": [
    { "id": "23", "name": "정보공학관", "x": 0, "y": 0 }
  ],
  "walkOverrides": { "23-10": 4 },
  "foodPlaces": [
    {
      "id": "F01",
      "name": "정보공학관 학식",
      "building": "23",
      "type": "student_dining",
      "eatMinutes": 25,
      "open": "07:00",
      "close": "18:30",
      "menus": [
        { "id": "F01-m1", "name": "밥 + 돼지짜장면", "source": "school", "placeId": "F01",
          "price": 4500, "kcal": 850, "carb": 95, "protein": 28, "fat": 25, "sodium": 1100,
          "estimated": true, "minutes": null, "ingredientsUsed": null, "steps": null }
      ]
    }
  ]
}
```

- `type`: `student_dining` | `restaurant` | `cafe` | `convenience`
- `eatMinutes`: 편의점 10 · 카페 15 · 학식 25 · 식당 35 (규칙)
- `walkOverrides`: `"<건물id>-<건물id>": 분` — 실측 도보 시간. 없으면 직선거리/75m분으로 추정
- 메뉴 id 규칙: `식당id-m번호` (예: `F01-m4`). **현재 예시 데이터 — 실측값 교체 예정**

---

### 5. `GET /api/timetable`

응답 `200` — `backend/data/timetable.json` 그대로:

```json
{
  "classes": [
    { "day": "화", "start": "11:00", "end": "12:00", "room": "23-201", "building": "23" }
  ]
}
```

- `building`은 `campus.json`의 건물 id. **현재 예시 데이터**

---

### 6. `GET /api/school/slots?day=화`

요청: 쿼리 `day` = `월`~`금` (아니면 422)

응답 `200`:

```json
{
  "day": "화",
  "slots": [
    { "start": "08:30", "end": "11:00", "minutes": 150, "fromBuilding": null, "toBuilding": "23" },
    { "start": "16:00", "end": "20:00", "minutes": 240, "fromBuilding": "23", "toBuilding": null }
  ],
  "lunchWarning": true
}
```

- 공강 = 수업 사이 **10분 이상** 빈 시간 (첫 수업 전은 08:30부터, 마지막 수업 후는 20:00까지)
- `fromBuilding` = 직전 수업 건물, `toBuilding` = 직후 수업 건물 (없으면 null)
- `lunchWarning: true` = 점심(11~14시)에 20분 이상 빈 시간 없음 → 프론트는 배너 표시

---

### 7. `POST /api/school/recommend`

요청:

```json
{ "day": "화", "now": "10:00" }
```

응답 `200` (실측):

```json
{
  "day": "화",
  "now": "10:00",
  "slot": { "start": "08:30", "end": "11:00", "minutes": 150, "fromBuilding": null, "toBuilding": "23" },
  "recommendations": [
    {
      "placeId": "F01",
      "placeName": "정보공학관 학식",
      "type": "student_dining",
      "walkMinutes": 0,
      "arriveBy": "10:00",
      "reason": "다음 수업에 30분 여유로 돌아갈 수 있어요",
      "menus": [ "Menu 객체 (최대 3개, campus.json 의 메뉴)" ]
    }
  ]
}
```

추천 규칙:
- 도달 가능 조건: `도보(출발→식당) + eatMinutes + 도보(식당→다음 수업) + 여유 5분 ≤ 공강 끝 시각`, 도착 시점에 운영 중
- 현재 위치 가정: **다음 수업 건물** (오후 마지막 공강처럼 다음 수업이 없으면 식당 근처로 간주)
- 공강 잔여 50분 이상 → 학식·식당 우선 / 미만 → 편의점 우선. 같은 종류 3개는 안 나옴
- `now`가 어느 공강에도 안 걸리면 200 + `slot: null`, `recommendations: []`

---

### 8. `POST /api/meals` — [먹었어요]

요청 (`Menu` 객체 원본 그대로):

```json
{
  "date": "2026-10-16",
  "time": "12:30",
  "menu": {
    "id": "F01-m1", "name": "밥 + 돼지짜장면", "source": "school", "placeId": "F01",
    "price": 4500, "kcal": 850, "carb": 95, "protein": 28, "fat": 25, "sodium": 1100,
    "estimated": true
  }
}
```

응답 `201`:

```json
{ "id": "meal-3f9c1a2b", "date": "2026-10-16", "time": "12:30", "menu": { ... } }
```

- `backend/data/meals.json`에 영속 저장. localStorage 사용 안 함

---

### 9. `GET /api/meals?date=2026-10-16`

응답 `200`:

```json
{ "meals": [ { "id": "meal-...", "date": "2026-10-16", "time": "12:30", "menu": { ... } } ] }
```

시간순 정렬. 날짜 형식 아니면 422.

---

### 10. `DELETE /api/meals/{id}`

- `204` 성공 (본문 없음)
- `404` + `meal_not_found` — 없는 id

---

### 11. `GET /api/summary?date=2026-10-16` — 하루 합계

응답 `200`:

```json
{
  "date": "2026-10-16",
  "count": 1,
  "total": { "kcal": 850, "carb": 95, "protein": 28, "fat": 25, "sodium": 1100 },
  "lights": { "kcal": "red", "carb": "yellow", "protein": "red", "fat": "red", "sodium": "green" },
  "lacking": ["kcal", "protein", "fat"]
}
```

- `total` =那天 날짜의 `[먹었어요]` 기록 영양 합계
- `lacking` = 1일 기준치의 80% 미만인 항목. 이 값을 `/api/menus/home`의 `lacking`에 넣기
- 1일 기준치 (식약처, 2000kcal): kcal 2000 / carb 324g / protein 55g / fat 54g / sodium 2000mg

### 12. `POST /api/nutrition/lights` — 한 끼 신호등

요청:

```json
{ "menu": { "kcal": 666.7, "carb": 108, "protein": 18.33, "fat": 18, "sodium": 666.7 } }
```

응답 `200`:

```json
{ "kcal": "green", "carb": "green", "protein": "green", "fat": "green", "sodium": "green" }
```

**신호등 기준** (1일 기준치의 **1/3** 대비 비율; 하루 합계는 1일 전체 대비):

| 비율 | 신호 |
| --- | --- |
| 80~120% | green |
| 50~80% 또는 120~150% | yellow |
| 그 외 | red |

## 4. 프론트 연결

`frontend/src/lib/api.ts` + `types.ts`를 복사해서 쓰면 fetch를 직접 쓸 필요 없음:

```ts
import { getHomeMenus, getSchoolRecommend, addMeal, getSummary, today, nowHHMM, todayDay, ApiError } from "@/lib/api";
```

- `.env.local`에 `NEXT_PUBLIC_API_URL=http://<서버 IP>:8000` (빌드 시 반영 — IP 바뀌면 이미지 재빌드)
- `todayDay()`가 주말에 `null` → "오늘은 수업이 없어요" 표시
- 에러는 `ApiError.message` (한국어)를 그대로 화면에 표시
