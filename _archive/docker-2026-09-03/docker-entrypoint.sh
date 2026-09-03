#!/bin/sh
set -e

echo "Migrations et amorçage de la base…"
node dist-scripts/cli.cjs bootstrap

echo "Démarrage de l'application."
exec "$@"
