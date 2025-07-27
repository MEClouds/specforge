# Production Environment Configuration

environment = "production"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

# ECS Configuration
backend_cpu           = 512
backend_memory        = 1024
backend_desired_count = 2
backend_min_capacity  = 1
backend_max_capacity  = 10

frontend_cpu           = 256
frontend_memory        = 512
frontend_desired_count = 2
frontend_min_capacity  = 1
frontend_max_capacity  = 5

# Database Configuration
db_instance_class         = "db.t3.small"
db_allocated_storage      = 50
db_max_allocated_storage  = 200

# Redis Configuration
redis_node_type       = "cache.t3.small"
redis_num_cache_nodes = 1

# SSL/TLS Configuration (set these if you have a domain and certificate)
domain_name     = ""  # e.g., "specforge.example.com"
certificate_arn = ""  # ACM certificate ARN

# Monitoring
alert_email = ""  # Set this to receive production alerts