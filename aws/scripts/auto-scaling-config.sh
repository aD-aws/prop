#!/bin/bash

# UK Home Improvement Platform - Auto Scaling Configuration Script

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
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configure ECS Auto Scaling
configure_ecs_auto_scaling() {
    log "Configuring ECS Auto Scaling..."
    
    local cluster_name="$STACK_PREFIX-cluster"
    local backend_service="$STACK_PREFIX-backend-service"
    local frontend_service="$STACK_PREFIX-frontend-service"
    
    # Backend Service Auto Scaling
    log "Setting up backend service auto scaling..."
    
    # Register scalable target for backend
    aws application-autoscaling register-scalable-target \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$backend_service" \
        --min-capacity 2 \
        --max-capacity 20 \
        --region "$AWS_REGION" || warn "Failed to register backend scalable target"
    
    # CPU-based scaling policy for backend
    aws application-autoscaling put-scaling-policy \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$backend_service" \
        --policy-name "$backend_service-cpu-scaling" \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '{
            "TargetValue": 70.0,
            "PredefinedMetricSpecification": {
                "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
            },
            "ScaleOutCooldown": 300,
            "ScaleInCooldown": 600
        }' \
        --region "$AWS_REGION" || warn "Failed to create backend CPU scaling policy"
    
    # Memory-based scaling policy for backend
    aws application-autoscaling put-scaling-policy \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$backend_service" \
        --policy-name "$backend_service-memory-scaling" \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '{
            "TargetValue": 80.0,
            "PredefinedMetricSpecification": {
                "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
            },
            "ScaleOutCooldown": 300,
            "ScaleInCooldown": 600
        }' \
        --region "$AWS_REGION" || warn "Failed to create backend memory scaling policy"
    
    # ALB request count scaling policy for backend
    local target_group_arn=$(aws elbv2 describe-target-groups \
        --names "$STACK_PREFIX-backend-tg" \
        --region "$AWS_REGION" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$target_group_arn" ]; then
        aws application-autoscaling put-scaling-policy \
            --service-namespace ecs \
            --scalable-dimension ecs:service:DesiredCount \
            --resource-id "service/$cluster_name/$backend_service" \
            --policy-name "$backend_service-request-scaling" \
            --policy-type TargetTrackingScaling \
            --target-tracking-scaling-policy-configuration '{
                "TargetValue": 1000.0,
                "PredefinedMetricSpecification": {
                    "PredefinedMetricType": "ALBRequestCountPerTarget",
                    "ResourceLabel": "'$(echo $target_group_arn | cut -d'/' -f2-4)'"
                },
                "ScaleOutCooldown": 300,
                "ScaleInCooldown": 600
            }' \
            --region "$AWS_REGION" || warn "Failed to create backend request count scaling policy"
    fi
    
    # Frontend Service Auto Scaling
    log "Setting up frontend service auto scaling..."
    
    # Register scalable target for frontend
    aws application-autoscaling register-scalable-target \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$frontend_service" \
        --min-capacity 2 \
        --max-capacity 10 \
        --region "$AWS_REGION" || warn "Failed to register frontend scalable target"
    
    # CPU-based scaling policy for frontend
    aws application-autoscaling put-scaling-policy \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$frontend_service" \
        --policy-name "$frontend_service-cpu-scaling" \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '{
            "TargetValue": 70.0,
            "PredefinedMetricSpecification": {
                "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
            },
            "ScaleOutCooldown": 300,
            "ScaleInCooldown": 600
        }' \
        --region "$AWS_REGION" || warn "Failed to create frontend CPU scaling policy"
    
    log "ECS Auto Scaling configured successfully"
}

# Configure Lambda Auto Scaling (Provisioned Concurrency)
configure_lambda_auto_scaling() {
    log "Configuring Lambda Auto Scaling..."
    
    local functions=(
        "$ENVIRONMENT-document-processing"
        "$ENVIRONMENT-sow-generation"
        "$ENVIRONMENT-notification-service"
    )
    
    for function_name in "${functions[@]}"; do
        log "Configuring auto scaling for $function_name..."
        
        # Register scalable target
        aws application-autoscaling register-scalable-target \
            --service-namespace lambda \
            --scalable-dimension lambda:provisioned-concurrency:utilization \
            --resource-id "function:$function_name:provisioned" \
            --min-capacity 1 \
            --max-capacity 100 \
            --region "$AWS_REGION" || warn "Failed to register scalable target for $function_name"
        
        # Create scaling policy
        aws application-autoscaling put-scaling-policy \
            --service-namespace lambda \
            --scalable-dimension lambda:provisioned-concurrency:utilization \
            --resource-id "function:$function_name:provisioned" \
            --policy-name "$function_name-scaling-policy" \
            --policy-type TargetTrackingScaling \
            --target-tracking-scaling-policy-configuration '{
                "TargetValue": 70.0,
                "PredefinedMetricSpecification": {
                    "PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"
                },
                "ScaleOutCooldown": 300,
                "ScaleInCooldown": 600
            }' \
            --region "$AWS_REGION" || warn "Failed to create scaling policy for $function_name"
    done
    
    log "Lambda Auto Scaling configured successfully"
}

