#!/bin/bash

# Setup script for DRMR Staking Program

set -e

echo "🚀 Setting up DRMR Staking Program..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Installing..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install from https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Build the program
echo "📦 Building program..."
anchor build

# Generate IDL and types
echo "📝 Generating IDL and types..."
anchor idl parse -f src/lib.rs -o target/idl/drmr_staking.json || true

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your wallet: solana config set --url devnet"
echo "2. Get some SOL: solana airdrop 2"
echo "3. Update Anchor.toml with your program ID"
echo "4. Build: anchor build"
echo "5. Deploy: anchor deploy"
echo "6. Test: anchor test"
