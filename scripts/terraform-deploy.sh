#!/bin/bash

# Terraform Deployment Script for SpecForge Infrastructure
# Usage: ./scripts/terraform-deploy.sh [plan|apply|destroy] [staging|production]

set -e

ACTION=${1:-plan}
ENVIRONMENT=${2:-staging}

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
if [[ "$ACTION" != "plan" && "$ACTION" != "apply" && "$ACTION" != "destroy" ]]; then
    error "Action must be 'plan', 'apply', or 'destroy'"
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Environment must be 'staging' or 'production'"
fi

# Set environment-specific variables
export TF_VAR_environment="$ENVIRONMENT"
export TF_VAR_project_name="specforge"

# Set environment-specific Terraform workspace
WORKSPACE="$ENVIRONMENT"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    error "Terraform is not installed"
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    error "AWS CLI not configured or credentials invalid"
fi

# Navigate to infrastructure directory
cd infrastructure

# Initialize Terraform
log "Initializing Terraform..."
terraform init

# Select or create workspace
log "Selecting Terraform workspace: $WORKSPACE"
terraform workspace select "$WORKSPACE" 2>/dev/null || terraform workspace new "$WORKSPACE"

# Validate Terraform configuration
log "Validating Terraform configuration..."
terraform validate

# Format Terraform files
terraform fmt -recursive

case "$ACTION" in
    "plan")
        log "Running Terraform plan for $ENVIRONMENT environment..."
        terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="${ENVIRONMENT}.tfplan"
        ;;
    
    "apply")
        log "Applying Terraform configuration for $ENVIRONMENT environment..."
        
        # Check if plan file exists
        if [[ ! -f "${ENVIRONMENT}.tfplan" ]]; then
            warn "No plan file found. Running plan first..."
            terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="${ENVIRONMENT}.tfplan"
        fi
        
        # Apply the plan
        terraform apply "${ENVIRONMENT}.tfplan"
        
        # Clean up plan file
        rm -f "${ENVIRONMENT}.tfplan"
        
        log "Terraform apply completed successfully!"
        
        # Output important values
        log "Infrastructure outputs:"
        terraform output
        ;;
    
    "destroy")
        warn "This will destroy all infrastructure in the $ENVIRONMENT environment!"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            log "Destroy cancelled"
            exit 0
        fi
        
        log "Destroying infrastructure for $ENVIRONMENT environment..."
        terraform destroy -var-file="environments/${ENVIRONMENT}.tfvars" -auto-approve
        
        log "Infrastructure destroyed successfully!"
        ;;
esac

log "Terraform operation completed successfully!"