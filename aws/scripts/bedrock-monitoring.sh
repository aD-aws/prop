#!/bin/bash

# UK Home Improvement Platform - Bedrock Usage Monitoring and Cost Optimization Script

set -e

# Configuration
AWS_REGION=${1:-eu-west-2}
ENVIRONMENT=${2:-production}

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

# Get Bedrock usage metrics
get_bedrock_metrics() {
    local start_time=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%S)
    
    log "Fetching Bedrock metrics for the last 24 hours..."
    
    # Get invocation count
    local invocations=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name Invocations \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    # Get input tokens
    local input_tokens=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name InputTokenCount \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    # Get output tokens
    local output_tokens=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name OutputTokenCount \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    # Get average latency
    local avg_latency=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name InvocationLatency \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Average \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Average' \
        --output text | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    
    # Get error count
    local errors=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name InvocationClientErrors \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    # Calculate estimated costs (Claude 3.5 Sonnet pricing)
    local input_cost=$(echo "$input_tokens * 0.003 / 1000" | bc -l)
    local output_cost=$(echo "$output_tokens * 0.015 / 1000" | bc -l)
    local total_cost=$(echo "$input_cost + $output_cost" | bc -l)
    
    # Display metrics
    echo ""
    info "=== BEDROCK USAGE METRICS (Last 24 Hours) ==="
    info "Model: Claude 3.5 Sonnet"
    info "Total Invocations: $invocations"
    info "Input Tokens: $input_tokens"
    info "Output Tokens: $output_tokens"
    info "Average Latency: ${avg_latency}ms"
    info "Errors: $errors"
    info "Estimated Cost: \$$(printf '%.4f' $total_cost)"
    info "  - Input Cost: \$$(printf '%.4f' $input_cost)"
    info "  - Output Cost: \$$(printf '%.4f' $output_cost)"
    echo ""
    
    # Check for cost optimization opportunities
    check_cost_optimization "$invocations" "$input_tokens" "$output_tokens" "$avg_latency" "$errors"
}

# Check for cost optimization opportunities
check_cost_optimization() {
    local invocations=$1
    local input_tokens=$2
    local output_tokens=$3
    local avg_latency=$4
    local errors=$5
    
    log "Analyzing cost optimization opportunities..."
    
    # High token usage warning
    if (( $(echo "$input_tokens > 1000000" | bc -l) )); then
        warn "High input token usage detected ($input_tokens tokens)"
        warn "Consider implementing prompt optimization strategies"
    fi
    
    if (( $(echo "$output_tokens > 500000" | bc -l) )); then
        warn "High output token usage detected ($output_tokens tokens)"
        warn "Consider limiting response length or using streaming responses"
    fi
    
    # High latency warning
    if (( $(echo "$avg_latency > 10000" | bc -l) )); then
        warn "High average latency detected (${avg_latency}ms)"
        warn "Consider implementing caching or request batching"
    fi
    
    # Error rate warning
    local error_rate=$(echo "scale=4; $errors / $invocations * 100" | bc -l)
    if (( $(echo "$error_rate > 5" | bc -l) )); then
        warn "High error rate detected (${error_rate}%)"
        warn "Review error logs and implement retry mechanisms"
    fi
    
    # Recommendations
    echo ""
    info "=== COST OPTIMIZATION RECOMMENDATIONS ==="
    
    if (( $(echo "$invocations > 1000" | bc -l) )); then
        info "✓ High usage detected - consider implementing:"
        info "  - Response caching for similar requests"
        info "  - Request batching where possible"
        info "  - Prompt optimization to reduce token usage"
    fi
    
    if (( $(echo "$input_tokens / $invocations > 1000" | bc -l) )); then
        info "✓ Large average prompt size - consider:"
        info "  - Prompt compression techniques"
        info "  - Context window optimization"
        info "  - Breaking large requests into smaller ones"
    fi
    
    if (( $(echo "$output_tokens / $invocations > 500" | bc -l) )); then
        info "✓ Large average response size - consider:"
        info "  - Setting max_tokens limits"
        info "  - Using streaming responses"
        info "  - Requesting more concise responses"
    fi
    
    echo ""
}

