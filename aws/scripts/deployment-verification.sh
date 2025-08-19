#!/bin/bash

# UK Home Improvement Platform - Deployment Verification Script
# This script verifies that all AWS infrastructure components are properly deployed and configured

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

# Verify CloudFormation stacks
verify_cloudformation_stacks() {
    log "Verifying CloudFormation stacks..."
    
    local stacks=(
        "$STACK_PREFIX-infrastructure"
        "$STACK_PREFIX-dynamodb"
        "$STACK_PREFIX-lambda"
        "$STACK_PREFIX-ecs"
        "$STACK_PREFIX-waf"
        "$STACK_PREFIX-xray"
        "$STACK_PREFIX-monitoring"
        "$STACK_PREFIX-comprehensive-monitoring"
    )
    
    local all_stacks_healthy=true
    
    for stack in "${stacks[@]}"; do
        local status=$(aws cloudformation describe-stacks \
            --stack-name "$stack" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].StackStatus' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        if [[ "$status" == "CREATE_COMPLETE" || "$status" == "UPDATE_COMPLETE" ]]; then
            success "Stack $stack: $status"
        else
            error "Stack $stack: $status"
            all_stacks_healthy=false
        fi
    done
    
    if [ "$all_stacks_healthy" = true ]; then
        success "All CloudFormation stacks are healthy"
    else
        error "Some CloudFormation stacks have issues"
        return 1
    fi
}

