#!/bin/bash
# Wrapper script to set ANCHOR_PROVIDER_URL before running the TypeScript script
# This allows Anchor's workspace to work properly

# Set ANCHOR_PROVIDER_URL if not already set
export ANCHOR_PROVIDER_URL=${ANCHOR_PROVIDER_URL:-"https://api.devnet.solana.com"}

# Run the TypeScript script with all arguments
npx tsx scripts/initialize_pool_workspace.ts "$@"

