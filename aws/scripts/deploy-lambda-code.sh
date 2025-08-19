#!/bin/bash

# UK Home Improvement Platform - Lambda Code Deployment Script
# This script builds and deploys the actual application code to Lambda functions

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
STACK_NAME="$ENVIRONMENT-uk-home-improvement-lambda"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if we're in the project root
    if [ ! -f "package.json" ]; then
        error "Must be run from project root directory"
    fi
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    log "Prerequisites check passed"
}

# Install dependencies and build
build_application() {
    log "Installing dependencies and building application..."
    
    # Install production dependencies
    npm ci --only=production
    
    # Build TypeScript
    npm run build
    
    # Copy package.json to dist for Lambda
    cp package.json dist/
    
    # Install production dependencies in dist
    cd dist
    npm ci --only=production
    cd ..
    
    log "Application built successfully"
}

# Create Lambda deployment package
create_deployment_package() {
    log "Creating Lambda deployment package..."
    
    # Create a clean deployment directory
    rm -rf lambda-deploy
    mkdir lambda-deploy
    
    # Copy built application
    cp -r dist/* lambda-deploy/
    
    # Copy node_modules (production only)
    cp -r dist/node_modules lambda-deploy/
    
    # Create the deployment zip
    cd lambda-deploy
    zip -r ../lambda-deployment.zip . -x "*.git*" "*.DS_Store*" "test/*" "tests/*" "*.test.js" "*.spec.js"
    cd ..
    
    # Clean up
    rm -rf lambda-deploy
    
    log "Deployment package created: lambda-deployment.zip"
}

# Upload to S3 for Lambda deployment
upload_to_s3() {
    log "Uploading deployment package to S3..."
    
    # Create S3 bucket for deployments if it doesn't exist
    DEPLOYMENT_BUCKET="$ENVIRONMENT-uk-home-improvement-deployments"
    
    if ! aws s3 ls "s3://$DEPLOYMENT_BUCKET" &> /dev/null; then
        log "Creating deployment bucket: $DEPLOYMENT_BUCKET"
        aws s3 mb "s3://$DEPLOYMENT_BUCKET" --region "$AWS_REGION"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$DEPLOYMENT_BUCKET" \
            --versioning-configuration Status=Enabled
    fi
    
    # Upload the deployment package
    DEPLOYMENT_KEY="lambda-code/$(date +%Y%m%d-%H%M%S)-lambda-deployment.zip"
    aws s3 cp lambda-deployment.zip "s3://$DEPLOYMENT_BUCKET/$DEPLOYMENT_KEY"
    
    log "Deployment package uploaded to s3://$DEPLOYMENT_BUCKET/$DEPLOYMENT_KEY"
    
    # Export for use in CloudFormation
    export DEPLOYMENT_BUCKET
    export DEPLOYMENT_KEY
}

# Update Lambda functions with new code
update_lambda_functions() {
    log "Updating Lambda functions with new code..."
    
    # Get the function names from CloudFormation stack
    FUNCTIONS=$(aws cloudformation describe-stack-resources \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
        --output text)
    
    if [ -z "$FUNCTIONS" ]; then
        error "No Lambda functions found in stack $STACK_NAME"
    fi
    
    # Update each function
    for FUNCTION_NAME in $FUNCTIONS; do
        log "Updating function: $FUNCTION_NAME"
        
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --s3-bucket "$DEPLOYMENT_BUCKET" \
            --s3-key "$DEPLOYMENT_KEY" \
            --region "$AWS_REGION"
        
        # Wait for update to complete
        aws lambda wait function-updated \
            --function-name "$FUNCTION_NAME" \
            --region "$AWS_REGION"
        
        log "Function $FUNCTION_NAME updated successfully"
    done
}

# Update environment variables for Lambda functions
update_environment_variables() {
    log "Updating Lambda function environment variables..."
    
    # Get DynamoDB table name from CloudFormation
    DYNAMODB_TABLE=$(aws cloudformation describe-stacks \
        --stack-name "$ENVIRONMENT-uk-home-improvement-dynamodb" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`TableName`].OutputValue' \
        --output text 2>/dev/null || echo "uk-home-improvement-platform")
    
    # Get S3 bucket name from CloudFormation
    S3_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$ENVIRONMENT-uk-home-improvement-dynamodb" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' \
        --output text 2>/dev/null || echo "uk-home-improvement-documents")
    
    # Environment variables for Lambda
    ENV_VARS="{
        \"NODE_ENV\": \"production\",
        \"AWS_REGION\": \"$AWS_REGION\",
        \"DYNAMODB_TABLE_NAME\": \"$DYNAMODB_TABLE\",
        \"S3_BUCKET_NAME\": \"$S3_BUCKET\",
        \"JWT_SECRET\": \"$(openssl rand -base64 32)\",
        \"BEDROCK_REGION\": \"us-east-1\",
        \"BEDROCK_MODEL_ID\": \"anthropic.claude-3-5-sonnet-20241022-v2:0\"
    }"
    
    # Update each function's environment variables
    FUNCTIONS=$(aws cloudformation describe-stack-resources \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
        --output text)
    
    for FUNCTION_NAME in $FUNCTIONS; do
        log "Updating environment variables for: $FUNCTION_NAME"
        
        aws lambda update-function-configuration \
            --function-name "$FUNCTION_NAME" \
            --environment "Variables=$ENV_VARS" \
            --region "$AWS_REGION" > /dev/null
        
        log "Environment variables updated for $FUNCTION_NAME"
    done
}

# Test the deployment
test_deployment() {
    log "Testing Lambda deployment..."
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$ENVIRONMENT-uk-home-improvement-mvp" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -n "$API_URL" ]; then
        log "Testing API endpoint: $API_URL/api/health"
        
        # Test health endpoint
        if curl -f -s "$API_URL/api/health" > /dev/null; then
            log "✅ Health check passed"
        else
            warn "⚠️ Health check failed, but deployment completed"
        fi
    else
        warn "Could not find API Gateway URL for testing"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f lambda-deployment.zip
    rm -rf lambda-deploy
    rm -rf dist/node_modules
}

# Main execution
main() {
    log "UK Home Improvement Platform - Lambda Code Deployment"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Execute deployment steps
    check_prerequisites
    build_application
    create_deployment_package
    upload_to_s3
    update_lambda_functions
    update_environment_variables
    test_deployment
    
    log "Lambda code deployment completed successfully!"
    log "Your API is now running the latest application code"
}

# Script usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [AWS_REGION]"
    echo "  ENVIRONMENT: staging or production (default: production)"
    echo "  AWS_REGION: AWS region (default: eu-west-2)"
    echo ""
    echo "Examples:"
    echo "  $0 production eu-west-2"
    echo "  $0 staging eu-west-1"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Validate environment parameter
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
fi

# Execute main function
main