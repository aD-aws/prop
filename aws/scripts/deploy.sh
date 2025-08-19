#!/bin/bash

# UK Home Improvement Platform - AWS Deployment Script
# This script deploys the complete AWS infrastructure for the platform

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
STACK_PREFIX="$ENVIRONMENT-uk-home-improvement"

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
    if [ ! -d "aws/cloudformation" ]; then
        error "CloudFormation templates directory not found"
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
    else
        log "Stack $stack_name does not exist, creating..."
        aws cloudformation create-stack \
            --stack-name "$stack_name" \
            --template-body "file://$template_file" \
            --parameters "$parameters" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --region "$AWS_REGION" || error "Failed to create stack $stack_name"
    fi
    
    # Wait for stack operation to complete
    log "Waiting for stack operation to complete..."
    aws cloudformation wait stack-update-complete \
        --stack-name "$stack_name" \
        --region "$AWS_REGION" 2>/dev/null || \
    aws cloudformation wait stack-create-complete \
        --stack-name "$stack_name" \
        --region "$AWS_REGION" || error "Stack operation failed for $stack_name"
    
    log "Stack $stack_name deployed successfully"
}

# Main deployment function
deploy_infrastructure() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    # 1. Deploy VPC and networking infrastructure
    deploy_stack \
        "$STACK_PREFIX-infrastructure" \
        "aws/cloudformation/infrastructure.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    
    # 2. Deploy DynamoDB and backup configuration
    deploy_stack \
        "$STACK_PREFIX-dynamodb" \
        "aws/cloudformation/dynamodb.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    
    # 3. Deploy Lambda functions
    deploy_stack \
        "$STACK_PREFIX-lambda" \
        "aws/cloudformation/lambda-functions.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    
    # 4. Deploy ECS Fargate services
    deploy_stack \
        "$STACK_PREFIX-ecs" \
        "aws/cloudformation/ecs-fargate.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    
    # 5. Deploy WAF security
    deploy_stack \
        "$STACK_PREFIX-waf" \
        "aws/cloudformation/waf.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    
    # 6. Deploy X-Ray tracing
    deploy_stack \
        "$STACK_PREFIX-xray" \
        "aws/cloudformation/xray.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    
    # 7. Deploy monitoring and alarms
    deploy_stack \
        "$STACK_PREFIX-monitoring" \
        "aws/cloudformation/monitoring.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    
    # 8. Deploy comprehensive monitoring dashboards
    deploy_stack \
        "$STACK_PREFIX-comprehensive-monitoring" \
        "aws/cloudformation/comprehensive-monitoring.yml" \
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
}

# Deploy CI/CD pipeline (only for production)
deploy_pipeline() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Deploying CI/CD pipeline..."
        
        # Check if GitHub token is provided
        if [ -z "$GITHUB_TOKEN" ]; then
            warn "GITHUB_TOKEN environment variable not set. Skipping pipeline deployment."
            return
        fi
        
        deploy_stack \
            "uk-home-improvement-pipeline" \
            "aws/codepipeline/pipeline.yml" \
            "ParameterKey=GitHubToken,ParameterValue=$GITHUB_TOKEN"
    fi
}

# Enable auto-scaling
configure_auto_scaling() {
    log "Configuring auto-scaling..."
    
    # ECS Service Auto Scaling
    aws application-autoscaling register-scalable-target \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$STACK_PREFIX-cluster/$STACK_PREFIX-backend-service" \
        --min-capacity 2 \
        --max-capacity 10 \
        --region "$AWS_REGION" || warn "Failed to register ECS auto-scaling target"
    
    aws application-autoscaling put-scaling-policy \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$STACK_PREFIX-cluster/$STACK_PREFIX-backend-service" \
        --policy-name "$STACK_PREFIX-backend-scaling-policy" \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '{
            "TargetValue": 70.0,
            "PredefinedMetricSpecification": {
                "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
            },
            "ScaleOutCooldown": 300,
            "ScaleInCooldown": 300
        }' \
        --region "$AWS_REGION" || warn "Failed to create ECS scaling policy"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if all stacks are in CREATE_COMPLETE or UPDATE_COMPLETE state
    local stacks=(
        "$STACK_PREFIX-infrastructure"
        "$STACK_PREFIX-dynamodb"
        "$STACK_PREFIX-lambda"
        "$STACK_PREFIX-ecs"
        "$STACK_PREFIX-waf"
        "$STACK_PREFIX-xray"
        "$STACK_PREFIX-monitoring"
    )
    
    for stack in "${stacks[@]}"; do
        local status=$(aws cloudformation describe-stacks \
            --stack-name "$stack" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].StackStatus' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        if [[ "$status" != "CREATE_COMPLETE" && "$status" != "UPDATE_COMPLETE" ]]; then
            error "Stack $stack is in state: $status"
        fi
        
        log "Stack $stack: $status"
    done
    
    # Get ALB DNS name
    local alb_dns=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_PREFIX-ecs" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$alb_dns" != "NOT_FOUND" ]; then
        log "Application Load Balancer DNS: $alb_dns"
        log "Application URL: http://$alb_dns"
    fi
    
    log "Deployment verification completed successfully"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    # Add any cleanup logic here
}

# Main execution
main() {
    log "UK Home Improvement Platform - AWS Deployment"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Execute deployment steps
    check_prerequisites
    deploy_infrastructure
    deploy_pipeline
    configure_auto_scaling
    verify_deployment
    
    log "Deployment completed successfully!"
    log "Next steps:"
    log "1. Configure DNS records to point to the Load Balancer"
    log "2. Set up SSL certificates"
    log "3. Configure monitoring alerts"
    log "4. Run integration tests"
}

# Script usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [AWS_REGION]"
    echo "  ENVIRONMENT: staging or production (default: production)"
    echo "  AWS_REGION: AWS region (default: eu-west-2)"
    echo ""
    echo "Environment variables:"
    echo "  GITHUB_TOKEN: GitHub personal access token for CI/CD pipeline"
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