#!/bin/bash
# Build script for Anchor project with IDL path fix

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ANCHOR_IDL_BUILD_PROGRAM_PATH="$SCRIPT_DIR/programs/drmr_staking"

anchor build "$@"

