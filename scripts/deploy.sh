#!/bin/bash

# Blue-Green Deployment Script for SpecForge
# Usage: ./scripts/deploy.sh [staging|production] [backend|frontend|all]

set -e

ENVIRONMENT=${1:-staging}
SERVICE=${2:-all}
AWS_REGION=${AWS_REGION:-us-east-1}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Validate inputs
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Environment must be 'staging' or 'production'"
fi

if [[ "$SERVICE" != "backend" && "$SERVICE" != "frontend" && "$SERVICE" != "all" ]]; then
    error "Service must be 'backend', 'frontend', or 'all'"
fi

# Set environment-specific variables
CLUSTER_NAME="specforge-${ENVIRONMENT}-cluster"
BACKEND_SERVICE="specforge-${ENVIRONMENT}-backend"
FRONTEND_SERVICE="specforge-${ENVIRONMENT}-frontend"
ALB_NAME="specforge-${ENVIRONMENT}-alb"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    error "AWS CLI not configured or credentials invalid"
fi

# Function to perform blue-green deployment for a service
blue_green_deploy() {
    local service_name=$1
    local task_family=$2
    
    log "Starting blue-green deployment for $service_name"
    
    # Get current service configuration
    local current_service=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name" \
        --query 'services[0]' 2>/dev/null)
    
    if [[ "$current_service" == "null" ]]; then
        error "Service $service_name not found in cluster $CLUSTER_NAME"
    fi
    
    # Get latest task definition
    local task_definition=$(aws ecs describe-task-definition \
        --task-definition "$task_family" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    log "Using task definition: $task_definition"
    
    # Create green service
    local green_service="${service_name}-green"
    
    log "Creating green service: $green_service"
    
    # Extract network configuration and load balancers
    local network_config=$(echo "$current_service" | jq -c '.networkConfiguration')
    local load_balancers=$(echo "$current_service" | jq -c '.loadBalancers')
    local desired_count=$(echo "$current_service" | jq -r '.desiredCount')
    
    aws ecs create-service \
        --cluster "$CLUSTER_NAME" \
        --service-name "$green_service" \
        --task-definition "$task_definition" \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "$network_config" \
        --load-balancers "$load_balancers" > /dev/null
    
    log "Waiting for green service to become stable..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$green_service"
    
    # Health check on green service
    log "Performing health check on green service..."
    sleep 30  # Allow time for load balancer to register targets
    
    # Get ALB DNS name for health check
    local alb_dns=$(aws elbv2 describe-load-balancers \
        --names "$ALB_NAME" \
        --query 'LoadBalancers[0].DNSName' \
        --output text)
    
    # Perform health check based on service type
    if [[ "$service_name" == *"backend"* ]]; then
        if ! curl -f "http://$alb_dns/api/health" > /dev/null 2>&1; then
            error "Health check failed for green backend service"
        fi
    else
        if ! curl -f "http://$alb_dns/health" > /dev/null 2>&1; then
            error "Health check failed for green frontend service"
        fi
    fi
    
    log "Health check passed for green service"
    
    # Scale down blue service
    log "Scaling down blue service..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --desired-count 0 > /dev/null
    
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name"
    
    # Update blue service with new task definition
    log "Updating blue service with new task definition..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --task-definition "$task_definition" \
        --desired-count "$desired_count" > /dev/null
    
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name"
    
    # Final health check
    log "Performing final health check..."
    sleep 30
    
    if [[ "$service_name" == *"backend"* ]]; then
        if ! curl -f "http://$alb_dns/api/health" > /dev/null 2>&1; then
            error "Final health check failed for backend service"
        fi
    else
        if ! curl -f "http://$alb_dns/health" > /dev/null 2>&1; then
            error "Final health check failed for frontend service"
        fi
    fi
    
    # Clean up green service
    log "Cleaning up green service..."
    aws ecs delete-service \
        --cluster "$CLUSTER_NAME" \
        --service "$green_service" \
        --force > /dev/null
    
    log "Blue-green deployment completed successfully for $service_name"
}

# Function to perform rolling update (simpler for frontend)
rolling_update() {
    local service_name=$1
    local task_family=$2
    
    log "Starting rolling update for $service_name"
    
    local task_definition=$(aws ecs describe-task-definition \
        --task-definition "$task_family" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --task-definition "$task_definition" \
        --force-new-deployment > /dev/null
    
    log "Waiting for rolling update to complete..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name"
    
    log "Rolling update completed for $service_name"
}

# Main deployment logic
main() {
    log "Starting deployment to $ENVIRONMENT environment"
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        if [[ "$ENVIRONMENT" == "production" ]]; then
            blue_green_deploy "$BACKEND_SERVICE" "$BACKEND_SERVICE"
        else
            rolling_update "$BACKEND_SERVICE" "$BACKEND_SERVICE"
        fi
    fi
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        rolling_update "$FRONTEND_SERVICE" "$FRONTEND_SERVICE"
    fi
    
    # Final smoke tests
    log "Running final smoke tests..."
    local alb_dns=$(aws elbv2 describe-load-balancers \
        --names "$ALB_NAME" \
        --query 'LoadBalancers[0].DNSName' \
        --output text)
    
    if ! curl -f "http://$alb_dns/api/health" > /dev/null 2>&1; then
        error "Final smoke test failed for backend"
    fi
    
    if ! curl -f "http://$alb_dns/health" > /dev/null 2>&1; then
        error "Final smoke test failed for frontend"
    fi
    
    log "🚀 Deployment to $ENVIRONMENT completed successfully!"
    log "Application is available at: http://$alb_dns"
}

# Run main function
main