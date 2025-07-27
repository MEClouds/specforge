# SpecForge Deployment Checklist

This checklist ensures a successful deployment of SpecForge to AWS.

## Pre-Deployment Setup

### 1. AWS Account Setup

- [ ] AWS account with appropriate permissions
- [ ] AWS CLI configured with credentials
- [ ] S3 bucket for Terraform state (optional but recommended)
- [ ] Domain name and ACM certificate (for production HTTPS)

### 2. Required Secrets

- [ ] OpenAI API key
- [ ] Anthropic API key (optional)
- [ ] Alert email address for monitoring
- [ ] Slack webhook URL for deployment notifications (optional)

### 3. GitHub Repository Setup

- [ ] Repository secrets configured:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `SLACK_WEBHOOK_URL` (optional)

## Infrastructure Deployment

### 1. Terraform Configuration

- [ ] Update `infrastructure/main.tf` with S3 backend configuration
- [ ] Review and customize `infrastructure/environments/staging.tfvars`
- [ ] Review and customize `infrastructure/environments/production.tfvars`
- [ ] Set alert email in environment configuration files

### 2. Deploy Infrastructure

```bash
# Deploy staging environment
./scripts/terraform-deploy.sh plan staging
./scripts/terraform-deploy.sh apply staging

# Deploy production environment
./scripts/terraform-deploy.sh plan production
./scripts/terraform-deploy.sh apply production
```

### 3. Configure Secrets in AWS

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

## Application Deployment

### 1. Docker Images

- [ ] Backend Docker image builds successfully
- [ ] Frontend Docker image builds successfully
- [ ] Images pushed to ECR repositories

### 2. Database Setup

- [ ] RDS PostgreSQL instance is running
- [ ] Database migrations completed
- [ ] ElastiCache Redis cluster is accessible

### 3. ECS Services

- [ ] Backend ECS service is running and healthy
- [ ] Frontend ECS service is running and healthy
- [ ] Load balancer health checks are passing

## Post-Deployment Verification

### 1. Health Checks

- [ ] Backend health endpoint: `http://your-alb-dns/api/health`
- [ ] Frontend health endpoint: `http://your-alb-dns/health`
- [ ] API endpoints responding correctly
- [ ] WebSocket connections working

### 2. Monitoring Setup

- [ ] CloudWatch dashboard showing metrics
- [ ] CloudWatch alarms configured and active
- [ ] SNS topic subscriptions confirmed
- [ ] Log aggregation working in CloudWatch

### 3. Security Verification

- [ ] Security groups properly configured
- [ ] No public access to private resources
- [ ] SSL/TLS certificates working (production)
- [ ] Secrets properly encrypted in SSM

### 4. Performance Testing

- [ ] Load testing completed
- [ ] Auto-scaling policies tested
- [ ] Database performance acceptable
- [ ] Response times within acceptable limits

## CI/CD Pipeline

### 1. GitHub Actions

- [ ] CI pipeline runs successfully on pull requests
- [ ] Staging deployment works on develop branch
- [ ] Production deployment works on main branch
- [ ] Rollback mechanism tested

### 2. Blue-Green Deployment

- [ ] Blue-green deployment strategy working
- [ ] Health checks during deployment
- [ ] Automatic rollback on failure
- [ ] Zero-downtime deployments verified

## Operational Readiness

### 1. Monitoring and Alerting

- [ ] All critical metrics being monitored
- [ ] Alert thresholds properly configured
- [ ] On-call procedures documented
- [ ] Runbook for common issues created

### 2. Backup and Recovery

- [ ] Database backups configured
- [ ] Point-in-time recovery tested
- [ ] Disaster recovery procedures documented
- [ ] Recovery time objectives defined

### 3. Security and Compliance

- [ ] Security scanning in CI/CD pipeline
- [ ] Vulnerability management process
- [ ] Access control policies implemented
- [ ] Audit logging enabled

## Go-Live Checklist

### 1. Final Verification

- [ ] All environments tested and working
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated

### 2. Launch Preparation

- [ ] DNS records configured (if using custom domain)
- [ ] CDN configured (if applicable)
- [ ] Rate limiting configured
- [ ] Error tracking enabled

### 3. Post-Launch

- [ ] Monitor application metrics closely
- [ ] Watch for any alerts or issues
- [ ] Verify user experience is smooth
- [ ] Document any issues and resolutions

## Troubleshooting Common Issues

### Infrastructure Issues

- **Terraform apply fails**: Check AWS permissions and resource limits
- **ECS tasks won't start**: Check CloudWatch logs and task definition
- **Load balancer health checks fail**: Verify security groups and target health

### Application Issues

- **Database connection errors**: Check security groups and connection strings
- **High response times**: Monitor CloudWatch metrics and scale resources
- **WebSocket issues**: Check load balancer configuration for sticky sessions

### Monitoring Issues

- **Missing metrics**: Verify CloudWatch agent configuration
- **Alerts not firing**: Check alarm thresholds and SNS subscriptions
- **Log aggregation problems**: Verify log group permissions and retention

## Maintenance Tasks

### Regular Tasks

- [ ] Review and update security patches
- [ ] Monitor costs and optimize resources
- [ ] Review and rotate API keys
- [ ] Update documentation

### Monthly Tasks

- [ ] Review CloudWatch metrics and optimize
- [ ] Test backup and recovery procedures
- [ ] Review security groups and access policies
- [ ] Update dependencies and container images

### Quarterly Tasks

- [ ] Conduct security audit
- [ ] Review and update disaster recovery plan
- [ ] Performance testing and optimization
- [ ] Cost optimization review

## Support Contacts

- **Infrastructure Issues**: DevOps Team
- **Application Issues**: Development Team
- **Security Issues**: Security Team
- **AWS Support**: [AWS Support Case URL]

## Documentation Links

- [Infrastructure README](infrastructure/README.md)
- [API Documentation](backend/docs/)
- [Deployment Scripts](scripts/)
- [Monitoring Dashboard](https://console.aws.amazon.com/cloudwatch/)
