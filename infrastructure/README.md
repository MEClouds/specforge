# SpecForge Infrastructure

This directory contains the Terraform configuration for deploying SpecForge to AWS using a modern, scalable architecture.

## Architecture Overview

- **Frontend**: React application served via Nginx in ECS Fargate containers
- **Backend**: Node.js API server running in ECS Fargate containers
- **Database**: PostgreSQL on Amazon RDS with automated backups
- **Cache**: Redis on Amazon ElastiCache for session management
- **Load Balancer**: Application Load Balancer with health checks
- **Container Registry**: Amazon ECR for Docker images
- **Monitoring**: CloudWatch dashboards, alarms, and log aggregation
- **Auto Scaling**: Automatic scaling based on CPU and memory metrics

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Docker** for building container images
4. **Node.js** >= 18 for local development

## Quick Start

### 1. Configure Terraform Backend (Optional but Recommended)

Edit `main.tf` and uncomment the S3 backend configuration:

```hcl
backend "s3" {
  bucket = "your-terraform-state-bucket"
  key    = "specforge/terraform.tfstate"
  region = "us-east-1"
}
```

### 2. Set Environment Variables

```bash
export AWS_REGION=us-east-1
export TF_VAR_alert_email=your-email@example.com
```

### 3. Deploy Infrastructure

```bash
# Deploy staging environment
./scripts/terraform-deploy.sh plan staging
./scripts/terraform-deploy.sh apply staging

# Deploy production environment
./scripts/terraform-deploy.sh plan production
./scripts/terraform-deploy.sh apply production
```

### 4. Configure Secrets

After infrastructure deployment, set the required secrets:

```bash
# Set OpenAI API Key
aws ssm put-parameter \
  --name "/specforge-production/openai/api-key" \
  --value "your-openai-api-key" \
  --type "SecureString" \
  --overwrite

# Set Anthropic API Key
aws ssm put-parameter \
  --name "/specforge-production/anthropic/api-key" \
  --value "your-anthropic-api-key" \
  --type "SecureString" \
  --overwrite
```

### 5. Deploy Application

```bash
# Build and push Docker images, then deploy
# This is typically done via GitHub Actions, but can be done manually:
./scripts/deploy.sh production all
```

## Environment Configuration

### Staging Environment

- **Purpose**: Testing and validation
- **Resources**: Minimal (t3.micro instances)
- **Scaling**: Limited auto-scaling
- **Monitoring**: Basic alerts

### Production Environment

- **Purpose**: Live application
- **Resources**: Production-ready (t3.small+ instances)
- **Scaling**: Full auto-scaling capabilities
- **Monitoring**: Comprehensive monitoring and alerting

## Infrastructure Components

### Networking (vpc.tf)

- VPC with public and private subnets across 2 AZs
- Internet Gateway for public subnet access
- NAT Gateways for private subnet internet access
- Route tables for proper traffic routing

### Security (security-groups.tf)

- ALB security group (ports 80, 443)
- ECS tasks security group (application ports)
- RDS security group (PostgreSQL port 5432)
- ElastiCache security group (Redis port 6379)

### Compute (ecs.tf)

- ECS Fargate cluster with Container Insights
- Task definitions for frontend and backend
- ECS services with load balancer integration
- IAM roles for task execution and application access

### Storage (database.tf)

- PostgreSQL RDS instance with automated backups
- ElastiCache Redis cluster for session storage
- Encrypted storage and secure parameter management

### Load Balancing (alb.tf)

- Application Load Balancer with health checks
- Target groups for frontend and backend services
- Listener rules for API and static content routing
- HTTPS support with ACM certificates

### Container Registry (ecr.tf)

- ECR repositories for frontend and backend images
- Lifecycle policies for image cleanup
- Vulnerability scanning enabled

### Auto Scaling (autoscaling.tf)

- Application Auto Scaling for ECS services
- CPU and memory-based scaling policies
- Configurable min/max capacity limits

### Monitoring (monitoring.tf)

- CloudWatch dashboard with key metrics
- Comprehensive alarms for all components
- SNS topic for alert notifications
- Custom log metric filters for application errors

### Secrets Management (secrets.tf)

- SSM Parameter Store for sensitive configuration
- IAM policies for secure parameter access
- Encrypted storage for API keys and passwords

## Deployment Strategies

### Blue-Green Deployment

Production deployments use blue-green strategy for zero-downtime updates:

1. Deploy new version to "green" environment
2. Health check the green environment
3. Switch traffic from blue to green
4. Keep blue environment for quick rollback
5. Clean up old blue environment

### Rolling Updates

Staging deployments use rolling updates for faster iteration:

1. Update task definition with new image
2. ECS gradually replaces old tasks with new ones
3. Health checks ensure service availability

## Monitoring and Alerting

### Key Metrics Monitored

- **ECS Services**: CPU, memory, task count
- **Load Balancer**: Request count, response time, error rates
- **RDS**: CPU, connections, storage, performance
- **ElastiCache**: CPU, connections, memory usage
- **Application**: Error logs, AI API failures

### Alert Thresholds

- CPU utilization > 80%
- Memory utilization > 85%
- Response time > 2 seconds
- 5XX errors > 10 per 5 minutes
- Database connections > 80% of max
- Free storage < 2GB

## Security Best Practices

### Network Security

- Private subnets for application and database tiers
- Security groups with minimal required access
- No direct internet access to backend services

### Data Protection

- Encryption at rest for RDS and ElastiCache
- Encrypted SSM parameters for secrets
- VPC endpoints for AWS service access

### Access Control

- IAM roles with least privilege principles
- No hardcoded credentials in code or configuration
- Separate roles for different service functions

## Backup and Disaster Recovery

### Automated Backups

- RDS automated backups with 7-day retention
- Point-in-time recovery capability
- Cross-AZ deployment for high availability

### Disaster Recovery

- Multi-AZ RDS deployment
- ECS services distributed across AZs
- Load balancer health checks and failover

## Cost Optimization

### Resource Sizing

- Right-sized instances based on environment
- Auto-scaling to handle traffic variations
- Spot instances for non-critical workloads (future enhancement)

### Storage Optimization

- GP2 storage for cost-effective performance
- Automated storage scaling for RDS
- ECR lifecycle policies to manage image storage

## Troubleshooting

### Common Issues

1. **Service won't start**: Check CloudWatch logs in `/ecs/specforge-{env}`
2. **Database connection issues**: Verify security groups and connection strings
3. **Load balancer health checks failing**: Check target group health in AWS console
4. **High costs**: Review CloudWatch metrics and right-size resources

### Useful Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster specforge-production-cluster --services specforge-production-backend

# View recent logs
aws logs tail /ecs/specforge-production --follow

# Check RDS status
aws rds describe-db-instances --db-instance-identifier specforge-production-postgres

# View CloudWatch alarms
aws cloudwatch describe-alarms --state-value ALARM
```

## Maintenance

### Regular Tasks

- Review and update security groups
- Monitor costs and optimize resources
- Update container images with security patches
- Review and rotate API keys and secrets

### Scaling Considerations

- Monitor auto-scaling metrics and adjust thresholds
- Consider upgrading instance types for better performance
- Evaluate multi-region deployment for global users

## Support

For infrastructure issues:

1. Check CloudWatch logs and metrics
2. Review Terraform state and configuration
3. Consult AWS documentation for service-specific issues
4. Contact the development team for application-specific problems
