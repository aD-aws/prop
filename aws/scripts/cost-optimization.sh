#!/bin/bash

# UK Home Improvement Platform - Cost Optimization Script
# This script analyzes AWS costs and provides optimization recommendations

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-eu-west-2}
DAYS_BACK=${3:-30}

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

# Get cost and usage data
get_cost_data() {
    local service=$1
    local start_date=$(date -u -d "$DAYS_BACK days ago" +%Y-%m-%d)
    local end_date=$(date -u +%Y-%m-%d)
    
    aws ce get-cost-and-usage \
        --time-period Start="$start_date",End="$end_date" \
        --granularity DAILY \
        --metrics BlendedCost UnblendedCost UsageQuantity \
        --group-by Type=DIMENSION,Key=SERVICE \
        --filter "{
            \"Dimensions\": {
                \"Key\": \"SERVICE\",
                \"Values\": [\"$service\"]
            }
        }" \
        --region us-east-1 \
        --output json 2>/dev/null || echo "{}"
}

# Analyze Bedrock costs
analyze_bedrock_costs() {
    log "Analyzing Bedrock costs and usage..."
    
    local bedrock_data=$(get_cost_data "Amazon Bedrock")
    local total_cost=$(echo "$bedrock_data" | jq -r '.ResultsByTime[].Total.BlendedCost.Amount' | awk '{sum+=$1} END {print sum+0}')
    
    info "Bedrock total cost (last $DAYS_BACK days): \$$(printf '%.2f' $total_cost)"
    
    # Get token usage metrics
    local start_time=$(date -u -d "$DAYS_BACK days ago" +%Y-%m-%dT%H:%M:%S)
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%S)
    
    local input_tokens=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name InputTokenCount \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 86400 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    local output_tokens=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name OutputTokenCount \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 86400 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    info "Input tokens: $input_tokens"
    info "Output tokens: $output_tokens"
    
    # Cost optimization recommendations
    echo ""
    info "=== BEDROCK COST OPTIMIZATION RECOMMENDATIONS ==="
    
    if (( $(echo "$total_cost > 100" | bc -l) )); then
        warn "High Bedrock costs detected. Consider:"
        info "  • Implement response caching for similar requests"
        info "  • Optimize prompts to reduce token usage"
        info "  • Use streaming responses for long outputs"
        info "  • Implement request batching where possible"
    fi
    
    local avg_input_per_request=$(echo "scale=2; $input_tokens / ($total_cost * 333)" | bc -l)
    if (( $(echo "$avg_input_per_request > 1000" | bc -l) )); then
        warn "Large average prompt size detected. Consider:"
        info "  • Prompt compression techniques"
        info "  • Context window optimization"
        info "  • Breaking large requests into smaller ones"
    fi
}

# Analyze ECS costs
analyze_ecs_costs() {
    log "Analyzing ECS costs..."
    
    local ecs_data=$(get_cost_data "Amazon Elastic Container Service")
    local total_cost=$(echo "$ecs_data" | jq -r '.ResultsByTime[].Total.BlendedCost.Amount' | awk '{sum+=$1} END {print sum+0}')
    
    info "ECS total cost (last $DAYS_BACK days): \$$(printf '%.2f' $total_cost)"
    
    # Get ECS utilization metrics
    local cluster_name="$ENVIRONMENT-uk-home-improvement-cluster"
    local services=("$ENVIRONMENT-uk-home-improvement-backend-service" "$ENVIRONMENT-uk-home-improvement-frontend-service")
    
    for service in "${services[@]}"; do
        local cpu_utilization=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/ECS \
            --metric-name CPUUtilization \
            --dimensions Name=ServiceName,Value="$service" Name=ClusterName,Value="$cluster_name" \
            --start-time "$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)" \
            --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
            --period 3600 \
            --statistics Average \
            --region "$AWS_REGION" \
            --query 'Datapoints[*].Average' \
            --output text | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
        
        info "$service average CPU utilization: $(printf '%.1f' $cpu_utilization)%"
        
        if (( $(echo "$cpu_utilization < 30" | bc -l) )); then
            warn "$service is underutilized. Consider:"
            info "  • Reducing task CPU/memory allocation"
            info "  • Consolidating services"
            info "  • Using Fargate Spot instances"
        fi
    done
    
    echo ""
    info "=== ECS COST OPTIMIZATION RECOMMENDATIONS ==="
    info "  • Use Fargate Spot for non-critical workloads (up to 70% savings)"
    info "  • Right-size task definitions based on actual usage"
    info "  • Implement auto-scaling to match demand"
    info "  • Consider reserved capacity for predictable workloads"
}

