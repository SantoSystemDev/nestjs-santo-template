# Makefile

.PHONY: install build start lint test format migrate up down

install:
	npm install

build:
	npm run build

start:
	npm run start

start:dev:
	npm run start:dev

lint:
	npm run lint

test:
	npm run test

format:
	npm run format

migrate:dev:
	npm run migrate:dev

migrate:deploy:
	npm run migrate:deploy

up:
	docker-compose up -d

down:
	docker-compose down
