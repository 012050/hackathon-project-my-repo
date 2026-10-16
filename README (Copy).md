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
```

## AI 서버 설정

영수증 인식·메뉴 추천·영양 추정은 OpenAI 호환 AI 서버를 씁니다. 주소·모델·키는 `backend/app/ai.py` 가
환경변수 `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` 로 읽고(코드 수정 불필요), 값은 `backend/.env.example` 에 정리돼 있습니다.
개발용 서버는 `AI_BASE_URL=https://mcu.osxteams.net/v1`(끝에 `/v1` 필수, 모델 `qwen`, 키 불필요)이고,
`.env` 파일은 자동으로 읽히지 않으니 실행하는 터미널에서 설정하세요.

```bash
# Git Bash / macOS
cd backend && AI_BASE_URL=https://mcu.osxteams.net/v1 uvicorn app.main:app --reload --port 8000
# PowerShell
cd backend; $env:AI_BASE_URL="https://mcu.osxteams.net/v1"; uvicorn app.main:app --reload --port 8000
# docker compose
AI_BASE_URL=https://mcu.osxteams.net/v1 docker compose up --build
```

AI 서버가 안 될 때(발표장 네트워크 등)는 `MOCK=1` 로 실행하면 예시 데이터로 응답합니다.
