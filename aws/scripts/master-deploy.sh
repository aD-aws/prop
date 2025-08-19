#!/bin/bash

# UK Home Improvement Platform - Master Deployment Script
# This script orchestrates the complete deployment of the AWS infrastructure

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
SKIP_TESTS=${3:-false}

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
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

# Print banner
print_banner() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    UK Home Improvement Platform                              ║"
    echo "║                        AWS Master Deployment                                ║"
    echo "║                                                                              ║"
    echo "║  Environment: $ENVIRONMENT                                                        ║"
    echo "║  Region: $AWS_REGION                                                      ║"
    echo "║  Timestamp: $(date)                                        ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check required tools
    local required_tools=("aws" "docker" "node" "npm" "jq" "bc")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' is not installed"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    # Check AWS permissions
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local user_arn=$(aws sts get-caller-identity --query Arn --output text)
    
    info "AWS Account ID: $account_id"
    info "AWS User/Role: $user_arn"
    
    # Check if required environment variables are set
    if [ "$ENVIRONMENT" = "production" ] && [ -z "$GITHUB_TOKEN" ]; then
        warn "GITHUB_TOKEN not set. CI/CD pipeline will be skipped."
    fi
    
    # Verify CloudFormation templates exist
    local templates=(
        "aws/cloudformation/infrastructure.yml"
        "aws/cloudformation/dynamodb.yml"
        "aws/cloudformation/lambda-functions.yml"
        "aws/cloudformation/ecs-fargate.yml"
        "aws/cloudformation/waf.yml"
        "aws/cloudformation/xray.yml"
        "aws/cloudformation/monitoring.yml"
    )
    
    for template in "${templates[@]}"; do
        if [ ! -f "$template" ]; then
            error "CloudFormation template not found: $template"
        fi
    done
    
    success "Prerequisites check passed"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Starting infrastructure deployment..."
    
    # Run the main deployment script
    if ! ./aws/scripts/deploy.sh "$ENVIRONMENT" "$AWS_REGION"; then
        error "Infrastructure deployment failed"
    fi
    
    success "Infrastructure deployment completed"
}

# Configure auto scaling
configure_auto_scaling() {
    log "Configuring auto scaling..."
    
    if ! ./aws/scripts/auto-scaling-config.sh "$ENVIRONMENT" "$AWS_REGION"; then
        error "Auto scaling configuration failed"
    fi
    
    success "Auto scaling configuration completed"
}

# Set up monitoring
setup_monitoring() {
    log "Setting up Bedrock monitoring and cost optimization..."
    
    if ! ./aws/scripts/bedrock-monitoring.sh "$AWS_REGION" "$ENVIRONMENT"; then
        error "Bedrock monitoring setup failed"
    fi
    
    success "Monitoring setup completed"
}

# Run deployment verification
verify_deployment() {
    log "Running deployment verification..."
    
    if ! ./aws/scripts/deployment-verification.sh "$ENVIRONMENT" "$AWS_REGION"; then
        error "Deployment verification failed"
    fi
    
    success "Deployment verification completed"
}

# Run cost optimization analysis
run_cost_analysis() {
    log "Running cost optimization analysis..."
    
    if ! ./aws/scripts/cost-optimization.sh "$ENVIRONMENT" "$AWS_REGION" 7; then
        warn "Cost optimization analysis failed, but continuing..."
    else
        success "Cost optimization analysis completed"
    fi
}

