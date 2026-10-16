<<<<<<< HEAD
# 자취생 하루 영양 앱 — API 규격

백엔드: FastAPI (`backend/`) · 프론트: Next.js (`frontend/src/lib/`)

## 1. 실행 (백엔드 노트북)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 브라우저에서 **http://localhost:8000/docs** → 모든 API를 바로 눌러서 테스트할 수 있음
- `ANTHROPIC_API_KEY` 가 없으면 자동으로 **예시 데이터(mock)** 로 응답 → 키 없이도 화면 개발 가능
- AI 키 쓰기: `backend/.env` 대신 터미널에서 `export ANTHROPIC_API_KEY=...` (Windows: `set ANTHROPIC_API_KEY=...`)
- 발표 때 강제로 예시 데이터: `MOCK=1 uvicorn app.main:app --port 8000`
- 점검: `pip install httpx pytest` 후 `python -m pytest tests -q` (전부 통과해야 정상)

## 2. 프론트에서 연결

1. `frontend/src/lib/types.ts`, `api.ts` 를 Next.js 프로젝트의 `src/lib/` 에 복사
2. `.env.local` 에 `NEXT_PUBLIC_API_URL=http://localhost:8000`
   (백엔드가 다른 노트북이면 `http://<그 노트북 IP>:8000`, 같은 와이파이여야 함)
3. 컴포넌트에서는 `fetch` 대신 `api.ts` 함수만 사용

```ts
import { getSchoolRecommend, addMeal, getSummary, todayDay, nowHHMM, today, ApiError } from "@/lib/api";

try {
  const day = todayDay();
  if (day) {
    const rec = await getSchoolRecommend(day, nowHHMM());
    await addMeal({ date: today(), time: nowHHMM(), menu: rec.recommendations[0].menus[0] });
  }
  const summary = await getSummary(today());
} catch (e) {
  if (e instanceof ApiError) alert(e.message); // 서버가 준 한국어 메시지
}
```

## 3. 엔드포인트

| 메서드 | 주소 | 담당 | 보내는 것 | 받는 것 |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | 공통 | - | `HealthResponse` (mock 여부) |
| POST | `/api/receipt` | 🅰️ | form-data `file` (jpg/png/webp, 10MB 이하) | `ReceiptResult` |
| POST | `/api/menus/home` | 🅰️ | `HomeMenuRequest` | `HomeMenuResponse` (메뉴 3개) |
| GET | `/api/campus` | 🅱️ | - | `CampusResponse` |
| GET | `/api/timetable` | 🅱️ | - | `TimetableResponse` |
| GET | `/api/school/slots?day=화` | 🅱️ | 요일 | `SlotsResponse` (공강 + 점심 경고) |
| POST | `/api/school/recommend` | 🅱️ | `{ "day": "화", "now": "10:00" }` | `SchoolRecommendResponse` (최대 3곳) |
| POST | `/api/meals` | 공통 | `MealLogCreate` | `MealLog` (201) |
| GET | `/api/meals?date=2026-10-16` | 공통 | 날짜 | `MealListResponse` |
| DELETE | `/api/meals/{id}` | 공통 | - | 204 / 없으면 404 |
| GET | `/api/summary?date=2026-10-16` | 🅱️ | 날짜 | `DailySummary` |
| POST | `/api/nutrition/lights` | 공통 | `{ "menu": Nutrition }` | `Lights` (한 끼 기준 신호등) |

타입 이름은 `types.ts`(프론트)와 `models.py`(백엔드)에 똑같이 정의되어 있음.

## 4. 오류 안 나게 지킬 규칙

