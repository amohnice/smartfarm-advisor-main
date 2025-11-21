#!/bin/bash
# Disable Turbopack by unsetting the experimental flag
export NODE_OPTIONS="--no-experimental-fetch $NODE_OPTIONS"

# Run the build
echo "Running Next.js build without Turbopack..."
npx next build
