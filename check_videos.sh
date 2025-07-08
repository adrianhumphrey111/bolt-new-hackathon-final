#!/bin/bash

# Script to check video analysis status
# Usage: ./check_videos.sh [--detailed]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎬 Video Analysis Checker${NC}"
echo -e "${BLUE}========================${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable not set${NC}"
    echo -e "${YELLOW}Please set it to your Supabase database URL:${NC}"
    echo -e "${YELLOW}export DATABASE_URL='postgresql://username:password@host:port/database'${NC}"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    exit 1
fi

# Check if psycopg2 is installed
if ! python3 -c "import psycopg2" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ psycopg2 not installed, installing...${NC}"
    pip3 install psycopg2-binary
fi

# Run the analysis
echo -e "${GREEN}🚀 Running video analysis check...${NC}"
python3 query_incomplete_videos.py "$@"