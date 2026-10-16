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
