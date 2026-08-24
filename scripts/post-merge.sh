#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Database schema changes are applied by the API's idempotent
# DatabaseInitializer. Do not run drizzle-kit push here: its snapshot does
# not include the public dictionary tables and can propose deleting data.
