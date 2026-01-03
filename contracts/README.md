# DRMR Contracts

This directory contains Solana programs (smart contracts) for the DRMR ecosystem.

## Programs

### drmr-staking

A comprehensive staking pool program for DRMR tokens with:
- Configurable stake periods (epoch cycles)
- Flexible reward cycles
- APY management
- Admin controls
- Comprehensive tracking

See [drmr-staking/README.md](./drmr-staking/README.md) for detailed documentation.

## Setup

### Prerequisites

- Rust 1.70+
- Solana CLI 1.18+
- Anchor 0.30.0+

### Quick Start

```bash
cd drmr-staking
./scripts/setup.sh
anchor build
anchor test
```

## Deployment

### Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Mainnet

```bash
anchor deploy --provider.cluster mainnet
```

## Testing

All programs include comprehensive test suites:

```bash
anchor test
```

## Security

- All programs follow Solana best practices
- Comprehensive input validation
- Math overflow protection
- Admin access controls
- Emergency pause functionality
