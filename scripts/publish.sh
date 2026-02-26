#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Publishing @page-speed/icon...${NC}"

if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}Error: uncommitted changes in working directory${NC}"
  exit 1
fi

echo -e "${YELLOW}Running prepublish checks...${NC}"
pnpm run prepublish

echo -e "${YELLOW}Bundle sizes:${NC}"
pnpm run bundle-analysis

VERSION=$(node -p "require('./package.json').version")

echo -e "${YELLOW}Publishing version ${VERSION} to npm...${NC}"
npm publish

git tag -a v${VERSION} -m "Release: @page-speed/icon v${VERSION}"
git push origin v${VERSION}

echo -e "${GREEN}Successfully published v${VERSION}!${NC}"
