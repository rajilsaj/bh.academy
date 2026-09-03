#!/bin/bash
# Exécuté une seule fois, à la création du volume Postgres.
# Crée le rôle en lecture seule utilisé par Metabase et la base interne de Metabase.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	-- Rôle de lecture seule : Metabase ne doit jamais pouvoir écrire.
	CREATE ROLE bantu_ro LOGIN PASSWORD '${READONLY_PASSWORD}';
	GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO bantu_ro;
	GRANT USAGE ON SCHEMA public TO bantu_ro;
	GRANT SELECT ON ALL TABLES IN SCHEMA public TO bantu_ro;

	-- Les tables et les vues n'existent pas encore (les migrations tournent plus
	-- tard) : les privilèges par défaut couvriront tout ce que l'application créera.
	ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
		GRANT SELECT ON TABLES TO bantu_ro;
	ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
		GRANT SELECT ON SEQUENCES TO bantu_ro;

	-- Base interne de Metabase, séparée des données du programme.
	CREATE ROLE metabase LOGIN PASSWORD '${METABASE_DB_PASSWORD}';
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
	CREATE DATABASE metabase OWNER metabase;
EOSQL

echo "Rôle bantu_ro et base metabase créés."
