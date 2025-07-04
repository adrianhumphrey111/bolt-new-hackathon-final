#!/bin/bash

# Setup Startup Branches Script
# This script helps you create the recommended git branch structure
# for maintaining your hackathon submission while developing your startup

echo "Setting up startup development branch structure..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

# Function to create and push branch
create_branch() {
    local branch_name=$1
    local base_branch=$2
    
    echo -e "\n${YELLOW}Creating branch: $branch_name from $base_branch${NC}"
    
    # Check if branch already exists locally
    if git show-ref --verify --quiet refs/heads/$branch_name; then
        echo -e "${YELLOW}Branch $branch_name already exists locally${NC}"
    else
        git checkout $base_branch
        git checkout -b $branch_name
        echo -e "${GREEN}Created local branch: $branch_name${NC}"
    fi
    
    # Push to remote if it doesn't exist
    if ! git ls-remote --heads origin $branch_name | grep -q $branch_name; then
        git push -u origin $branch_name
        echo -e "${GREEN}Pushed branch to remote: $branch_name${NC}"
    else
        echo -e "${YELLOW}Branch $branch_name already exists on remote${NC}"
    fi
}

# Step 1: Create hackathon-submission branch
echo -e "\n${GREEN}Step 1: Creating hackathon archive branch${NC}"
create_branch "hackathon-submission" "main"

# Tag the hackathon version
echo -e "\n${YELLOW}Creating hackathon submission tag${NC}"
git checkout hackathon-submission
if ! git tag | grep -q "hackathon-v1.0"; then
    git tag -a hackathon-v1.0 -m "Hackathon submission - frozen version"
    git push origin hackathon-v1.0
    echo -e "${GREEN}Created and pushed tag: hackathon-v1.0${NC}"
else
    echo -e "${YELLOW}Tag hackathon-v1.0 already exists${NC}"
fi

# Step 2: Create development branch
echo -e "\n${GREEN}Step 2: Creating development branch${NC}"
create_branch "development" "main"

# Step 3: Create production branch
echo -e "\n${GREEN}Step 3: Creating production branch${NC}"
create_branch "production" "development"

# Step 4: Create initial feature branches
echo -e "\n${GREEN}Step 4: Creating initial feature branches${NC}"
git checkout development

feature_branches=(
    "feature/new-domain"
    "feature/enhanced-ui"
    "feature/scalability"
    "feature/monetization"
)

for feature in "${feature_branches[@]}"; do
    create_branch "$feature" "development"
done

# Return to development branch
git checkout development

echo -e "\n${GREEN}Branch structure created successfully!${NC}"
echo -e "\nCurrent branch structure:"
git branch -a | grep -E "(hackathon-submission|development|production|feature/)" | sort

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Go to your Git provider (GitHub/GitLab) and set branch protection rules"
echo "2. Set 'development' as the default branch"
echo "3. Protect 'hackathon-submission' branch from any modifications"
echo "4. Configure your deployment platforms to use the appropriate branches"

echo -e "\n${GREEN}Recommended branch protection settings:${NC}"
echo -e "${YELLOW}hackathon-submission:${NC} No direct pushes, no force pushes, no deletions"
echo -e "${YELLOW}production:${NC} Require PR reviews, require status checks, no force pushes"
echo -e "${YELLOW}development:${NC} Require status checks"

echo -e "\n${GREEN}Script completed!${NC}"