# Configure DynamoDB Auto Scaling
configure_dynamodb_auto_scaling() {
    log "Configuring DynamoDB Auto Scaling..."
    
    local table_name="$STACK_PREFIX"
    
    # Main table read capacity scaling
    aws application-autoscaling register-scalable-target \
        --service-namespace dynamodb \
        --scalable-dimension dynamodb:table:ReadCapacityUnits \
        --resource-id "table/$table_name" \
        --min-capacity 5 \
        --max-capacity 4000 \
        --region "$AWS_REGION" || warn "Failed to register table read capacity target"
    
    aws application-autoscaling put-scaling-policy \
        --service-namespace dynamodb \
        --scalable-dimension dynamodb:table:ReadCapacityUnits \
        --resource-id "table/$table_name" \
        --policy-name "$table_name-read-scaling-policy" \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '{
            "TargetValue": 70.0,
            "PredefinedMetricSpecification": {
                "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
            },
            "ScaleOutCooldown": 60,
            "ScaleInCooldown": 60
        }' \
        --region "$AWS_REGION" || warn "Failed to create table read scaling policy"
    
    # Main table write capacity scaling
    aws application-autoscaling register-scalable-target \
        --service-namespace dynamodb \
        --scalable-dimension dynamodb:table:WriteCapacityUnits \
        --resource-id "table/$table_name" \
        --min-capacity 5 \
        --max-capacity 4000 \
        --region "$AWS_REGION" || warn "Failed to register table write capacity target"
    
    aws application-autoscaling put-scaling-policy \
        --service-namespace dynamodb \
        --scalable-dimension dynamodb:table:WriteCapacityUnits \
        --resource-id "table/$table_name" \
        --policy-name "$table_name-write-scaling-policy" \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '{
            "TargetValue": 70.0,
            "PredefinedMetricSpecification": {
                "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
            },
            "ScaleOutCooldown": 60,
            "ScaleInCooldown": 60
        }' \
        --region "$AWS_REGION" || warn "Failed to create table write scaling policy"
    
    # GSI scaling configuration
    local gsi_names=("GSI1" "GSI2" "GSI3")
    
    for gsi in "${gsi_names[@]}"; do
        # GSI read capacity scaling
        aws application-autoscaling register-scalable-target \
            --service-namespace dynamodb \
            --scalable-dimension dynamodb:index:ReadCapacityUnits \
            --resource-id "table/$table_name/index/$gsi" \
            --min-capacity 5 \
            --max-capacity 4000 \
            --region "$AWS_REGION" || warn "Failed to register $gsi read capacity target"
        
        aws application-autoscaling put-scaling-policy \
            --service-namespace dynamodb \
            --scalable-dimension dynamodb:index:ReadCapacityUnits \
            --resource-id "table/$table_name/index/$gsi" \
            --policy-name "$table_name-$gsi-read-scaling-policy" \
            --policy-type TargetTrackingScaling \
            --target-tracking-scaling-policy-configuration '{
                "TargetValue": 70.0,
                "PredefinedMetricSpecification": {
                    "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
                },
                "ScaleOutCooldown": 60,
                "ScaleInCooldown": 60
            }' \
            --region "$AWS_REGION" || warn "Failed to create $gsi read scaling policy"
        
        # GSI write capacity scaling
        aws application-autoscaling register-scalable-target \
            --service-namespace dynamodb \
            --scalable-dimension dynamodb:index:WriteCapacityUnits \
            --resource-id "table/$table_name/index/$gsi" \
            --min-capacity 5 \
            --max-capacity 4000 \
            --region "$AWS_REGION" || warn "Failed to register $gsi write capacity target"
        
        aws application-autoscaling put-scaling-policy \
            --service-namespace dynamodb \
            --scalable-dimension dynamodb:index:WriteCapacityUnits \
            --resource-id "table/$table_name/index/$gsi" \
            --policy-name "$table_name-$gsi-write-scaling-policy" \
            --policy-type TargetTrackingScaling \
            --target-tracking-scaling-policy-configuration '{
                "TargetValue": 70.0,
                "PredefinedMetricSpecification": {
                    "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
                },
                "ScaleOutCooldown": 60,
                "ScaleInCooldown": 60
            }' \
            --region "$AWS_REGION" || warn "Failed to create $gsi write scaling policy"
    done
    
    log "DynamoDB Auto Scaling configured successfully"
}