1. **필드 이름은 camelCase** (`placeId`, `eatMinutes`, `ingredientsUsed`). 백엔드는 모르는 필드가 오면 422로 거절함 → 오타가 바로 드러남
2. **시간 `"HH:MM"`, 날짜 `"YYYY-MM-DD"`** 문자열. `api.ts` 의 `nowHHMM()`, `today()` 를 쓰면 실수 없음
3. **요일은 `"월"~"금"` 한 글자**. 주말엔 `todayDay()` 가 `null` → 학교 탭에 "오늘은 수업이 없어요" 표시
4. **영양 단위**: kcal / g / mg. 숫자만 (문자 `"500kcal"` 금지)
5. **메뉴는 집·학교 모두 `Menu` 한 형식**. `source` 만 `home` / `school`
6. **[먹었어요] = `POST /api/meals`** (localStorage 안 씀). 받은 `Menu` 객체를 그대로 넣으면 됨
7. **하루 합계의 `lacking` → `/api/menus/home` 의 `lacking` 에 그대로** 넣으면 부족 영양을 채우는 메뉴가 나옴
8. **에러는 항상 같은 모양**: `{ "error": { "code": "...", "message": "..." } }`. `ApiError.message` 를 화면에 보여주면 됨
9. **필드를 바꿀 땐 `models.py` 와 `types.ts` 를 같이 바꾸고 팀원에게 알리기**

| 에러 code | 상태 | 뜻 |
| --- | --- | --- |
| `invalid_request` | 422 | 형식 틀림 (message 에 어느 필드인지 나옴) |
| `unsupported_image` | 415 | 이미지가 아닌 파일 |
| `empty_file` / `file_too_large` | 400 / 413 | 빈 파일 / 10MB 초과 |
| `meal_not_found` | 404 | 지운 기록을 또 지움 |
| `http_error` | 404 등 | 없는 주소 |
| `network_error` | 0 | (프론트) 서버가 꺼져 있음 |
| `server_error` | 500 | 서버 버그 → 백엔드 터미널 로그 확인 |

## 5. 데이터 파일 (`backend/data/`)

- `campus.json` — 건물 좌표, 식당(`foodPlaces`), 실측 도보 시간(`walkOverrides`)
  - **식당 메뉴·가격·운영 시간은 예시값** → 조사한 값으로 교체. 형식은 기존 항목을 복사해서 수정
  - 메뉴 `id` 는 `식당id-m번호` (예: `F01-m4`), `source` 는 `"school"`, `placeId` 는 식당 id
- `timetable.json` — 시간표 (`building` 은 campus.json 건물 id, "정보" = 23)
- `meals.json` — [먹었어요] 기록 (자동 생성)

데이터를 고친 뒤엔 `python tests/test_logic.py` 로 형식이 맞는지 확인 (FastAPI 없이도 실행됨).

## 6. 추천 규칙 요약 (🅱️)

- 공강 = 수업 사이 10분 이상 빈 시간 (첫 수업 전은 08:30부터, 마지막 수업 후는 20:00까지)
- 갈 수 있는 곳 = `출발→식당 도보 + 식사 시간 + 식당→다음 수업 도보 + 여유 5분` 이 빈 시간 안에 들어오고, 운영 시간 안
- 식사 시간: 편의점 10 · 카페 15 · 학생식당 25 · 식당 35분 (`eatMinutes`)
- 50분 이상 남으면 학식·식당 먼저, 짧으면 편의점 먼저. 같은 종류만 3개 나오지 않게 섞음
- 점심(11~14시)에 20분 이상 빈 시간이 없으면 `lunchWarning`
=======
# hackathon-project

자취생 하루 영양 채우기 앱 — 영수증 재료로 집 메뉴, 공강·동선으로 학교 메뉴.

- 백엔드: FastAPI (`backend/`) · 프론트: Next.js (`frontend/`)
- **API 규격과 협업 규칙**: `개발 가이드.md` (기준 문서)
- **구현된 API 전체 문서 (요청/응답 예시 포함)**: `API 문서.md`
- **변경점 / 할 일 / 같이 결정할 것**: `협업 안내.md` ← 팀원들이 먼저 읽을 파일

## 빠른 시작

```bash
# 로컬 백엔드
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000   # → http://localhost:8000/docs

# 테스트
cd backend && .venv/bin/python -m pytest tests -q

# 전체 (docker compose)
docker compose up --build    # 프론트 :3000, 백엔드 :8000
MOCK=1 docker compose up --build   # 예시 데이터 모드
>>>>>>> 84d553a (백엔드·프론트 초기 구현 + API 문서·협업 안내)
