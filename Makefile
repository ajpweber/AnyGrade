.PHONY: dev dev-web dev-api migrate test install

dev:
	docker compose up

dev-web:
	cd apps/web && npm run dev

dev-api:
	cd apps/api && uvicorn main:app --reload --port 8000

install:
	cd apps/web && npm install
	cd apps/api && pip install -r requirements.txt

migrate:
	supabase db push

test:
	cd apps/api && pytest
	cd apps/web && npm run test

ocr-experiment:
	cd apps/api && python scripts/ocr_experiment.py fixtures/
