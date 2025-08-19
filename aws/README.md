# AWS Infrastructure for UK Home Improvement Platform

This directory contains all the AWS infrastructure configuration and deployment scripts for the UK Home Improvement Platform.

## Overview

The platform is deployed on AWS using a comprehensive infrastructure setup that includes:

- **ECS Fargate** for containerized application hosting
- **AWS Lambda** for serverless microservices
- **DynamoDB** with single-table design and auto-scaling
- **AWS Bedrock** for AI-powered features
- **CloudWatch** for monitoring and logging
- **AWS WAF** for security
- **AWS X-Ray** for distributed tracing
- **CodePipeline** for CI/CD

## Directory Structure

```
aws/
├── cloudformation/          # CloudFormation templates
│   ├── infrastructure.yml   # VPC, networking, and core infrastructure
│   ├── ecs-fargate.yml     # ECS cluster and Fargate services
│   ├── lambda-functions.yml # Lambda functions for microservices
│   ├── dynamodb.yml        # DynamoDB tables and backup configuration
│   ├── monitoring.yml      # CloudWatch dashboards and alarms
│   ├── waf.yml            # AWS WAF security configuration
│   └── xray.yml           # X-Ray distributed tracing
├── codepipeline/           # CI/CD pipeline configuration
│   ├── buildspec.yml      # CodeBuild build specification
│   └── pipeline.yml       # CodePipeline configuration
├── scripts/               # Deployment and management scripts
│   ├── deploy.sh          # Main deployment script
│   ├── bedrock-monitoring.sh # Bedrock usage monitoring
│   └── auto-scaling-config.sh # Auto-scaling configuration
└── README.md             # This file
```

## Prerequisites

Before deploying the infrastructure, ensure you have:

1. **AWS CLI** installed and configured
2. **AWS credentials** with appropriate permissions
3. **Docker** installed (for building container images)
4. **Node.js** and **npm** installed
5. **bc** calculator for cost calculations (Linux/macOS)

### Required AWS Permissions

Your AWS user/role needs the following permissions:
- CloudFormation full access
- ECS full access
- Lambda full access
- DynamoDB full access
- IAM role creation and management
- VPC and networking management
- CloudWatch and X-Ray access
- Bedrock access
- WAF access
- CodePipeline and CodeBuild access

## Quick Start

### Option 1: Complete Deployment (Recommended)

```bash
# Deploy everything with master script
./aws/scripts/master-deploy.sh production eu-west-2

# Deploy to staging
./aws/scripts/master-deploy.sh staging eu-west-2

# Deploy with tests skipped
./aws/scripts/master-deploy.sh production eu-west-2 true
```

### Option 2: Step-by-Step Deployment

```bash
# 1. Deploy infrastructure
./aws/scripts/deploy.sh production eu-west-2

# 2. Configure auto scaling
./aws/scripts/auto-scaling-config.sh production eu-west-2

# 3. Set up Bedrock monitoring
./aws/scripts/bedrock-monitoring.sh eu-west-2 production

# 4. Verify deployment
./aws/scripts/deployment-verification.sh production eu-west-2

# 5. Run cost optimization analysis
./aws/scripts/cost-optimization.sh production eu-west-2
```

## Detailed Deployment Guide

### Step 1: Infrastructure Foundation

The infrastructure deployment creates:

1. **VPC and Networking**
   - VPC with public and private subnets
   - Internet Gateway and NAT Gateway
   - Route tables and security groups

2. **DynamoDB Setup**
   - Single-table design with GSIs
   - Point-in-time recovery enabled
   - Automated backups configured
   - Auto-scaling policies

3. **Lambda Functions**
   - Document processing service
   - SoW generation service
   - Notification service
   - Auto-scaling with provisioned concurrency

### Step 2: Container Services

4. **ECS Fargate Cluster**
   - Application Load Balancer
   - Backend and frontend services
   - Auto-scaling based on CPU, memory, and request count
   - Health checks and rolling deployments

5. **ECR Repository**
   - Container image storage
   - Lifecycle policies for image cleanup

### Step 3: Security and Monitoring

6. **AWS WAF**
   - Protection against common web attacks
   - Rate limiting and geographic restrictions
   - Custom rules for API protection

7. **CloudWatch Monitoring**
   - Comprehensive dashboards
   - Alarms for all critical metrics
   - Log aggregation and analysis