# Build and push Docker images
build_and_push_images() {
    log "Building and pushing Docker images..."
    
    # Get ECR repository URI
    local ecr_uri=$(aws cloudformation describe-stacks \
        --stack-name "$ENVIRONMENT-uk-home-improvement-ecs" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$ecr_uri" ]; then
        warn "ECR repository URI not found. Skipping image build."
        return
    fi
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ecr_uri"
    
    # Build backend image
    info "Building backend Docker image..."
    docker build -t "$ecr_uri:backend-latest" -f Dockerfile .
    docker push "$ecr_uri:backend-latest"
    
    # Build frontend image
    info "Building frontend Docker image..."
    docker build -t "$ecr_uri:frontend-latest" -f frontend/Dockerfile ./frontend
    docker push "$ecr_uri:frontend-latest"
    
    success "Docker images built and pushed"
}

# Update ECS services
update_ecs_services() {
    log "Updating ECS services with new images..."
    
    local cluster_name="$ENVIRONMENT-uk-home-improvement-cluster"
    local backend_service="$ENVIRONMENT-backend-service"
    local frontend_service="$ENVIRONMENT-frontend-service"
    
    # Force new deployment to pick up latest images
    aws ecs update-service \
        --cluster "$cluster_name" \
        --service "$backend_service" \
        --force-new-deployment \
        --region "$AWS_REGION" > /dev/null
    
    aws ecs update-service \
        --cluster "$cluster_name" \
        --service "$frontend_service" \
        --force-new-deployment \
        --region "$AWS_REGION" > /dev/null
    
    # Wait for services to stabilize
    info "Waiting for services to stabilize..."
    aws ecs wait services-stable \
        --cluster "$cluster_name" \
        --services "$backend_service" "$frontend_service" \
        --region "$AWS_REGION"
    
    success "ECS services updated successfully"
}

# Run integration tests
run_integration_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        warn "Skipping integration tests as requested"
        return
    fi
    
    log "Running integration tests..."
    
    # Get ALB DNS name
    local alb_dns=$(aws cloudformation describe-stacks \
        --stack-name "$ENVIRONMENT-uk-home-improvement-ecs" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$alb_dns" ]; then
        warn "ALB DNS not found. Skipping integration tests."
        return
    fi
    
    # Basic health check
    local health_url="http://$alb_dns/api/health"
    info "Testing health endpoint: $health_url"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            success "Health check passed"
            break
        fi
        
        info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error "Health check failed after $max_attempts attempts"
    fi
    
    # Run additional tests if test files exist
    if [ -f "scripts/run-all-tests.sh" ]; then
        info "Running comprehensive test suite..."
        if ! ./scripts/run-all-tests.sh; then
            warn "Some tests failed, but deployment will continue"
        else
            success "All tests passed"
        fi
    fi
}

# Generate deployment summary
generate_deployment_summary() {
    log "Generating deployment summary..."
    
    local summary_file="deployment-summary-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "UK Home Improvement Platform - Deployment Summary"
        echo "================================================="
        echo "Environment: $ENVIRONMENT"
        echo "Region: $AWS_REGION"
        echo "Deployment Date: $(date)"
        echo "Deployed by: $(aws sts get-caller-identity --query Arn --output text)"
        echo ""
        
        echo "Infrastructure Components:"
        echo "-------------------------"
        
        # Get ALB DNS
        local alb_dns=$(aws cloudformation describe-stacks \
            --stack-name "$ENVIRONMENT-uk-home-improvement-ecs" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
            --output text 2>/dev/null || echo "Not found")
        
        echo "Application URL: http://$alb_dns"
        echo "API Health Check: http://$alb_dns/api/health"
        echo ""
        
        # Dashboard URLs
        echo "Monitoring Dashboards:"
        echo "---------------------"
        echo "Main Dashboard: https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=$ENVIRONMENT-uk-home-improvement-dashboard"
        echo "Security Dashboard: https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=$ENVIRONMENT-security-dashboard"
        echo "X-Ray Service Map: https://$AWS_REGION.console.aws.amazon.com/xray/home?region=$AWS_REGION#/service-map"
        echo "Auto Scaling Dashboard: https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=$ENVIRONMENT-auto-scaling-dashboard"
        echo ""
        
        # Cost information
        echo "Cost Management:"
        echo "---------------"
        echo "Budget: \$$([ "$ENVIRONMENT" = "production" ] && echo "1000" || echo "200")/month"
        echo "Cost Explorer: https://console.aws.amazon.com/cost-management/home#/cost-explorer"
        echo ""
        
        # Next steps
        echo "Next Steps:"
        echo "----------"
        echo "1. Configure DNS records to point to: $alb_dns"
        echo "2. Set up SSL certificates using AWS Certificate Manager"
        echo "3. Configure custom domain in CloudFront (if needed)"
        echo "4. Set up monitoring alerts and notification channels"
        echo "5. Run comprehensive security and performance tests"
        echo "6. Configure backup and disaster recovery procedures"
        echo "7. Set up log aggregation and analysis"
        echo "8. Configure CI/CD pipeline for automated deployments"
        echo ""
        
        # Important notes
        echo "Important Notes:"
        echo "---------------"
        echo "- All services are configured with auto-scaling"
        echo "- Point-in-time recovery is enabled for DynamoDB"
        echo "- WAF is configured for basic security protection"
        echo "- X-Ray tracing is enabled for performance monitoring"
        echo "- Cost budgets and alerts are configured"
        echo "- Bedrock usage monitoring is active"
        echo ""
        
    } > "$summary_file"
    
    info "Deployment summary saved to: $summary_file"
    
    # Display key information
    echo ""
    success "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
    echo ""
    info "Application URL: http://$alb_dns"
    info "Health Check: http://$alb_dns/api/health"
    info "Main Dashboard: https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=$ENVIRONMENT-uk-home-improvement-dashboard"
    echo ""
    info "Deployment summary: $summary_file"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    # Add any cleanup logic here
}

# Main execution
main() {
    print_banner
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Execute deployment steps
    check_prerequisites
    echo ""
    
    deploy_infrastructure
    echo ""
    
    configure_auto_scaling
    echo ""
    
    setup_monitoring
    echo ""
    
    build_and_push_images
    echo ""
    
    update_ecs_services
    echo ""
    
    verify_deployment
    echo ""
    
    run_integration_tests
    echo ""
    
    run_cost_analysis
    echo ""
    
    generate_deployment_summary
    
    success "Master deployment completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [AWS_REGION] [SKIP_TESTS]"
    echo "  ENVIRONMENT: staging or production (default: production)"
    echo "  AWS_REGION: AWS region (default: eu-west-2)"
    echo "  SKIP_TESTS: true to skip integration tests (default: false)"
    echo ""
    echo "Environment variables:"
    echo "  GITHUB_TOKEN: GitHub personal access token for CI/CD pipeline"
    echo ""
    echo "Examples:"
    echo "  $0 production eu-west-2"
    echo "  $0 staging eu-west-1 true"
    echo "  GITHUB_TOKEN=ghp_xxx $0 production eu-west-2"
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