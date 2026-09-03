SHELL := /bin/sh
COMPOSE := docker compose

.PHONY: help up down logs build migrate seed reset psql shell backup restore dev

help:
	@echo "make up       — construit et démarre toute la pile"
	@echo "make down     — arrête la pile (les données de ./data sont conservées)"
	@echo "make logs     — suit les journaux de l'application"
	@echo "make migrate  — applique les migrations SQL"
	@echo "make seed     — insère la promotion de démonstration (efface les données)"
	@echo "make reset    — EFFACE ./data puis reconstruit tout"
	@echo "make psql     — ouvre un shell psql sur la base"
	@echo "make backup   — écrit un dump SQL dans ./backups"
	@echo "make restore F=fichier.sql — restaure un dump de ./backups"
	@echo "make dev      — serveur Next.js local (base dans Docker)"

up:
	$(COMPOSE) up -d --build
	@echo ""
	@echo "Application : http://localhost"
	@echo "Metabase    : http://localhost/bi"
	@echo "Données     : ./data (base, fichiers apprenants, certificats TLS)"

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f app

build:
	$(COMPOSE) build

migrate:
	$(COMPOSE) exec app node dist-scripts/cli.cjs migrate

seed:
	$(COMPOSE) exec app node dist-scripts/cli.cjs seed

# Les données sont des montages liés : `down -v` ne les supprime plus.
# Il faut effacer ./data explicitement.
reset:
	$(COMPOSE) down
	rm -rf ./data
	$(COMPOSE) up -d --build

psql:
	$(COMPOSE) exec db psql -U bantu -d bantuhub

shell:
	$(COMPOSE) exec app sh

# pg_dump écrit dans /backups, monté sur ./backups : pas de redirection shell,
# donc pas de risque d'altération du fichier.
backup:
	@mkdir -p backups
	$(COMPOSE) exec -T db pg_dump -U bantu --clean --if-exists bantuhub \
		-f /backups/bantuhub-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Sauvegarde écrite dans ./backups"

restore:
	@test -n "$(F)" || (echo "Usage : make restore F=bantuhub-....sql" && exit 1)
	$(COMPOSE) exec -T db psql -U bantu -d bantuhub -v ON_ERROR_STOP=1 -f /backups/$(F)
	@echo "Restauration terminée"

dev:
	npm run dev
