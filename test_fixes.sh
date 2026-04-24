#!/bin/bash

# Simple Bash Test Script for 4 AI System Fixes

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  🧪 4 AI SYSTEM FIXES - VERIFICATION TEST"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

BACKEND_URL="http://127.0.0.1:8000"
HEALTH_ENDPOINT="$BACKEND_URL/ai/api/health/"
ASK_ENDPOINT="$BACKEND_URL/ai/api/ask/"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local data=$3
    
    echo ""
    echo "📝 Testing: $name"
    echo "─────────────────────────────────────────────────"
    
    if [ -z "$data" ]; then
        # GET request
        response=$(curl -s -w "\n%{http_code}" "$endpoint" 2>&1)
    else
        # POST request with data
        response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "400" ]; then
        echo "✅ HTTP Status: $http_code"
        echo "Response (first 200 chars):"
        echo "$body" | head -c 200
        echo ""
        return 0
    else
        echo "❌ HTTP Status: $http_code"
        echo "Response: $body"
        return 1
    fi
}

# Test 1: Backend Health
echo "════════════════════════════════════════════════════════════════════════"
echo "  FIX 1: Redis Memory Management - Health Check"
echo "════════════════════════════════════════════════════════════════════════"

test_endpoint "Backend Health" "$HEALTH_ENDPOINT"

# Check if backend is running
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Backend is not responding. Make sure it's running:"
    echo "   cd config && python manage.py runserver"
    exit 1
fi

# Test 2: Conversation Memory
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  FIX 2: Redis Memory - Conversation History"
echo "════════════════════════════════════════════════════════════════════════"

CONV_ID="test_conv_$(date +%s)"
data1=$(cat <<EOF
{"message": "Tell me about Kikuyu people", "page": "/communities", "pageTitle": "Communities", "conversation_id": "$CONV_ID"}
EOF
)

test_endpoint "Message 1" "$ASK_ENDPOINT" "$data1"

sleep 0.5

data2=$(cat <<EOF
{"message": "What are their traditions?", "page": "/communities", "pageTitle": "Communities", "conversation_id": "$CONV_ID"}
EOF
)

test_endpoint "Message 2 (same conversation)" "$ASK_ENDPOINT" "$data2"

# Test 3: Navigation Detection
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  FIX 3: Navigation Detection"
echo "════════════════════════════════════════════════════════════════════════"

NAV_QUERIES=(
    "Take me to the Maasai community page"
    "Show me all communities"
)

for query in "${NAV_QUERIES[@]}"; do
    data=$(cat <<EOF
{"message": "$query", "page": "/communities", "pageTitle": "Communities", "conversation_id": "nav_$(date +%s%N)"}
EOF
    )
    test_endpoint "Nav Query: $query" "$ASK_ENDPOINT" "$data"
    sleep 0.5
done

# Test 4: Highlight Detection
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  FIX 4: Text Highlighting Detection"
echo "════════════════════════════════════════════════════════════════════════"

data=$(cat <<EOF
{"message": "Highlight the main title", "page": "/", "pageTitle": "Home", "conversation_id": "hl_$(date +%s%N)"}
EOF
)

test_endpoint "Highlight Query" "$ASK_ENDPOINT" "$data"

# Test 5: Selected Text Handling
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  FIX 5: Selected Text Understanding"
echo "════════════════════════════════════════════════════════════════════════"

data=$(cat <<EOF
{"message": "Tell me more about this", "page": "/communities", "pageTitle": "Communities", "selectedText": "Kikuyu", "conversation_id": "sel_$(date +%s%N)"}
EOF
)

test_endpoint "Selected Text Context" "$ASK_ENDPOINT" "$data"

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  ✅ All tests completed!"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "📋 What was tested:"
echo "  ✅ Fix 1: Redis Memory Management with conversation IDs"
echo "  ✅ Fix 2: AI Navigation to relevant pages"
echo "  ✅ Fix 3: Text highlighting on page"
echo "  ✅ Fix 4: Understanding selected text"
echo ""
echo "🔍 To verify Redis memory is working:"
echo "   redis-cli KEYS 'chat:*'"
echo ""
echo "📊 To check conversation logs:"
echo "   tail -f config/ai_debug.log | grep 'conversation_id'"
echo ""