# Set up cost monitoring alarms
setup_cost_alarms() {
    log "Setting up Bedrock cost monitoring alarms..."
    
    # Daily cost alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ENVIRONMENT}-Bedrock-Daily-Cost-Alarm" \
        --alarm-description "Bedrock daily cost exceeds threshold" \
        --metric-name "EstimatedCharges" \
        --namespace "AWS/Billing" \
        --statistic "Maximum" \
        --period 86400 \
        --evaluation-periods 1 \
        --threshold 50.0 \
        --comparison-operator "GreaterThanThreshold" \
        --dimensions Name=ServiceName,Value=AmazonBedrock Name=Currency,Value=USD \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):${ENVIRONMENT}-uk-home-improvement-alerts" \
        --region "$AWS_REGION" || warn "Failed to create daily cost alarm"
    
    # High token usage alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${ENVIRONMENT}-Bedrock-High-Token-Usage" \
        --alarm-description "Bedrock token usage is high" \
        --metric-name "InputTokenCount" \
        --namespace "AWS/Bedrock" \
        --statistic "Sum" \
        --period 3600 \
        --evaluation-periods 1 \
        --threshold 100000 \
        --comparison-operator "GreaterThanThreshold" \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):${ENVIRONMENT}-uk-home-improvement-alerts" \
        --region "$AWS_REGION" || warn "Failed to create token usage alarm"
    
    log "Cost monitoring alarms configured"
}

# Generate cost report
generate_cost_report() {
    local report_file="bedrock-cost-report-$(date +%Y%m%d).json"
    
    log "Generating detailed cost report..."
    
    # Get cost and usage data for the last 30 days
    local start_date=$(date -u -d '30 days ago' +%Y-%m-%d)
    local end_date=$(date -u +%Y-%m-%d)
    
    aws ce get-cost-and-usage \
        --time-period Start="$start_date",End="$end_date" \
        --granularity DAILY \
        --metrics BlendedCost UnblendedCost \
        --group-by Type=DIMENSION,Key=SERVICE \
        --filter '{
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon Bedrock"]
            }
        }' \
        --region us-east-1 \
        --output json > "$report_file" || warn "Failed to generate cost report"
    
    if [ -f "$report_file" ]; then
        info "Cost report saved to: $report_file"
        
        # Extract total cost
        local total_cost=$(jq -r '.ResultsByTime[].Total.BlendedCost.Amount' "$report_file" | awk '{sum+=$1} END {print sum+0}')
        info "Total Bedrock cost (last 30 days): \$$(printf '%.2f' $total_cost)"
    fi
}

# Monitor model performance
monitor_model_performance() {
    log "Monitoring model performance metrics..."
    
    local start_time=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%S)
    
    # Get throttling metrics
    local throttles=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name InvocationThrottles \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 86400 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    # Get server errors
    local server_errors=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Bedrock \
        --metric-name InvocationServerErrors \
        --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 86400 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[*].Sum' \
        --output text | awk '{sum+=$1} END {print sum+0}')
    
    info "=== MODEL PERFORMANCE (Last 7 Days) ==="
    info "Throttles: $throttles"
    info "Server Errors: $server_errors"
    
    if (( throttles > 0 )); then
        warn "Throttling detected - consider implementing exponential backoff"
    fi
    
    if (( server_errors > 0 )); then
        warn "Server errors detected - monitor service health"
    fi
}

# Main execution
main() {
    log "Bedrock Usage Monitoring and Cost Optimization"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    # Check if bc is available for calculations
    if ! command -v bc &> /dev/null; then
        error "bc calculator is not installed (required for cost calculations)"
    fi
    
    # Execute monitoring functions
    get_bedrock_metrics
    monitor_model_performance
    setup_cost_alarms
    generate_cost_report
    
    log "Bedrock monitoring completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [AWS_REGION] [ENVIRONMENT]"
    echo "  AWS_REGION: AWS region (default: eu-west-2)"
    echo "  ENVIRONMENT: staging or production (default: production)"
    echo ""
    echo "Examples:"
    echo "  $0 eu-west-2 production"
    echo "  $0 us-east-1 staging"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Execute main function
main