#!/bin/bash

# UK Home Improvement Platform - MVP Deployment with Cognito
# This script deploys the MVP with AWS Cognito authentication

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
COGNITO_STACK_NAME="$ENVIRONMENT-uk-home-improvement-cognito"
MVP_STACK_NAME="$ENVIRONMENT-uk-home-improvement-mvp"

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
    
    # Check if CloudFormation templates exist
    if [ ! -f "aws/cloudformation/cognito.yml" ]; then
        error "Cognito CloudFormation template not found"
    fi
    
    if [ ! -f "aws/cloudformation/mvp-simple.yml" ]; then
        error "MVP CloudFormation template not found"
    fi
    
    log "Prerequisites check passed"
}

# Deploy CloudFormation stack
deploy_stack() {
    local stack_name=$1
    local template_file=$2
    local parameters=$3
    
    log "Deploying stack: $stack_name"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$stack_name" --region "$AWS_REGION" &> /dev/null; then
        log "Stack $stack_name exists, updating..."
        if ! aws cloudformation update-stack \
            --stack-name "$stack_name" \
            --template-body "file://$template_file" \
            --parameters "$parameters" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --region "$AWS_REGION" 2>&1 | tee /tmp/update_output.log; then
            
            if grep -q "No updates are to be performed" /tmp/update_output.log; then
                warn "No updates to be performed for stack $stack_name"
                return 0
            else
                error "Failed to update stack $stack_name"
                return 1
            fi
        fi
        
        # Wait for stack update to complete
        log "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name "$stack_name" \
            --region "$AWS_REGION" || error "Stack update failed for $stack_name"
    else
        log "Stack $stack_name does not exist, creating..."
        aws cloudformation create-stack \
            --stack-name "$stack_name" \
            --template-body "file://$template_file" \
            --parameters "$parameters" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --region "$AWS_REGION" || error "Failed to create stack $stack_name"
        
        # Wait for stack creation to complete
        log "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete \
            --stack-name "$stack_name" \
            --region "$AWS_REGION" || error "Stack creation failed for $stack_name"
    fi
    
    log "Stack $stack_name deployed successfully"
}

# Deploy Cognito stack
deploy_cognito() {
    log "Deploying Cognito authentication stack..."
    
    deploy_stack \
        "$COGNITO_STACK_NAME" \
        "aws/cloudformation/cognito.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
}

# Deploy MVP stack
deploy_mvp() {
    log "Deploying MVP application stack..."
    
    deploy_stack \
        "$MVP_STACK_NAME" \
        "aws/cloudformation/mvp-simple.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
}

# Get stack outputs
get_outputs() {
    log "Getting deployment outputs..."
    
    # Get Cognito outputs
    USER_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    IDENTITY_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    USER_POOL_DOMAIN=$(aws cloudformation describe-stacks \
        --stack-name "$COGNITO_STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$MVP_STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo "NOT_FOUND")
}

# Create frontend configuration
create_frontend_config() {
    log "Creating frontend configuration..."
    
    # Create AWS configuration for frontend
    cat > frontend/src/aws-config.js << EOF
const awsConfig = {
  Auth: {
    region: '$AWS_REGION',
    userPoolId: '$USER_POOL_ID',
    userPoolWebClientId: '$USER_POOL_CLIENT_ID',
    identityPoolId: '$IDENTITY_POOL_ID',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  },
  API: {
    endpoints: [
      {
        name: 'api',
        endpoint: '$API_URL',
        region: '$AWS_REGION'
      }
    ]
  }
};

export default awsConfig;
EOF

    log "Frontend configuration created at frontend/src/aws-config.js"
}

# Test the deployment
test_deployment() {
    log "Testing deployment..."
    
    if [ "$API_URL" != "NOT_FOUND" ]; then
        log "Testing API endpoint: $API_URL/api/health"
        
        # Test health endpoint
        if curl -f -s "$API_URL/api/health" > /dev/null; then
            log "✅ Health check passed"
        else
            warn "⚠️ Health check failed"
        fi
    else
        warn "Could not find API Gateway URL for testing"
    fi
}

# Create test users
create_test_users() {
    log "Creating test users in Cognito..."
    
    if [ "$USER_POOL_ID" != "NOT_FOUND" ]; then
        # Create homeowner test user
        aws cognito-idp admin-create-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "homeowner@test.com" \
            --user-attributes \
                Name=email,Value="homeowner@test.com" \
                Name=given_name,Value="John" \
                Name=family_name,Value="Smith" \
                Name="custom:user_type",Value="homeowner" \
            --temporary-password "TempPass123!" \
            --message-action SUPPRESS \
            --region "$AWS_REGION" 2>/dev/null || warn "Homeowner user may already exist"
        
        # Set permanent password
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "homeowner@test.com" \
            --password "Password123!" \
            --permanent \
            --region "$AWS_REGION" 2>/dev/null || warn "Could not set homeowner password"
        
        # Create builder test user
        aws cognito-idp admin-create-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "builder@test.com" \
            --user-attributes \
                Name=email,Value="builder@test.com" \
                Name=given_name,Value="Mike" \
                Name=family_name,Value="Builder" \
                Name="custom:user_type",Value="builder" \
                Name="custom:company_name",Value="Builder Co Ltd" \
            --temporary-password "TempPass123!" \
            --message-action SUPPRESS \
            --region "$AWS_REGION" 2>/dev/null || warn "Builder user may already exist"
        
        # Set permanent password
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "builder@test.com" \
            --password "Password123!" \
            --permanent \
            --region "$AWS_REGION" 2>/dev/null || warn "Could not set builder password"
        
        log "✅ Test users created"
    else
        warn "Could not create test users - User Pool ID not found"
    fi
}

# Main execution
main() {
    log "UK Home Improvement Platform - MVP + Cognito Deployment"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    # Execute deployment steps
    check_prerequisites
    deploy_cognito
    deploy_mvp
    get_outputs
    create_frontend_config
    create_test_users
    test_deployment
    
    log "Deployment completed successfully!"
    log ""
    log "🎉 Deployment Summary:"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    log "API URL: $API_URL"
    log "User Pool ID: $USER_POOL_ID"
    log "User Pool Client ID: $USER_POOL_CLIENT_ID"
    log "Identity Pool ID: $IDENTITY_POOL_ID"
    log "Cognito Domain: $USER_POOL_DOMAIN"
    log ""
    log "Test Credentials:"
    log "Homeowner: homeowner@test.com / Password123!"
    log "Builder: builder@test.com / Password123!"
    log ""
    log "Next steps:"
    log "1. Update your frontend to use AWS Amplify with the generated config"
    log "2. Test authentication with the Cognito users"
    log "3. Verify API calls work with Cognito JWT tokens"
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