8. **AWS X-Ray**
   - Distributed tracing
   - Performance monitoring
   - Error tracking and analysis

### Step 4: CI/CD Pipeline

9. **CodePipeline**
   - Automated builds and deployments
   - Multi-stage pipeline (staging → production)
   - Manual approval gates

## Configuration

### Environment Variables

Set these environment variables before deployment:

```bash
export AWS_REGION=eu-west-2
export ENVIRONMENT=production
export GITHUB_TOKEN=your_github_token  # For CI/CD pipeline
```

### Cost Optimization

The infrastructure includes several cost optimization features:

1. **Auto Scaling**: All services scale based on demand
2. **Spot Instances**: ECS uses Fargate Spot for cost savings
3. **Reserved Capacity**: DynamoDB and Lambda use on-demand pricing
4. **Lifecycle Policies**: Automated cleanup of old resources

### Security Features

1. **Network Security**
   - Private subnets for application services
   - Security groups with minimal required access
   - WAF protection for web applications

2. **Data Security**
   - Encryption at rest and in transit
   - IAM roles with least privilege access
   - VPC endpoints for AWS services

3. **Monitoring and Alerting**
   - Real-time security monitoring
   - Automated incident response
   - Compliance reporting

## Monitoring and Maintenance

### CloudWatch Dashboards

Access the monitoring dashboards:

1. **Main Dashboard**: Application performance and health
2. **Security Dashboard**: WAF metrics and security events
3. **X-Ray Dashboard**: Distributed tracing and performance
4. **Auto Scaling Dashboard**: Scaling metrics and trends

### Alarms and Notifications

The system includes alarms for:

- High CPU/memory utilization
- Application errors and latency
- DynamoDB throttling
- Lambda function errors
- Bedrock usage and costs
- Security threats

### Backup and Recovery

1. **DynamoDB Backups**
   - Point-in-time recovery enabled
   - Daily, weekly, and monthly backups
   - Cross-region backup replication

2. **Application Data**
   - S3 versioning for document storage
   - ECS service definitions in version control

## Troubleshooting

### Common Issues

1. **Stack Deployment Failures**
   ```bash
   # Check CloudFormation events
   aws cloudformation describe-stack-events --stack-name production-uk-home-improvement-infrastructure
   ```

2. **Service Health Issues**
   ```bash
   # Check ECS service status
   aws ecs describe-services --cluster production-uk-home-improvement-cluster --services production-backend-service
   ```

3. **High Costs**
   ```bash
   # Run cost analysis
   ./aws/scripts/bedrock-monitoring.sh eu-west-2 production
   ```

### Log Analysis

Access logs through CloudWatch:

1. **Application Logs**: `/ecs/production-backend`
2. **Lambda Logs**: `/aws/lambda/production-document-processing`
3. **WAF Logs**: `/aws/wafv2/production-uk-home-improvement`

## Scaling Considerations

### Traffic Patterns

The auto-scaling configuration handles:

- **Business Hours**: Increased capacity during 9 AM - 6 PM UTC
- **Weekend Traffic**: Reduced capacity on weekends
- **Burst Traffic**: Rapid scaling for sudden load increases

### Performance Targets

- **API Response Time**: < 2 seconds (95th percentile)
- **Document Processing**: < 5 minutes per document
- **SoW Generation**: < 30 seconds per request
- **Availability**: 99.9% uptime target

## Cost Management

### Monthly Cost Estimates

- **Production Environment**: $500-1000/month
- **Staging Environment**: $100-200/month

### Cost Optimization Tips

1. Use Fargate Spot instances for non-critical workloads
2. Implement request caching to reduce Bedrock costs
3. Optimize DynamoDB queries to minimize RCU/WCU usage
4. Use CloudWatch Logs retention policies
5. Regular review of unused resources

## Support and Maintenance

### Regular Tasks

1. **Weekly**: Review CloudWatch alarms and metrics
2. **Monthly**: Analyze cost reports and optimize resources
3. **Quarterly**: Update security configurations and patches
4. **Annually**: Review and update disaster recovery procedures

### Updates and Patches

1. **Application Updates**: Automated through CI/CD pipeline
2. **Infrastructure Updates**: Manual CloudFormation stack updates
3. **Security Patches**: Automated through base image updates

## Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [CloudWatch Best Practices](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_architecture.html)