# Analyze DynamoDB costs
analyze_dynamodb_costs() {
    log "Analyzing DynamoDB costs..."
    
    local dynamodb_data=$(get_cost_data "Amazon DynamoDB")
    local total_cost=$(echo "$dynamodb_data" | jq -r '.ResultsByTime[].Total.BlendedCost.Amount' | awk '{sum+=$1} END {print sum+0}')
    
    info "DynamoDB total cost (last $DAYS_BACK days): \$$(printf '%.2f' $total_cost)"
    
    # Get DynamoDB utilization
    local table_name="$ENVIRONMENT-uk-home-improvement"
    
    local consumed_read=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name ConsumedReadCapacityUnits \
        --dimensions Name=TableName,Value="$table_name" \
        --start-time "$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Average \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Average' \
        --output text | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    
    local consumed_write=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name ConsumedWriteCapacityUnits \
        --dimensions Name=TableName,Value="$table_name" \
        --start-time "$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Average \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Average' \
        --output text | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    
    info "Average consumed read capacity: $(printf '%.1f' $consumed_read) RCU"
    info "Average consumed write capacity: $(printf '%.1f' $consumed_write) WCU"
    
    echo ""
    info "=== DYNAMODB COST OPTIMIZATION RECOMMENDATIONS ==="
    info "  • Using on-demand billing for unpredictable workloads"
    info "  • Implement efficient query patterns to minimize RCU/WCU"
    info "  • Use DynamoDB Accelerator (DAX) for read-heavy workloads"
    info "  • Archive old data to S3 with lifecycle policies"
}

# Analyze Lambda costs
analyze_lambda_costs() {
    log "Analyzing Lambda costs..."
    
    local lambda_data=$(get_cost_data "AWS Lambda")
    local total_cost=$(echo "$lambda_data" | jq -r '.ResultsByTime[].Total.BlendedCost.Amount' | awk '{sum+=$1} END {print sum+0}')
    
    info "Lambda total cost (last $DAYS_BACK days): \$$(printf '%.2f' $total_cost)"
    
    # Analyze individual functions
    local functions=(
        "$ENVIRONMENT-document-processing"
        "$ENVIRONMENT-sow-generation"
        "$ENVIRONMENT-notification-service"
    )
    
    for function_name in "${functions[@]}"; do
        local duration=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Duration \
            --dimensions Name=FunctionName,Value="$function_name" \
            --start-time "$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)" \
            --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
            --period 3600 \
            --statistics Average \
            --region "$AWS_REGION" \
            --query 'Datapoints[*].Average' \
            --output text | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
        
        local invocations=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Invocations \
            --dimensions Name=FunctionName,Value="$function_name" \
            --start-time "$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)" \
            --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
            --period 86400 \
            --statistics Sum \
            --region "$AWS_REGION" \
            --query 'Datapoints[*].Sum' \
            --output text | awk '{sum+=$1} END {print sum+0}')
        
        info "$function_name: $(printf '%.0f' $invocations) invocations, $(printf '%.0f' $duration)ms avg duration"
    done
    
    echo ""
    info "=== LAMBDA COST OPTIMIZATION RECOMMENDATIONS ==="
    info "  • Right-size memory allocation based on actual usage"
    info "  • Use provisioned concurrency only for critical functions"
    info "  • Optimize cold start times to reduce duration"
    info "  • Consider ARM-based Graviton2 processors for better price/performance"
}

# Analyze S3 costs
analyze_s3_costs() {
    log "Analyzing S3 costs..."
    
    local s3_data=$(get_cost_data "Amazon Simple Storage Service")
    local total_cost=$(echo "$s3_data" | jq -r '.ResultsByTime[].Total.BlendedCost.Amount' | awk '{sum+=$1} END {print sum+0}')
    
    info "S3 total cost (last $DAYS_BACK days): \$$(printf '%.2f' $total_cost)"
    
    echo ""
    info "=== S3 COST OPTIMIZATION RECOMMENDATIONS ==="
    info "  • Implement lifecycle policies to transition to cheaper storage classes"
    info "  • Use S3 Intelligent-Tiering for automatic cost optimization"
    info "  • Enable S3 Transfer Acceleration only when needed"
    info "  • Compress files before uploading to reduce storage costs"
    info "  • Delete incomplete multipart uploads regularly"
}

