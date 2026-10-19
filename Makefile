PY ?= python3.12
VENV := .venv
VPY := $(VENV)/bin/python
VROD_URL := https://gspp.berkeley.edu/assets/uploads/page/VROD-registry-files--2026-08.xlsx

.PHONY: help setup data-download data demo-docs chain deploy api web reset test test-contracts test-backend eval e2e clean-runtime

help:
	@echo "make setup        install Python, contract and web dependencies; create .env"
	@echo "make chain        start the local Hardhat chain (terminal 1)"
	@echo "make deploy       deploy ClaimLedger to the local chain"
	@echo "make api          start the FastAPI backend on :8000 (terminal 2)"
	@echo "make web          start the web app on :5173 (terminal 3)"
	@echo "make reset        wipe app state and redeploy (keeps the chain running)"
	@echo "make test         contract + backend tests"
	@echo "make eval         run the evaluation and write eval/results/latest.json"
	@echo "make data         download Berkeley VROD (~67 MB) and build the full registry index (optional)"

setup:
	test -d $(VENV) || $(PY) -m venv $(VENV)
	$(VPY) -m pip install -q --upgrade pip
	$(VPY) -m pip install -q -r backend/requirements.txt
	cd contracts && npm install --no-fund --no-audit
	cd frontend && npm install --no-fund --no-audit
	test -f .env || cp .env.example .env
	cd contracts && npx hardhat compile

data-download:
	mkdir -p data/raw
	test -f data/raw/VROD-registry-files--2026-08.xlsx || curl -fSL -o data/raw/VROD-registry-files--2026-08.xlsx $(VROD_URL)

data: data-download
	$(VPY) backend/scripts/build_reference.py

demo-docs:
	$(VPY) backend/scripts/make_demo_docs.py

chain:
	cd contracts && npx hardhat node --hostname 127.0.0.1 --port 8545

deploy:
	cd contracts && npx hardhat run scripts/deploy.js --network localhost

api:
	cd backend && ../$(VENV)/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

web:
	cd frontend && npm run dev -- --host 127.0.0.1

clean-runtime:
	rm -f var/onceonly.sqlite
	rm -rf var/evidence

reset: clean-runtime deploy
	@echo "App state cleared and a fresh ClaimLedger deployed. Restart 'make api' so it picks up the new contract."

test: test-contracts test-backend

test-contracts:
	cd contracts && npx hardhat test

gas:
	cd contracts && WRITE_GAS=1 npx hardhat test --grep gas

test-backend:
	cd backend && ../$(VPY) -m pytest -q -p no:warnings

eval:
	$(VPY) eval/run_eval.py

e2e:
	$(VPY) eval/e2e_smoke.py

seed:
	$(VPY) backend/scripts/seed_demo.py

demo-check:
	$(VPY) backend/scripts/demo_fingerprint.py

docker-build:
	docker build -t onceonly-demo:local .

docker-run:
	docker run --rm -p 127.0.0.1:7860:7860 onceonly-demo:local
