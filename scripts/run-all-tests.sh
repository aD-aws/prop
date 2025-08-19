#!/bin/bash

# UK Home Improvement Platform - Comprehensive Test Runner
# This script runs all test suites in the correct order

set -e  # Exit on any error

echo "🚀 Starting comprehensive test suite for UK Home Improvement Platform"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    print_status "Checking if $service_name is running on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            print_success "$service_name is running"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start on port $port"
    return 1
}

# Function to cleanup background processes
cleanup() {
    print_status "Cleaning up background processes..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$REDIS_PID" ]; then
        kill $REDIS_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$DYNAMODB_PID" ]; then
        kill $DYNAMODB_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes on our ports
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:6379 | xargs kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed - skipping Docker tests"
    SKIP_DOCKER=true
fi

print_success "Prerequisites check completed"

# Setup environment
print_status "Setting up test environment..."

# Copy environment file
if [ ! -f .env.test ]; then
    cp .env.example .env.test
    echo "NODE_ENV=test" >> .env.test
    echo "REDIS_URL=redis://localhost:6379" >> .env.test
    echo "DYNAMODB_ENDPOINT=http://localhost:8000" >> .env.test
    echo "AWS_REGION=us-east-1" >> .env.test
    echo "AWS_ACCESS_KEY_ID=test" >> .env.test
    echo "AWS_SECRET_ACCESS_KEY=test" >> .env.test
fi

# Install dependencies
print_status "Installing backend dependencies..."
npm ci

print_status "Installing frontend dependencies..."
cd frontend && npm ci && cd ..

print_success "Dependencies installed"

# Start test services
print_status "Starting test services..."

# Start Redis
if command -v redis-server &> /dev/null; then
    redis-server --port 6379 --daemonize yes
    REDIS_PID=$(pgrep redis-server)
    print_success "Redis started (PID: $REDIS_PID)"
else
    print_warning "Redis not found locally, trying Docker..."
    docker run -d --name test-redis -p 6379:6379 redis:7-alpine
fi

# Start DynamoDB Local
if command -v java &> /dev/null; then
    if [ -f "dynamodb-local.jar" ]; then
        java -Djava.library.path=./DynamoDBLocal_lib -jar dynamodb-local.jar -sharedDb -port 8000 &
        DYNAMODB_PID=$!
        print_success "DynamoDB Local started (PID: $DYNAMODB_PID)"
    else
        print_warning "DynamoDB Local not found, trying Docker..."
        docker run -d --name test-dynamodb -p 8000:8000 amazon/dynamodb-local:latest
    fi
else
    print_warning "Java not found, trying Docker for DynamoDB..."
    docker run -d --name test-dynamodb -p 8000:8000 amazon/dynamodb-local:latest
fi

# Wait for services to be ready
sleep 5

# Setup DynamoDB tables
print_status "Setting up DynamoDB tables..."
export DYNAMODB_ENDPOINT=http://localhost:8000
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
node scripts/setup-dynamodb.js

print_success "Test services started"

# Phase 1: Static Analysis and Linting
print_status "Phase 1: Static Analysis and Linting"
echo "======================================"

print_status "Running backend linting..."
npm run lint
print_success "Backend linting passed"

print_status "Running frontend linting..."
cd frontend && npm run lint && cd ..
print_success "Frontend linting passed"

print_status "Running TypeScript checks..."
npx tsc --noEmit
print_success "TypeScript checks passed"

cd frontend && npx tsc --noEmit && cd ..
print_success "Frontend TypeScript checks passed"

# Phase 2: Unit Tests
print_status "Phase 2: Unit Tests"
echo "==================="

print_status "Running backend unit tests..."
npm test -- --coverage --testPathPattern="src/__tests__/(models|services|middleware)" --testTimeout=30000
print_success "Backend unit tests passed"

print_status "Running frontend unit tests..."
cd frontend && npm test -- --coverage --watchAll=false --testPathIgnorePatterns="cypress" && cd ..
print_success "Frontend unit tests passed"

# Phase 3: Integration Tests
print_status "Phase 3: Integration Tests"
echo "=========================="

print_status "Running backend integration tests..."
npm test -- --testPathPattern="src/__tests__/integration" --testTimeout=60000
print_success "Backend integration tests passed"

print_status "Running external service integration tests..."
npm test -- --testPathPattern="src/__tests__/integration/external-services" --testTimeout=90000
print_success "External service integration tests passed"

# Phase 4: API Coverage Tests
print_status "Phase 4: API Coverage Tests"
echo "==========================="

print_status "Running API coverage tests..."
npm test -- --testPathPattern="src/__tests__/api-coverage" --testTimeout=45000
print_success "API coverage tests passed"

# Phase 5: Security Tests
print_status "Phase 5: Security Tests"
echo "======================="

print_status "Running security tests..."
npm test -- --testPathPattern="src/__tests__/security" --testTimeout=30000
print_success "Security tests passed"

print_status "Running npm audit..."
npm audit --audit-level=high
print_success "npm audit passed"

# Phase 6: Performance Tests
print_status "Phase 6: Performance Tests"
echo "=========================="

