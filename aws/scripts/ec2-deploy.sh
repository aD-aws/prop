#!/bin/bash

# UK Home Improvement Platform - Simple EC2 Deployment Script

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
STACK_NAME="$ENVIRONMENT-uk-home-ec2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Print banner
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    UK Home Improvement Platform                              ║"
echo "║                        Simple EC2 Deployment                                ║"
echo "║                                                                              ║"
echo "║  Environment: $ENVIRONMENT                                                        ║"
echo "║  Region: $AWS_REGION                                                      ║"
echo "║  Timestamp: $(date)                                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
log "Checking prerequisites..."
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed"
fi

if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS credentials not configured"
fi

# Deploy the stack
log "Deploying EC2 infrastructure stack..."

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
    log "Stack exists, updating..."
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://aws/cloudformation/ec2-simple.yml \
        --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION" || {
            if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query 'Stacks[0].StackStatus' --output text | grep -q "UPDATE_COMPLETE"; then
                warn "No updates needed"
            else
                error "Failed to update stack"
            fi
        }
else
    log "Stack does not exist, creating..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://aws/cloudformation/ec2-simple.yml \
        --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION" || error "Failed to create stack"
fi

# Wait for completion
log "Waiting for stack operation to complete (this may take 5-10 minutes)..."
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$AWS_REGION" 2>/dev/null || \
aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$AWS_REGION" || error "Stack operation failed"

# Get outputs
log "Deployment completed successfully!"

WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

PUBLIC_IP=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
    --output text)

HEALTH_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`HealthCheckURL`].OutputValue' \
    --output text)

echo ""
log "🎉 Deployment Summary:"
log "Environment: $ENVIRONMENT"
log "Region: $AWS_REGION"
log "Website URL: $WEBSITE_URL"
log "Public IP: $PUBLIC_IP"
log "Health Check: $HEALTH_URL"
echo ""

# Test the deployment
log "Testing the deployment..."
sleep 30  # Give the server time to start

if curl -f -s "$HEALTH_URL" > /dev/null; then
    log "✅ Health check passed!"
    log "🌐 Your application is now live at: $WEBSITE_URL"
else
    warn "⚠️  Health check failed, but deployment completed. The server may still be starting up."
    log "🌐 Try accessing: $WEBSITE_URL in a few minutes"
fi

echo ""
log "Next steps:"
log "1. Access your application: $WEBSITE_URL"
log "2. Test the API: $HEALTH_URL"
log "3. View projects: $WEBSITE_URL/api/projects"
log "4. Monitor logs: SSH to the instance and check /var/log/messages"