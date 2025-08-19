#!/bin/bash

# UK Home Improvement Platform - MVP Deployment Script
# This script deploys the MVP version with minimal AWS resources

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
STACK_NAME="$ENVIRONMENT-uk-home-mvp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Print banner
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    UK Home Improvement Platform                              ║"
echo "║                           MVP Deployment                                     ║"
echo "║                                                                              ║"
echo "║  Environment: $ENVIRONMENT                                                        ║"
echo "║  Region: $AWS_REGION                                                      ║"
echo "║  Stack: $STACK_NAME                                                    ║"
echo "║  Timestamp: $(date)                                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
log "Checking prerequisites..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed. Please install it first: https://aws.amazon.com/cli/"
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS credentials not configured. Run 'aws configure' first."
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 18+ first."
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    error "npm is not installed. Please install npm first."
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)

info "AWS Account ID: $ACCOUNT_ID"
info "AWS User/Role: $USER_ARN"

# Build the application
log "Building the application..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install
fi

# Build TypeScript
log "Compiling TypeScript..."
npm run build

# Create Lambda deployment package
log "Creating Lambda deployment package..."
cd dist
zip -r ../lambda-deployment.zip . -x "*.map"
cd ..

# Check if zip was created successfully
if [ ! -f "lambda-deployment.zip" ]; then
    error "Failed to create Lambda deployment package"
fi

ZIP_SIZE=$(du -h lambda-deployment.zip | cut -f1)
info "Lambda package size: $ZIP_SIZE"

# Deploy the CloudFormation stack
log "Deploying MVP infrastructure stack..."

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
    log "Stack exists, updating..."
    
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://aws/cloudformation/mvp-simple.yml \
        --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION" 2>&1 | tee /tmp/update_output.log || {
            if grep -q "No updates are to be performed" /tmp/update_output.log; then
                warn "No infrastructure updates needed"
            else
                error "Failed to update stack"
            fi
        }
else
    log "Stack does not exist, creating..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://aws/cloudformation/mvp-simple.yml \
        --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION" || error "Failed to create stack"
fi

# Wait for stack operation to complete
log "Waiting for stack operation to complete (this usually takes 2-5 minutes)..."
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$AWS_REGION" 2>/dev/null || \
aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$AWS_REGION" || error "Stack operation failed"

# Get Lambda function name from stack outputs
LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Resources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "$ENVIRONMENT-uk-home-api")

# Update Lambda function code
log "Updating Lambda function code..."
aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --zip-file fileb://lambda-deployment.zip \
    --region "$AWS_REGION" || warn "Failed to update Lambda code (function may not exist yet)"

# Wait for Lambda update to complete
log "Waiting for Lambda function to be ready..."
sleep 10

# Get stack outputs
log "Deployment completed successfully!"

API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

HEALTH_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`HealthCheckUrl`].OutputValue' \
    --output text)

DYNAMODB_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`DynamoDBTable`].OutputValue' \
    --output text)

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`S3Bucket`].OutputValue' \
    --output text)

echo ""
log "🎉 MVP Deployment Summary:"
echo ""
info "Environment: $ENVIRONMENT"
info "Region: $AWS_REGION"
info "API URL: $API_URL"
info "Health Check: $HEALTH_URL"
info "DynamoDB Table: $DYNAMODB_TABLE"
info "S3 Bucket: $S3_BUCKET"
info "Lambda Function: $LAMBDA_FUNCTION_NAME"
echo ""

# Test the deployment
log "Testing the deployment..."
sleep 15  # Give Lambda time to initialize

if curl -f -s "$HEALTH_URL" > /dev/null; then
    log "✅ Health check passed!"
    
    # Test the API endpoints
    log "Testing API endpoints..."
    
    # Test projects endpoint
    PROJECTS_URL="$API_URL/api/projects"
    if curl -f -s "$PROJECTS_URL" > /dev/null; then
        log "✅ Projects endpoint working!"
    else
        warn "⚠️  Projects endpoint test failed"
    fi
    
    # Test login endpoint
    LOGIN_URL="$API_URL/api/auth/login"
    LOGIN_RESPONSE=$(curl -s -X POST "$LOGIN_URL" \
        -H "Content-Type: application/json" \
        -d '{"email":"homeowner@test.com","password":"password123"}')
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        log "✅ Login endpoint working!"
    else
        warn "⚠️  Login endpoint test failed"
    fi
    
else
    warn "⚠️  Health check failed, but deployment completed. Lambda may still be initializing."
fi

# Clean up deployment artifacts
log "Cleaning up deployment artifacts..."
rm -f lambda-deployment.zip
rm -f /tmp/update_output.log

echo ""
log "🌐 Your MVP is now live!"
echo ""
info "Available Endpoints:"
info "• Main API: $API_URL"
info "• Health Check: $HEALTH_URL"
info "• Projects: $API_URL/api/projects"
info "• Login: $API_URL/api/auth/login"
info "• Project Types: $API_URL/api/projects/types"
info "• SoW Generation: $API_URL/api/sow/generate"
echo ""
info "Test Credentials:"
info "• Homeowner - Email: homeowner@test.com, Password: password123"
info "• Builder - Email: builder@test.com, Password: password123"
echo ""
info "💰 Estimated Monthly Cost: $5-15 (very low traffic)"
info "• Lambda: $0-5 (first 1M requests free)"
info "• DynamoDB: $0-5 (pay per request)"
info "• API Gateway: $0-5 (first 1M requests $3.50)"
info "• S3: $0-1 (minimal storage)"
echo ""
log "Next steps:"
log "1. Test your API: curl $HEALTH_URL"
log "2. Update your frontend to use: $API_URL"
log "3. Monitor usage in AWS Console"
log "4. Scale up when needed"
echo ""
log "🔧 Management Commands:"
log "• View logs: aws logs tail /aws/lambda/$LAMBDA_FUNCTION_NAME --follow"
log "• Update code: ./deploy-mvp.sh $ENVIRONMENT $AWS_REGION"
log "• Delete stack: aws cloudformation delete-stack --stack-name $STACK_NAME"
echo ""
log "📚 Documentation:"
log "• Code Flow Guide: docs/CODE_FLOW_GUIDE.md"
log "• API Documentation: README.md"
log "• AWS Console: https://console.aws.amazon.com/"