print_status "Running performance tests..."
npm test -- --testPathPattern="src/__tests__/performance" --testTimeout=300000
print_success "Performance tests passed"

# Phase 7: Compliance Tests
print_status "Phase 7: Compliance Tests"
echo "========================="

print_status "Running industry standards compliance tests..."
npm test -- --testPathPattern="src/__tests__/compliance" --testTimeout=90000
print_success "Compliance tests passed"

# Phase 8: Accessibility Tests
print_status "Phase 8: Accessibility Tests"
echo "============================"

print_status "Running WCAG compliance tests..."
cd frontend && npm test -- --testPathPattern="__tests__/accessibility" --watchAll=false && cd ..
print_success "WCAG compliance tests passed"

# Phase 9: Build Tests
print_status "Phase 9: Build Tests"
echo "===================="

print_status "Building backend..."
npm run build
print_success "Backend build completed"

print_status "Building frontend..."
cd frontend && npm run build && cd ..
print_success "Frontend build completed"

# Phase 10: End-to-End Tests
print_status "Phase 10: End-to-End Tests"
echo "=========================="

# Start application servers
print_status "Starting application servers for E2E tests..."

# Start backend
NODE_ENV=test npm run dev &
BACKEND_PID=$!
print_status "Backend server started (PID: $BACKEND_PID)"

# Start frontend
cd frontend && npm start &
FRONTEND_PID=$!
cd ..
print_status "Frontend server started (PID: $FRONTEND_PID)"

# Wait for servers to be ready
check_service "Backend" 3001
check_service "Frontend" 3000

print_status "Running Cypress E2E tests..."
cd frontend && npx cypress run --browser chrome --headless && cd ..
print_success "E2E tests passed"

# Phase 11: Load Testing (if Artillery is available)
if command -v artillery &> /dev/null; then
    print_status "Phase 11: Load Testing"
    echo "======================"
    
    print_status "Running load tests..."
    artillery run .github/workflows/load-test.yml
    print_success "Load tests passed"
else
    print_warning "Artillery not found - skipping load tests"
fi

# Phase 12: Docker Tests (if Docker is available)
if [ "$SKIP_DOCKER" != "true" ]; then
    print_status "Phase 12: Docker Tests"
    echo "======================"
    
    print_status "Testing Docker builds..."
    docker build -t uk-home-improvement-backend:test .
    docker build -t uk-home-improvement-frontend:test ./frontend
    print_success "Docker builds completed"
    
    print_status "Testing Docker Compose..."
    docker-compose -f docker-compose.yml config
    print_success "Docker Compose configuration valid"
else
    print_warning "Skipping Docker tests"
fi

# Phase 13: Final Validation
print_status "Phase 13: Final Validation"
echo "=========================="

print_status "Validating test coverage..."
if [ -f "coverage/lcov.info" ]; then
    BACKEND_COVERAGE=$(grep -o 'LF:[0-9]*' coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}')
    BACKEND_COVERED=$(grep -o 'LH:[0-9]*' coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}')
    BACKEND_PERCENTAGE=$(echo "scale=2; $BACKEND_COVERED * 100 / $BACKEND_COVERAGE" | bc)
    print_status "Backend test coverage: $BACKEND_PERCENTAGE%"
fi

if [ -f "frontend/coverage/lcov.info" ]; then
    FRONTEND_COVERAGE=$(grep -o 'LF:[0-9]*' frontend/coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}')
    FRONTEND_COVERED=$(grep -o 'LH:[0-9]*' frontend/coverage/lcov.info | awk -F: '{sum+=$2} END {print sum}')
    FRONTEND_PERCENTAGE=$(echo "scale=2; $FRONTEND_COVERED * 100 / $FRONTEND_COVERAGE" | bc)
    print_status "Frontend test coverage: $FRONTEND_PERCENTAGE%"
fi

print_status "Generating test report..."
cat > test-report.md << EOF
# Test Report - $(date)

## Summary
- ✅ Static Analysis and Linting
- ✅ Unit Tests (Backend & Frontend)
- ✅ Integration Tests
- ✅ API Coverage Tests
- ✅ Security Tests
- ✅ Performance Tests
- ✅ Compliance Tests
- ✅ Accessibility Tests
- ✅ Build Tests
- ✅ End-to-End Tests
$([ "$SKIP_DOCKER" != "true" ] && echo "- ✅ Docker Tests" || echo "- ⚠️ Docker Tests (Skipped)")

## Coverage
- Backend: ${BACKEND_PERCENTAGE:-"N/A"}%
- Frontend: ${FRONTEND_PERCENTAGE:-"N/A"}%

## Test Execution Time
- Started: $(date)
- Duration: $SECONDS seconds

All tests completed successfully! 🎉
EOF

print_success "Test report generated: test-report.md"

# Final summary
echo ""
echo "=================================================================="
print_success "🎉 ALL TESTS COMPLETED SUCCESSFULLY!"
echo "=================================================================="
print_status "Total execution time: $SECONDS seconds"
print_status "Test report saved to: test-report.md"
print_status "Coverage reports available in: coverage/ and frontend/coverage/"
echo ""
print_success "The UK Home Improvement Platform is ready for deployment! 🚀"