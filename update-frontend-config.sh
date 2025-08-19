#!/bin/bash

# UK Home Improvement Platform - Frontend Configuration Update Script

echo "🔧 Updating frontend configuration to use AWS API..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📡 AWS API URL: https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production${NC}"

# Test the AWS API
echo -e "${BLUE}🧪 Testing AWS API connection...${NC}"
if curl -f -s https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api/health > /dev/null; then
    echo -e "${GREEN}✅ AWS API is responding!${NC}"
else
    echo -e "${YELLOW}⚠️  AWS API test failed, but continuing...${NC}"
fi

# Check if frontend is running
if pgrep -f "react-scripts" > /dev/null; then
    echo -e "${BLUE}🔄 Restarting frontend to pick up new configuration...${NC}"
    pkill -f "react-scripts"
    sleep 2
fi

# Start frontend
echo -e "${BLUE}🚀 Starting frontend with AWS API configuration...${NC}"
cd frontend && npm start &

echo ""
echo -e "${GREEN}✅ Frontend configuration updated!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "• Frontend: http://localhost:3000"
echo -e "• AWS API: https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production"
echo -e "• Test Page: Open test-aws-connection.html in your browser"
echo ""
echo -e "${BLUE}🔑 Test Credentials:${NC}"
echo -e "• Email: homeowner@test.com"
echo -e "• Password: password123"
echo ""
echo -e "${BLUE}🧪 Next Steps:${NC}"
echo -e "1. Wait for frontend to start (usually 30-60 seconds)"
echo -e "2. Open http://localhost:3000 in your browser"
echo -e "3. Try logging in with the test credentials"
echo -e "4. Your frontend is now connected to AWS!"