# Configure scheduled scaling for predictable load patterns
configure_scheduled_scaling() {
    log "Configuring scheduled scaling for predictable load patterns..."
    
    local cluster_name="$STACK_PREFIX-cluster"
    local backend_service="$STACK_PREFIX-backend-service"
    
    # Scale up during business hours (9 AM UTC)
    aws application-autoscaling put-scheduled-action \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$backend_service" \
        --scheduled-action-name "scale-up-business-hours" \
        --schedule "cron(0 9 * * MON-FRI)" \
        --scalable-target-action MinCapacity=4,MaxCapacity=20 \
        --region "$AWS_REGION" || warn "Failed to create scale-up scheduled action"
    
    # Scale down during off hours (6 PM UTC)
    aws application-autoscaling put-scheduled-action \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$backend_service" \
        --scheduled-action-name "scale-down-off-hours" \
        --schedule "cron(0 18 * * MON-FRI)" \
        --scalable-target-action MinCapacity=2,MaxCapacity=10 \
        --region "$AWS_REGION" || warn "Failed to create scale-down scheduled action"
    
    # Weekend scaling (reduced capacity)
    aws application-autoscaling put-scheduled-action \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id "service/$cluster_name/$backend_service" \
        --scheduled-action-name "weekend-scaling" \
        --schedule "cron(0 0 * * SAT)" \
        --scalable-target-action MinCapacity=1,MaxCapacity=5 \
        --region "$AWS_REGION" || warn "Failed to create weekend scheduled action"
    
    log "Scheduled scaling configured successfully"
}

# Create auto scaling monitoring dashboard
create_auto_scaling_dashboard() {
    log "Creating auto scaling monitoring dashboard..."
    
    local dashboard_body=$(cat <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/ECS", "CPUUtilization", "ServiceName", "$STACK_PREFIX-backend-service", "ClusterName", "$STACK_PREFIX-cluster" ],
          [ ".", "MemoryUtilization", ".", ".", ".", "." ],
          [ "AWS/ApplicationELB", "RequestCountPerTarget", "TargetGroup", "$STACK_PREFIX-backend-tg" ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$AWS_REGION",
        "title": "ECS Service Metrics",
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/ECS", "RunningTaskCount", "ServiceName", "$STACK_PREFIX-backend-service", "ClusterName", "$STACK_PREFIX-cluster" ],
          [ ".", "DesiredCount", ".", ".", ".", "." ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$AWS_REGION",
        "title": "ECS Task Counts",
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 12,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "$STACK_PREFIX" ],
          [ ".", "ConsumedWriteCapacityUnits", ".", "." ],
          [ ".", "ProvisionedReadCapacityUnits", ".", "." ],
          [ ".", "ProvisionedWriteCapacityUnits", ".", "." ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$AWS_REGION",
        "title": "DynamoDB Capacity Utilization",
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 18,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "ProvisionedConcurrencyUtilization", "FunctionName", "$ENVIRONMENT-document-processing" ],
          [ ".", ".", ".", "$ENVIRONMENT-sow-generation" ],
          [ ".", "ConcurrentExecutions", ".", "$ENVIRONMENT-document-processing" ],
          [ ".", ".", ".", "$ENVIRONMENT-sow-generation" ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$AWS_REGION",
        "title": "Lambda Concurrency Metrics",
        "period": 300
      }
    }
  ]
}
EOF
)
    
    aws cloudwatch put-dashboard \
        --dashboard-name "$ENVIRONMENT-auto-scaling-dashboard" \
        --dashboard-body "$dashboard_body" \
        --region "$AWS_REGION" || warn "Failed to create auto scaling dashboard"
    
    log "Auto scaling dashboard created successfully"
}

# Verify auto scaling configuration
verify_auto_scaling() {
    log "Verifying auto scaling configuration..."
    
    # Check ECS scalable targets
    local ecs_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace ecs \
        --region "$AWS_REGION" \
        --query 'ScalableTargets[?contains(ResourceId, `'$STACK_PREFIX'`)].ResourceId' \
        --output text)
    
    if [ -n "$ecs_targets" ]; then
        info "ECS scalable targets configured: $(echo $ecs_targets | wc -w)"
    else
        warn "No ECS scalable targets found"
    fi
    
    # Check Lambda scalable targets
    local lambda_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace lambda \
        --region "$AWS_REGION" \
        --query 'ScalableTargets[?contains(ResourceId, `'$ENVIRONMENT'`)].ResourceId' \
        --output text)
    
    if [ -n "$lambda_targets" ]; then
        info "Lambda scalable targets configured: $(echo $lambda_targets | wc -w)"
    else
        warn "No Lambda scalable targets found"
    fi
    
    # Check DynamoDB scalable targets
    local dynamodb_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace dynamodb \
        --region "$AWS_REGION" \
        --query 'ScalableTargets[?contains(ResourceId, `'$STACK_PREFIX'`)].ResourceId' \
        --output text)
    
    if [ -n "$dynamodb_targets" ]; then
        info "DynamoDB scalable targets configured: $(echo $dynamodb_targets | wc -w)"
    else
        warn "No DynamoDB scalable targets found"
    fi
    
    log "Auto scaling verification completed"
}

# Main execution
main() {
    log "Auto Scaling Configuration for UK Home Improvement Platform"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    # Check prerequisites
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    # Configure auto scaling
    configure_ecs_auto_scaling
    configure_lambda_auto_scaling
    configure_dynamodb_auto_scaling
    configure_scheduled_scaling
    create_auto_scaling_dashboard
    verify_auto_scaling
    
    log "Auto scaling configuration completed successfully!"
    
    info "Dashboard URL: https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=$ENVIRONMENT-auto-scaling-dashboard"
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