# Verify ECS services
verify_ecs_services() {
    log "Verifying ECS services..."
    
    local cluster_name="$STACK_PREFIX-cluster"
    local services=("$STACK_PREFIX-backend-service" "$STACK_PREFIX-frontend-service")
    
    for service in "${services[@]}"; do
        local service_status=$(aws ecs describe-services \
            --cluster "$cluster_name" \
            --services "$service" \
            --region "$AWS_REGION" \
            --query 'services[0].status' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        local running_count=$(aws ecs describe-services \
            --cluster "$cluster_name" \
            --services "$service" \
            --region "$AWS_REGION" \
            --query 'services[0].runningCount' \
            --output text 2>/dev/null || echo "0")
        
        local desired_count=$(aws ecs describe-services \
            --cluster "$cluster_name" \
            --services "$service" \
            --region "$AWS_REGION" \
            --query 'services[0].desiredCount' \
            --output text 2>/dev/null || echo "0")
        
        if [[ "$service_status" == "ACTIVE" && "$running_count" == "$desired_count" ]]; then
            success "Service $service: $service_status ($running_count/$desired_count tasks)"
        else
            warn "Service $service: $service_status ($running_count/$desired_count tasks)"
        fi
    done
}

# Verify Lambda functions
verify_lambda_functions() {
    log "Verifying Lambda functions..."
    
    local functions=(
        "$ENVIRONMENT-document-processing"
        "$ENVIRONMENT-sow-generation"
        "$ENVIRONMENT-notification-service"
    )
    
    for function_name in "${functions[@]}"; do
        local function_status=$(aws lambda get-function \
            --function-name "$function_name" \
            --region "$AWS_REGION" \
            --query 'Configuration.State' \
            --output text 2>/dev/null || echo "NOT_FOUND")
        
        if [[ "$function_status" == "Active" ]]; then
            success "Lambda function $function_name: $function_status"
        else
            warn "Lambda function $function_name: $function_status"
        fi
    done
}

# Verify DynamoDB table
verify_dynamodb() {
    log "Verifying DynamoDB table..."
    
    local table_name="$STACK_PREFIX"
    local table_status=$(aws dynamodb describe-table \
        --table-name "$table_name" \
        --region "$AWS_REGION" \
        --query 'Table.TableStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$table_status" == "ACTIVE" ]]; then
        success "DynamoDB table $table_name: $table_status"
        
        # Check backup configuration
        local backup_status=$(aws dynamodb describe-continuous-backups \
            --table-name "$table_name" \
            --region "$AWS_REGION" \
            --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
            --output text 2>/dev/null || echo "DISABLED")
        
        if [[ "$backup_status" == "ENABLED" ]]; then
            success "DynamoDB point-in-time recovery: $backup_status"
        else
            warn "DynamoDB point-in-time recovery: $backup_status"
        fi
    else
        error "DynamoDB table $table_name: $table_status"
    fi
}

# Verify Load Balancer
verify_load_balancer() {
    log "Verifying Application Load Balancer..."
    
    local alb_name="$STACK_PREFIX-alb"
    local alb_status=$(aws elbv2 describe-load-balancers \
        --names "$alb_name" \
        --region "$AWS_REGION" \
        --query 'LoadBalancers[0].State.Code' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$alb_status" == "active" ]]; then
        success "Application Load Balancer $alb_name: $alb_status"
        
        local alb_dns=$(aws elbv2 describe-load-balancers \
            --names "$alb_name" \
            --region "$AWS_REGION" \
            --query 'LoadBalancers[0].DNSName' \
            --output text 2>/dev/null)
        
        info "ALB DNS: $alb_dns"
        
        # Test health check
        local health_check_url="http://$alb_dns/api/health"
        if curl -f -s "$health_check_url" > /dev/null 2>&1; then
            success "Health check endpoint is responding"
        else
            warn "Health check endpoint is not responding: $health_check_url"
        fi
    else
        error "Application Load Balancer $alb_name: $alb_status"
    fi
}

# Verify WAF
verify_waf() {
    log "Verifying AWS WAF..."
    
    local waf_name="$STACK_PREFIX-waf"
    local waf_status=$(aws wafv2 get-web-acl \
        --scope REGIONAL \
        --id "$(aws wafv2 list-web-acls --scope REGIONAL --region "$AWS_REGION" --query "WebACLs[?Name=='$waf_name'].Id" --output text)" \
        --region "$AWS_REGION" \
        --query 'WebACL.Name' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$waf_status" == "$waf_name" ]]; then
        success "AWS WAF $waf_name: Active"
    else
        warn "AWS WAF $waf_name: $waf_status"
    fi
}

# Verify X-Ray tracing
verify_xray() {
    log "Verifying AWS X-Ray..."
    
    local sampling_rules=$(aws xray get-sampling-rules \
        --region "$AWS_REGION" \
        --query "SamplingRuleRecords[?SamplingRule.RuleName=='$ENVIRONMENT-uk-home-improvement-sampling'].SamplingRule.RuleName" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$sampling_rules" ]]; then
        success "X-Ray sampling rules configured"
    else
        warn "X-Ray sampling rules not found"
    fi
}

# Verify monitoring and alarms
verify_monitoring() {
    log "Verifying CloudWatch monitoring..."
    
    # Check if dashboard exists
    local dashboard_exists=$(aws cloudwatch get-dashboard \
        --dashboard-name "$ENVIRONMENT-uk-home-improvement-dashboard" \
        --region "$AWS_REGION" \
        --query 'DashboardName' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$dashboard_exists" != "NOT_FOUND" ]]; then
        success "CloudWatch dashboard exists"
    else
        warn "CloudWatch dashboard not found"
    fi
    
    # Check critical alarms
    local alarm_count=$(aws cloudwatch describe-alarms \
        --alarm-name-prefix "$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'length(MetricAlarms)' \
        --output text 2>/dev/null || echo "0")
    
    if [[ "$alarm_count" -gt 0 ]]; then
        success "CloudWatch alarms configured ($alarm_count alarms)"
    else
        warn "No CloudWatch alarms found"
    fi
}

# Verify auto scaling configuration
verify_auto_scaling() {
    log "Verifying auto scaling configuration..."
    
    # Check ECS auto scaling
    local ecs_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace ecs \
        --region "$AWS_REGION" \
        --query "ScalableTargets[?contains(ResourceId, '$STACK_PREFIX')].ResourceId" \
        --output text | wc -w)
    
    if [[ "$ecs_targets" -gt 0 ]]; then
        success "ECS auto scaling configured ($ecs_targets targets)"
    else
        warn "ECS auto scaling not configured"
    fi
    
    # Check Lambda auto scaling
    local lambda_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace lambda \
        --region "$AWS_REGION" \
        --query "ScalableTargets[?contains(ResourceId, '$ENVIRONMENT')].ResourceId" \
        --output text | wc -w)
    
    if [[ "$lambda_targets" -gt 0 ]]; then
        success "Lambda auto scaling configured ($lambda_targets targets)"
    else
        warn "Lambda auto scaling not configured"
    fi
    
    # Check DynamoDB auto scaling
    local dynamodb_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace dynamodb \
        --region "$AWS_REGION" \
        --query "ScalableTargets[?contains(ResourceId, '$STACK_PREFIX')].ResourceId" \
        --output text | wc -w)
    
    if [[ "$dynamodb_targets" -gt 0 ]]; then
        success "DynamoDB auto scaling configured ($dynamodb_targets targets)"
    else
        warn "DynamoDB auto scaling not configured"
    fi
}

# Verify Bedrock access
verify_bedrock() {
    log "Verifying AWS Bedrock access..."
    
    # Test Bedrock model access
    local bedrock_test=$(aws bedrock list-foundation-models \
        --region "$AWS_REGION" \
        --query "modelSummaries[?modelId=='anthropic.claude-3-5-sonnet-20241022-v2:0'].modelId" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$bedrock_test" ]]; then
        success "Bedrock Claude 3.5 Sonnet model accessible"
    else
        warn "Bedrock Claude 3.5 Sonnet model not accessible"
    fi
}

# Generate deployment report
generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="deployment-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "UK Home Improvement Platform - Deployment Report"
        echo "================================================"
        echo "Environment: $ENVIRONMENT"
        echo "Region: $AWS_REGION"
        echo "Generated: $(date)"
        echo ""
        
        echo "Infrastructure Components:"
        echo "-------------------------"
        
        # CloudFormation stacks
        echo "CloudFormation Stacks:"
        aws cloudformation list-stacks \
            --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
            --region "$AWS_REGION" \
            --query "StackSummaries[?contains(StackName, '$ENVIRONMENT-uk-home-improvement')].{Name:StackName,Status:StackStatus}" \
            --output table
        
        echo ""
        
        # ECS services
        echo "ECS Services:"
        aws ecs list-services \
            --cluster "$STACK_PREFIX-cluster" \
            --region "$AWS_REGION" \
            --query 'serviceArns' \
            --output table
        
        echo ""
        
        # Lambda functions
        echo "Lambda Functions:"
        aws lambda list-functions \
            --region "$AWS_REGION" \
            --query "Functions[?contains(FunctionName, '$ENVIRONMENT')].{Name:FunctionName,Runtime:Runtime,State:State}" \
            --output table
        
        echo ""
        
        # DynamoDB tables
        echo "DynamoDB Tables:"
        aws dynamodb list-tables \
            --region "$AWS_REGION" \
            --query "TableNames[?contains(@, '$ENVIRONMENT')]" \
            --output table
        
        echo ""
        
        # Load balancers
        echo "Load Balancers:"
        aws elbv2 describe-load-balancers \
            --region "$AWS_REGION" \
            --query "LoadBalancers[?contains(LoadBalancerName, '$ENVIRONMENT')].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}" \
            --output table
        
    } > "$report_file"
    
    info "Deployment report saved to: $report_file"
}

# Main verification function
main() {
    log "UK Home Improvement Platform - Deployment Verification"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    echo ""
    
    # Check prerequisites
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
        exit 1
    fi
    
    # Run verification checks
    local verification_failed=false
    
    verify_cloudformation_stacks || verification_failed=true
    echo ""
    
    verify_ecs_services || verification_failed=true
    echo ""
    
    verify_lambda_functions || verification_failed=true
    echo ""
    
    verify_dynamodb || verification_failed=true
    echo ""
    
    verify_load_balancer || verification_failed=true
    echo ""
    
    verify_waf || verification_failed=true
    echo ""
    
    verify_xray || verification_failed=true
    echo ""
    
    verify_monitoring || verification_failed=true
    echo ""
    
    verify_auto_scaling || verification_failed=true
    echo ""
    
    verify_bedrock || verification_failed=true
    echo ""
    
    # Generate report
    generate_deployment_report
    
    # Final status
    if [ "$verification_failed" = false ]; then
        success "All deployment verification checks passed!"
        echo ""
        info "Next steps:"
        info "1. Configure DNS records"
        info "2. Set up SSL certificates"
        info "3. Run integration tests"
        info "4. Monitor application logs"
    else
        error "Some deployment verification checks failed!"
        echo ""
        info "Please review the warnings and errors above"
        exit 1
    fi
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

# Execute main function
main