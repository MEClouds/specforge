# Staging Environment Configuration

environment = "staging"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr             = "10.1.0.0/16"
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
private_subnet_cidrs = ["10.1.10.0/24", "10.1.20.0/24"]

# ECS Configuration
backend_cpu           = 256
backend_memory        = 512
backend_desired_count = 1
backend_min_capacity  = 1
backend_max_capacity  = 3

frontend_cpu           = 256
frontend_memory        = 512
frontend_desired_count = 1
frontend_min_capacity  = 1
frontend_max_capacity  = 2

# Database Configuration
db_instance_class         = "db.t3.micro"
db_allocated_storage      = 20
db_max_allocated_storage  = 50

# Redis Configuration
redis_node_type       = "cache.t3.micro"
redis_num_cache_nodes = 1

# Monitoring
alert_email = ""  # Set this to receive alerts