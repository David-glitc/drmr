#!/bin/bash

# DRMR Staking Program Deployment Script
# This script builds, upgrades the program, upgrades the IDL, and verifies deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Program configuration
PROGRAM_NAME="drmr_staking"
PROGRAM_ID="FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX"
CLUSTER="devnet"

# Paths
SO_PATH="target/deploy/${PROGRAM_NAME}.so"
IDL_PATH="target/idl/${PROGRAM_NAME}.json"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DRMR Staking Program Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Program: ${GREEN}${PROGRAM_NAME}${NC}"
echo -e "Program ID: ${GREEN}${PROGRAM_ID}${NC}"
echo -e "Cluster: ${GREEN}${CLUSTER}${NC}"
echo ""

# Step 1: Build the program
echo -e "${YELLOW}[1/4] Building program...${NC}"
if anchor build; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Check if .so file exists
if [ ! -f "$SO_PATH" ]; then
    echo -e "${RED}✗ Error: ${SO_PATH} not found${NC}"
    exit 1
fi

# Step 2: Upgrade the program
echo -e "${YELLOW}[2/4] Upgrading program on-chain...${NC}"
if anchor upgrade ${SO_PATH} --program-id ${PROGRAM_ID}; then
    echo -e "${GREEN}✓ Program upgrade successful${NC}"
else
    echo -e "${RED}✗ Program upgrade failed${NC}"
    exit 1
fi
echo ""

# Step 3: Upgrade the IDL
echo -e "${YELLOW}[3/4] Upgrading IDL on-chain...${NC}"
if [ ! -f "$IDL_PATH" ]; then
    echo -e "${RED}✗ Error: ${IDL_PATH} not found${NC}"
    exit 1
fi

if anchor idl upgrade --filepath ${IDL_PATH} ${PROGRAM_ID}; then
    echo -e "${GREEN}✓ IDL upgrade successful${NC}"
else
    echo -e "${RED}✗ IDL upgrade failed${NC}"
    exit 1
fi
echo ""

# Step 4: Verify deployment
echo -e "${YELLOW}[4/4] Verifying deployment...${NC}"
if solana program show ${PROGRAM_ID}; then
    echo ""
    echo -e "${GREEN}✓ Deployment verified${NC}"
else
    echo -e "${RED}✗ Verification failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Program ID: ${BLUE}${PROGRAM_ID}${NC}"
echo -e "Cluster: ${BLUE}${CLUSTER}${NC}"
echo ""
