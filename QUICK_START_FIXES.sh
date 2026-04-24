#!/bin/bash

# 🚀 Quick Start Guide - 4 System Fixes Implementation

echo ""
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                   🎯 4 SYSTEM FIXES - QUICK START                      ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function
print_step() {
    echo -e "${BLUE}→${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  STEP 1: Verify Prerequisites"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Check Redis
print_step "Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is running"
else
    print_error "Redis is NOT running"
    echo ""
    echo "  Start Redis with:"
    echo "  $ redis-server"
    echo ""
    exit 1
fi

# Check Python
print_step "Checking Python environment..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python $PYTHON_VERSION found"
else
    print_error "Python3 not found"
    exit 1
fi

# Check Node/npm
print_step "Checking Node.js..."
if command -v npm &> /dev/null; then
    NODE_VERSION=$(npm --version)
    print_success "npm $NODE_VERSION found"
else
    print_warning "npm not found (optional for testing)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  STEP 2: Start Backend"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

print_step "Starting Django backend..."
echo "  Command: cd config && python manage.py runserver"
echo ""
echo "  Open in a NEW TERMINAL and run:"
echo "  $ cd config"
echo "  $ source ../.venv/bin/activate"
echo "  $ python manage.py runserver"
echo ""
read -p "  Press ENTER once backend is running... "

# Check backend
print_step "Verifying backend..."
if curl -s http://127.0.0.1:8000/ai/api/health/ > /dev/null 2>&1; then
    print_success "Backend is responding!"
else
    print_error "Backend is not responding. Make sure it's running on port 8000"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  STEP 3: Start Frontend"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

print_step "Starting Vite frontend..."
echo "  Command: cd kenya-s-cultural-mosaic && npm run dev"
echo ""
echo "  Open in a NEW TERMINAL and run:"
echo "  $ cd kenya-s-cultural-mosaic"
echo "  $ npm run dev"
echo ""
read -p "  Press ENTER once frontend is running... "

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  STEP 4: Test the 4 Fixes"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

print_step "Opening test guide..."
echo ""
echo "  In your browser, navigate to: http://localhost:5173"
echo ""
echo "  Then test each fix:"
echo ""
echo "  🔹 FIX 1: Redis Memory (Last 10 Messages)"
echo "     - Ask: 'Tell me about the Kikuyu people'"
echo "     - Ask: 'What are their traditions?'"
echo "     - Say 'Johnson' to reactivate AI"
echo "     - The system should remember both questions"
echo ""
echo "  🔹 FIX 2: Navigation"
echo "     - Ask: 'Take me to the Maasai community page'"
echo "     - Expected: AI explains, then navigates"
echo "     - Or try: 'Show me all communities'"
echo ""
echo "  🔹 FIX 3: Text Highlighting"
echo "     - Ask: 'Highlight the page title'"
echo "     - Expected: Golden animated highlight appears"
echo "     - Or try: 'Highlight the explore button'"
echo ""
echo "  🔹 FIX 4: Selected Text Understanding"
echo "     - Highlight any text on the page"
echo "     - Ask: 'Tell me more about this'"
echo "     - Expected: AI references what you highlighted"
echo ""

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  STEP 5: Verify Redis Storage"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

print_step "Checking Redis storage..."
echo ""
echo "  In another terminal, run:"
echo "  $ redis-cli"
echo ""
echo "  Then check:"
echo "  > KEYS 'chat:*'           # See all conversations"
echo "  > LRANGE chat:conv_* 0 -1 # See messages in a conversation"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  Documentation Files"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

print_success "FIXES_VERIFICATION.md - Detailed verification guide"
print_success "IMPLEMENTATION_SUMMARY_FIXES.md - Complete implementation details"
print_success "test_fixes.sh - Automated bash test script"
echo ""

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  🎉 All Systems Ready!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Summary of 4 Fixes:"
echo ""
echo "  ✅ Fix 1: Redis Memory - System remembers last 10 messages"
echo "  ✅ Fix 2: Navigation - AI navigates to community pages"
echo "  ✅ Fix 3: Highlighting - AI highlights elements with animation"
echo "  ✅ Fix 4: Selected Text - AI understands what you highlighted"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