# Generate cost optimization report
generate_cost_report() {
    log "Generating comprehensive cost optimization report..."
    
    local report_file="cost-optimization-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
    local start_date=$(date -u -d "$DAYS_BACK days ago" +%Y-%m-%d)
    local end_date=$(date -u +%Y-%m-%d)
    
    # Get comprehensive cost data
    aws ce get-cost-and-usage \
        --time-period Start="$start_date",End="$end_date" \
        --granularity DAILY \
        --metrics BlendedCost UnblendedCost UsageQuantity \
        --group-by Type=DIMENSION,Key=SERVICE \
        --filter "{
            \"Tags\": {
                \"Key\": \"Environment\",
                \"Values\": [\"$ENVIRONMENT\"]
            }
        }" \
        --region us-east-1 \
        --output json > "$report_file" 2>/dev/null || echo "{}" > "$report_file"
    
    info "Cost report saved to: $report_file"
    
    # Calculate total costs by service
    local total_cost=$(jq -r '.ResultsByTime[].Total.BlendedCost.Amount' "$report_file" | awk '{sum+=$1} END {print sum+0}')
    info "Total infrastructure cost (last $DAYS_BACK days): \$$(printf '%.2f' $total_cost)"
    
    # Top 5 most expensive services
    echo ""
    info "=== TOP 5 MOST EXPENSIVE SERVICES ==="
    jq -r '.ResultsByTime[].Groups[] | select(.Keys[0] != null) | "\(.Keys[0]): $" + (.Metrics.BlendedCost.Amount | tonumber | . * 100 | round / 100 | tostring)' "$report_file" | \
        awk '{service=$1; cost=$2; gsub(/\$/, "", cost); print cost " " service}' | \
        sort -nr | head -5 | \
        awk '{printf "  %s: $%.2f\n", substr($0, index($0, $2)), $1}'
}

# Set up cost budgets and alerts
setup_cost_budgets() {
    log "Setting up cost budgets and alerts..."
    
    local monthly_budget
    if [ "$ENVIRONMENT" = "production" ]; then
        monthly_budget=1000
    else
        monthly_budget=200
    fi
    
    # Create budget
    local budget_config=$(cat <<EOF
{
  "BudgetName": "$ENVIRONMENT-uk-home-improvement-budget",
  "BudgetLimit": {
    "Amount": "$monthly_budget",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKey": ["Environment"],
    "TagValue": ["$ENVIRONMENT"]
  }
}
EOF
)
    
    local notification_config=$(cat <<EOF
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "alerts@uk-home-improvement.com"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "FORECASTED",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "alerts@uk-home-improvement.com"
      }
    ]
  }
]
EOF
)
    
    # Create or update budget
    aws budgets put-budget \
        --account-id "$(aws sts get-caller-identity --query Account --output text)" \
        --budget "$budget_config" \
        --notifications-with-subscribers "$notification_config" \
        --region us-east-1 || warn "Failed to create budget"
    
    info "Cost budget set to \$$monthly_budget/month with 80% and 100% alerts"
}

# Main execution
main() {
    log "UK Home Improvement Platform - Cost Optimization Analysis"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    log "Analysis period: Last $DAYS_BACK days"
    echo ""
    
    # Check prerequisites
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    if ! command -v bc &> /dev/null; then
        error "bc calculator is not installed (required for cost calculations)"
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq is not installed (required for JSON processing)"
    fi
    
    # Run cost analysis
    analyze_bedrock_costs
    echo ""
    
    analyze_ecs_costs
    echo ""
    
    analyze_dynamodb_costs
    echo ""
    
    analyze_lambda_costs
    echo ""
    
    analyze_s3_costs
    echo ""
    
    generate_cost_report
    echo ""
    
    setup_cost_budgets
    
    log "Cost optimization analysis completed!"
    echo ""
    info "=== GENERAL RECOMMENDATIONS ==="
    info "  • Review and right-size resources monthly"
    info "  • Use Reserved Instances for predictable workloads"
    info "  • Implement auto-scaling to match demand"
    info "  • Monitor and optimize data transfer costs"
    info "  • Use AWS Cost Explorer for detailed analysis"
    info "  • Set up billing alerts for cost control"
}

# Script usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [AWS_REGION] [DAYS_BACK]"
    echo "  ENVIRONMENT: staging or production (default: production)"
    echo "  AWS_REGION: AWS region (default: eu-west-2)"
    echo "  DAYS_BACK: Number of days to analyze (default: 30)"
    echo ""
    echo "Examples:"
    echo "  $0 production eu-west-2 30"
    echo "  $0 staging eu-west-1 7"
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