#!/bin/bash

# UK Home Improvement Platform - Update MVP Lambda Function
# This script updates the MVP Lambda function with the fixed code

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
STACK_NAME="$ENVIRONMENT-uk-home-mvp"

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
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    # Check if CloudFormation template exists
    if [ ! -f "aws/cloudformation/mvp-simple.yml" ]; then
        error "MVP CloudFormation template not found"
    fi
    
    log "Prerequisites check passed"
}

# Update the CloudFormation stack
update_stack() {
    log "Updating MVP CloudFormation stack: $STACK_NAME"
    
    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
        error "Stack $STACK_NAME does not exist. Please deploy it first using mvp-deploy.sh"
    fi
    
    log "Updating stack with fixed Lambda code..."
    
    if ! aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://aws/cloudformation/mvp-simple.yml" \
        --parameters "ParameterKey=Environment,ParameterValue=$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION" 2>&1 | tee /tmp/update_output.log; then
        
        if grep -q "No updates are to be performed" /tmp/update_output.log; then
            warn "No updates to be performed for stack $STACK_NAME"
            return 0
        else
            error "Failed to update stack $STACK_NAME"
            return 1
        fi
    fi
    
    # Wait for stack update to complete
    log "Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" || error "Stack update failed for $STACK_NAME"
    
    log "Stack $STACK_NAME updated successfully"
}

# Test the updated Lambda function
test_lambda() {
    log "Testing updated Lambda function..."
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -n "$API_URL" ]; then
        log "Testing API endpoint: $API_URL/api/health"
        
        # Test health endpoint
        HEALTH_RESPONSE=$(curl -s "$API_URL/api/health" || echo "FAILED")
        
        if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
            log "✅ Health check passed"
            log "✅ Lambda function is working correctly"
        else
            warn "⚠️ Health check response: $HEALTH_RESPONSE"
        fi
        
        # Test projects endpoint
        log "Testing projects endpoint: $API_URL/api/projects"
        PROJECTS_RESPONSE=$(curl -s "$API_URL/api/projects" || echo "FAILED")
        
        if echo "$PROJECTS_RESPONSE" | grep -q "success.*true"; then
            log "✅ Projects endpoint working"
        else
            warn "⚠️ Projects endpoint response: $PROJECTS_RESPONSE"
        fi
        
        log ""
        log "🎉 API Gateway URL: $API_URL"
        log "📱 Frontend should now be able to create and retrieve projects!"
        
    else
        warn "Could not find API Gateway URL for testing"
    fi
}

# Main execution
main() {
    log "UK Home Improvement Platform - MVP Lambda Update"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    # Execute update steps
    check_prerequisites
    update_stack
    test_lambda
    
    log "MVP Lambda function updated successfully!"
    log ""
    log "Next steps:"
    log "1. Test project creation in the frontend"
    log "2. Verify projects are being stored in DynamoDB"
    log "3. Check that projects appear on the dashboard"
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