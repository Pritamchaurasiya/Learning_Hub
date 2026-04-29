# Terraform Variables Configuration
# Learning Hub Platform - Infrastructure Variables

variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = contains(["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"], var.aws_region)
    error_message = "The aws_region must be one of: us-east-1, us-west-2, eu-west-1, ap-southeast-1."
  }
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "The environment must be one of: development, staging, production."
  }
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "learning-hub-cluster"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.cluster_name))
    error_message = "The cluster_name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "learninghub.com"

  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.domain_name))
    error_message = "The domain_name must be a valid domain name."
  }
}

variable "cluster_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.28"

  validation {
    condition     = can(regex("^1\\.[0-9]+$", var.cluster_version))
    error_message = "The cluster_version must be in format 1.X where X is a number."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "The vpc_cidr must be a valid CIDR block."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnets are required."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnets are required."
  }
}

variable "availability_zones" {
  description = "Availability zones for the region"
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.availability_zones) == 0 || length(var.availability_zones) >= 2
    error_message = "If availability_zones are specified, at least 2 are required."
  }
}

# Node Group Configuration
variable "node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    desired_capacity = number
    max_capacity     = number
    min_capacity     = number
    instance_types   = list(string)
    disk_size        = optional(number, 50)
    k8s_labels      = optional(map(string), {})
  }))
  default = {
    general = {
      desired_capacity = 3
      max_capacity     = 6
      min_capacity     = 3
      instance_types   = ["t3.medium"]
      k8s_labels = {
        Environment = "production"
        NodeGroup   = "general"
      }
    }
    system = {
      desired_capacity = 2
      max_capacity     = 3
      min_capacity     = 1
      instance_types   = ["t3.small"]
      k8s_labels = {
        Environment = "production"
        NodeGroup   = "system"
      }
    }
  }

  validation {
    condition = alltrue([
      for name, config in var.node_groups :
      config.desired_capacity >= config.min_capacity && config.desired_capacity <= config.max_capacity
    ])
    error_message = "desired_capacity must be between min_capacity and max_capacity for all node groups."
  }
}

# Database Configuration
variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"

  validation {
    condition     = contains(["db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large", "db.t3.xlarge"], var.database_instance_class)
    error_message = "The database_instance_class must be a valid t3 RDS instance class."
  }
}

variable "database_allocated_storage" {
  description = "Initial allocated storage for RDS (GB)"
  type        = number
  default     = 100

  validation {
    condition     = var.database_allocated_storage >= 20 && var.database_allocated_storage <= 65536
    error_message = "The database_allocated_storage must be between 20 and 65536 GB."
  }
}

variable "database_max_allocated_storage" {
  description = "Maximum allocated storage for RDS (GB)"
  type        = number
  default     = 1000

  validation {
    condition     = var.database_max_allocated_storage >= var.database_allocated_storage
    error_message = "The database_max_allocated_storage must be greater than or equal to database_allocated_storage."
  }
}

variable "database_backup_retention_period" {
  description = "Backup retention period for RDS (days)"
  type        = number
  default     = 7

  validation {
    condition     = var.database_backup_retention_period >= 0 && var.database_backup_retention_period <= 35
    error_message = "The database_backup_retention_period must be between 0 and 35 days."
  }
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition     = contains(["cache.t3.micro", "cache.t3.small", "cache.t3.medium"], var.redis_node_type)
    error_message = "The redis_node_type must be a valid t3 cache instance class."
  }
}

variable "redis_num_cache_clusters" {
  description = "Number of Redis cache clusters"
  type        = number
  default     = 2

  validation {
    condition     = var.redis_num_cache_clusters >= 1 && var.redis_num_cache_clusters <= 6
    error_message = "The redis_num_cache_clusters must be between 1 and 6."
  }
}

# Storage Configuration
variable "media_storage_size" {
  description = "EFS storage size for media files (GB)"
  type        = number
  default     = 100

  validation {
    condition     = var.media_storage_size >= 1 && var.media_storage_size <= 1000
    error_message = "The media_storage_size must be between 1 and 1000 GB."
  }
}

variable "backup_storage_lifecycle_days" {
  description = "Days before backup files are archived to Glacier"
  type        = number
  default     = 90

  validation {
    condition     = var.backup_storage_lifecycle_days >= 30
    error_message = "The backup_storage_lifecycle_days must be at least 30."
  }
}

# Monitoring and Logging
variable "log_retention_days" {
  description = "CloudWatch log retention period (days)"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 730, 1825, 3653], var.log_retention_days)
    error_message = "The log_retention_days must be a valid CloudWatch retention period."
  }
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring for EKS"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_vpc_flow_logs" {
  description = "Enable VPC flow logs"
  type        = bool
  default     = true
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN gateway"
  type        = bool
  default     = false
}

# Cost Management
variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.cost_center))
    error_message = "The cost_center must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "project_code" {
  description = "Project code for billing"
  type        = string
  default     = "learning-hub"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_code))
    error_message = "The project_code must contain only lowercase letters, numbers, and hyphens."
  }
}

# Application Configuration
variable "django_settings_module" {
  description = "Django settings module"
  type        = string
  default     = "config.settings.production"
}

variable "django_secret_key" {
  description = "Django secret key (generate with: python -c 'import secrets; print(secrets.token_urlsafe(50))')"
  type        = string
  sensitive   = true
}

variable "django_allowed_hosts" {
  description = "Django allowed hosts"
  type        = list(string)
  default     = ["learninghub.com", "www.learninghub.com"]
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["https://learninghub.com", "https://www.learninghub.com"]
}

# Email Configuration
variable "email_host" {
  description = "SMTP server host"
  type        = string
  default     = "smtp.sendgrid.net"
}

variable "email_port" {
  description = "SMTP server port"
  type        = number
  default     = 587

  validation {
    condition     = contains([25, 465, 587, 2525], var.email_port)
    error_message = "The email_port must be a valid SMTP port (25, 465, 587, 2525)."
  }
}

variable "email_from_address" {
  description = "Default from email address"
  type        = string
  default     = "noreply@learninghub.com"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.email_from_address))
    error_message = "The email_from_address must be a valid email address."
  }
}

# Third-party Services
variable "sentry_dsn" {
  description = "Sentry DSN for error tracking"
  type        = string
  default     = ""
  sensitive   = true
}

variable "sentry_traces_sample_rate" {
  description = "Sentry traces sample rate"
  type        = number
  default     = 0.1

  validation {
    condition     = var.sentry_traces_sample_rate >= 0 && var.sentry_traces_sample_rate <= 1
    error_message = "The sentry_traces_sample_rate must be between 0 and 1."
  }
}

variable "google_analytics_id" {
  description = "Google Analytics tracking ID"
  type        = string
  default     = ""

  validation {
    condition     = var.google_analytics_id == "" || can(regex("^G-[A-Z0-9]+$", var.google_analytics_id))
    error_message = "The google_analytics_id must be empty or a valid Google Analytics ID."
  }
}

# Feature Flags
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "enable_container_insights" {
  description = "Enable EKS Container Insights"
  type        = bool
  default     = true
}

variable "enable_autoscaling" {
  description = "Enable horizontal pod autoscaling"
  type        = bool
  default     = true
}

variable "enable_backup_automation" {
  description = "Enable automated backup systems"
  type        = bool
  default     = true
}
