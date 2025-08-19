#!/bin/bash

# UK Home Improvement Platform - Cleanup Script
# This script cleans up partially deployed AWS resources

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
STACK_PREFIX="$ENVIRONMENT-uk-home-improvement"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

# Delete CloudFormation stack
delete_stack() {
    local stack_name=$1
    
    log "Checking stack: $stack_name"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$stack_name" --region "$AWS_REGION" &> /dev/null; then
        local stack_status=$(aws cloudformation describe-stacks \
            --stack-name "$stack_name" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].StackStatus' \
            --output text)
        
        log "Stack $stack_name status: $stack_status"
        
        # Only delete if not already being deleted
        if [[ "$stack_status" != "DELETE_IN_PROGRESS" && "$stack_status" != "DELETE_COMPLETE" ]]; then
            log "Deleting stack: $stack_name"
            aws cloudformation delete-stack \
                --stack-name "$stack_name" \
                --region "$AWS_REGION" || warn "Failed to initiate deletion of $stack_name"
            
            log "Waiting for stack deletion to complete..."
            aws cloudformation wait stack-delete-complete \
                --stack-name "$stack_name" \
                --region "$AWS_REGION" || warn "Stack deletion may have failed for $stack_name"
            
            success "Stack $stack_name deleted successfully"
        else
            info "Stack $stack_name is already being deleted or is deleted"
        fi
    else
        info "Stack $stack_name does not exist"
    fi
}

# Clean up auto scaling targets
cleanup_auto_scaling() {
    log "Cleaning up auto scaling targets..."
    
    # ECS auto scaling
    local ecs_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace ecs \
        --region "$AWS_REGION" \
        --query "ScalableTargets[?contains(ResourceId, '$STACK_PREFIX')].ResourceId" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$ecs_targets" ]; then
        echo "$ecs_targets" | while read -r target; do
            if [ -n "$target" ]; then
                log "Deregistering ECS auto scaling target: $target"
                aws application-autoscaling deregister-scalable-target \
                    --service-namespace ecs \
                    --scalable-dimension ecs:service:DesiredCount \
                    --resource-id "$target" \
                    --region "$AWS_REGION" || warn "Failed to deregister ECS target: $target"
            fi
        done
    fi
    
    # Lambda auto scaling
    local lambda_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace lambda \
        --region "$AWS_REGION" \
        --query "ScalableTargets[?contains(ResourceId, '$ENVIRONMENT')].ResourceId" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$lambda_targets" ]; then
        echo "$lambda_targets" | while read -r target; do
            if [ -n "$target" ]; then
                log "Deregistering Lambda auto scaling target: $target"
                aws application-autoscaling deregister-scalable-target \
                    --service-namespace lambda \
                    --scalable-dimension lambda:provisioned-concurrency:utilization \
                    --resource-id "$target" \
                    --region "$AWS_REGION" || warn "Failed to deregister Lambda target: $target"
            fi
        done
    fi
    
    # DynamoDB auto scaling
    local dynamodb_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace dynamodb \
        --region "$AWS_REGION" \
        --query "ScalableTargets[?contains(ResourceId, '$STACK_PREFIX')].ResourceId" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$dynamodb_targets" ]; then
        echo "$dynamodb_targets" | while read -r target; do
            if [ -n "$target" ]; then
                log "Deregistering DynamoDB auto scaling target: $target"
                # Determine the scalable dimension based on the resource ID
                if [[ "$target" == *"table"* ]]; then
                    if [[ "$target" == *"ReadCapacityUnits"* ]]; then
                        dimension="dynamodb:table:ReadCapacityUnits"
                    else
                        dimension="dynamodb:table:WriteCapacityUnits"
                    fi
                else
                    if [[ "$target" == *"ReadCapacityUnits"* ]]; then
                        dimension="dynamodb:index:ReadCapacityUnits"
                    else
                        dimension="dynamodb:index:WriteCapacityUnits"
                    fi
                fi
                
                aws application-autoscaling deregister-scalable-target \
                    --service-namespace dynamodb \
                    --scalable-dimension "$dimension" \
                    --resource-id "$target" \
                    --region "$AWS_REGION" || warn "Failed to deregister DynamoDB target: $target"
            fi
        done
    fi
    
    success "Auto scaling cleanup completed"
}

# Clean up ECR images (optional)
cleanup_ecr_images() {
    log "Cleaning up ECR images..."
    
    local repo_name="$ENVIRONMENT-uk-home-improvement-platform"
    
    # Check if repository exists
    if aws ecr describe-repositories --repository-names "$repo_name" --region "$AWS_REGION" &> /dev/null; then
        log "Deleting images in ECR repository: $repo_name"
        
        # Get all image tags
        local image_tags=$(aws ecr list-images \
            --repository-name "$repo_name" \
            --region "$AWS_REGION" \
            --query 'imageIds[?imageTag!=null].imageTag' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$image_tags" ]; then
            echo "$image_tags" | tr '\t' '\n' | while read -r tag; do
                if [ -n "$tag" ]; then
                    log "Deleting image with tag: $tag"
                    aws ecr batch-delete-image \
                        --repository-name "$repo_name" \
                        --image-ids imageTag="$tag" \
                        --region "$AWS_REGION" || warn "Failed to delete image: $tag"
                fi
            done
        fi
        
        success "ECR images cleaned up"
    else
        info "ECR repository $repo_name does not exist"
    fi
}

# Main cleanup function
main() {
    log "UK Home Improvement Platform - Cleanup"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    echo ""
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
        exit 1
    fi
    
    # List of stacks to delete (in reverse dependency order)
    local stacks=(
        "$STACK_PREFIX-comprehensive-monitoring"
        "$STACK_PREFIX-monitoring"
        "$STACK_PREFIX-xray"
        "$STACK_PREFIX-waf"
        "$STACK_PREFIX-ecs"
        "$STACK_PREFIX-lambda"
        "$STACK_PREFIX-dynamodb"
        "$STACK_PREFIX-infrastructure"
    )
    
    # Clean up auto scaling first
    cleanup_auto_scaling
    echo ""
    
    # Delete stacks in reverse order
    for stack in "${stacks[@]}"; do
        delete_stack "$stack"
        echo ""
    done
    
    # Clean up ECR images
    cleanup_ecr_images
    echo ""
    
    # Clean up CI/CD pipeline stack if it exists
    if [ "$ENVIRONMENT" = "production" ]; then
        delete_stack "uk-home-improvement-pipeline"
    fi
    
    success "Cleanup completed successfully!"
    echo ""
    info "You can now run the deployment script again:"
    info "./aws/scripts/master-deploy.sh $ENVIRONMENT $AWS_REGION"
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
    exit 1
fi

# Confirmation prompt
echo ""
warn "This will delete ALL AWS resources for the $ENVIRONMENT environment!"
warn "This action cannot be undone."
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirmation

if [[ "$confirmation" != "yes" ]]; then
    info "Cleanup cancelled"
    exit 0
fi

# Execute main function
main