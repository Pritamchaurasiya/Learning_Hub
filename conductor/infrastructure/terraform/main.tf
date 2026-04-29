# Terraform Infrastructure as Code
# Learning Hub Platform - AWS Infrastructure

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket = "learning-hub-terraform-state"
    key    = "production/terraform.tfstate"
    region = var.aws_region
    encrypt = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Learning Hub"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "learning-hub-cluster"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "learninghub.com"
}

# Random resources
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# VPC Configuration
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Name = "${var.cluster_name}-vpc"
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.28"
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  cluster_endpoint_public_access = true
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  node_groups = {
    general = {
      desired_capacity = 3
      max_capacity     = 6
      min_capacity     = 3

      instance_types = ["t3.medium"]
      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "general"
      }
    }

    system = {
      desired_capacity = 2
      max_capacity     = 3
      min_capacity     = 1

      instance_types = ["t3.small"]
      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "system"
      }
      taints = {
        dedicated = {
          key    = "system"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }

  cluster_security_group_additional_rules = {
    ingress_nodes_443 = {
      description                = "Node groups to API server 443"
      protocol                   = "tcp"
      from_port                  = 443
      to_port                    = 443
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  tags = {
    Name = var.cluster_name
  }
}

# EFS for shared storage
resource "aws_efs_file_system" "learning_hub" {
  creation_token = "learning-hub-efs-${random_string.suffix.result}"
  
  tags = {
    Name = "learning-hub-efs"
  }
}

resource "aws_efs_mount_target" "learning_hub" {
  count = length(module.vpc.private_subnets)
  
  file_system_id  = aws_efs_file_system.learning_hub.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs_sg.id]
}

# Security Group for EFS
resource "aws_security_group" "efs_sg" {
  name        = "learning-hub-efs-sg"
  description = "Security group for EFS"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "learning-hub-efs-sg"
  }
}

# RDS PostgreSQL
resource "aws_db_subnet_group" "learning_hub" {
  name       = "learning-hub-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "learning-hub-db-subnet-group"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "learning-hub-rds-sg"
  description = "Security group for RDS"
  vpc_id      = module.vpc.vpc.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "learning-hub-rds-sg"
  }
}

resource "aws_db_instance" "learning_hub" {
  identifier = "learning-hub-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted    = true
  storage_type          = "gp2"
  
  db_name  = "learninghub"
  username = "learninghub"
  password = random_password.db_password.result
  
  db_subnet_group_name = aws_db_subnet_group.learning_hub.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot       = false
  final_snapshot_identifier = "learning-hub-final-snapshot-${random_string.suffix.result}"
  
  deletion_protection = true
  
  tags = {
    Name = "learning-hub-rds"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "learning_hub" {
  name       = "learning-hub-cache-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis_sg" {
  name        = "learning-hub-redis-sg"
  description = "Security group for Redis"
  vpc_id      = module.vpc.vpc.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "learning-hub-redis-sg"
  }
}

resource "aws_elasticache_replication_group" "learning_hub" {
  replication_group_id       = "learning-hub-redis"
  description                = "Redis cluster for Learning Hub"
  
  node_type                  = "cache.t3.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  
  subnet_group_name = aws_elasticache_subnet_group.learning_hub.name
  security_group_ids = [aws_security_group.redis_sg.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  
  tags = {
    Name = "learning-hub-redis"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 64
  special = false
}

# S3 Buckets
resource "aws_s3_bucket" "learning_hub_media" {
  bucket = "learning-hub-media-${random_string.suffix.result}"
  
  tags = {
    Name = "learning-hub-media"
  }
}

resource "aws_s3_bucket_versioning" "learning_hub_media" {
  bucket = aws_s3_bucket.learning_hub_media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "learning_hub_media" {
  bucket = aws_s3_bucket.learning_hub_media.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "learning_hub_media" {
  bucket = aws_s3_bucket.learning_hub_media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "learning_hub_backups" {
  bucket = "learning-hub-backups-${random_string.suffix.result}"
  
  tags = {
    Name = "learning-hub-backups"
  }
}

resource "aws_s3_bucket_versioning" "learning_hub_backups" {
  bucket = aws_s3_bucket.learning_hub_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "learning_hub_backups" {
  bucket = aws_s3_bucket.learning_hub_backups.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "learning_hub_backups" {
  bucket = aws_s3_bucket.learning_hub_backups.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555  # 7 years
    }
  }
}

# Route53 DNS
resource "aws_route53_zone" "learning_hub" {
  name = var.domain_name
}

resource "aws_route53_record" "learning_hub_a" {
  zone_id = aws_route53_zone.learning_hub.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.eks.cluster_endpoint
    zone_id               = module.eks.cluster_endpoint
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "learning_hub_www" {
  zone_id = aws_route53_zone.learning_hub.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}

# Certificate Manager
resource "aws_acm_certificate" "learning_hub" {
  domain_name = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  
  validation_method = "DNS"

  tags = {
    Name = "learning-hub-certificate"
  }
}

resource "aws_route53_record" "learning_hub_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.learning_hub.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name          = each.value.name
  records       = [each.value.record]
  ttl           = 60
  type          = each.value.type
  zone_id       = aws_route53_zone.learning_hub.zone_id
}

resource "aws_acm_certificate_validation" "learning_hub" {
  certificate_arn         = aws_acm_certificate.learning_hub.arn
  validation_record_fqdns = [for record in aws_route53_record.learning_hub_cert_validation : record.fqdn]
}

# Helm Chart Deployment
resource "helm_release" "learning_hub" {
  name       = "learning-hub"
  repository = "https://learning-hub.github.io/helm-charts"
  chart      = "learning-hub"
  version    = "1.0.0"
  namespace  = "learning-hub"

  set {
    name  = "image.tag"
    value = "latest"
  }

  set {
    name  = "ingress.enabled"
    value = "true"
  }

  set {
    name  = "ingress.hosts[0].host"
    value = var.domain_name
  }

  set {
    name  = "ingress.tls[0].hosts[0]"
    value = var.domain_name
  }

  set {
    name  = "ingress.tls[0].secretName"
    value = "learning-hub-tls"
  }

  set {
    name  = "postgresql.enabled"
    value = "false"
  }

  set {
    name  = "redis.enabled"
    value = "false"
  }

  set {
    name  = "externalDatabase.host"
    value = aws_db_instance.learning_hub.address
  }

  set {
    name  = "externalDatabase.password"
    value = random_password.db_password.result
  }

  set {
    name  = "externalRedis.host"
    value = aws_elasticache_replication_group.learning_hub.primary_endpoint_address
  }

  set {
    name  = "externalRedis.password"
    value = random_password.redis_auth_token.result
  }

  depends_on = [
    aws_acm_certificate_validation.learning_hub
  ]
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "learning_hub" {
  name              = "/aws/eks/${var.cluster_name}/containers"
  retention_in_days = 30

  tags = {
    Name = "learning-hub-logs"
  }
}

# IAM Roles for Service Accounts
resource "aws_iam_role" "learning_hub_irsa" {
  name = "learning-hub-irsa"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:learning-hub:learning-hub"
          }
        }
      }
    ]
  })

  tags = {
    Name = "learning-hub-irsa"
  }
}

resource "aws_iam_role_policy_attachment" "learning_hub_s3" {
  role       = aws_iam_role.learning_hub_irsa.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "learning_hub_ses" {
  role       = aws_iam_role.learning_hub_irsa.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSESFullAccess"
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "database_host" {
  description = "RDS database host"
  value       = aws_db_instance.learning_hub.address
  sensitive   = true
}

output "database_password" {
  description = "RDS database password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "redis_host" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.learning_hub.primary_endpoint_address
}

output "redis_password" {
  description = "Redis auth token"
  value       = random_password.redis_auth_token.result
  sensitive   = true
}

output "media_bucket" {
  description = "S3 bucket for media files"
  value       = aws_s3_bucket.learning_hub_media.id
}

output "backup_bucket" {
  description = "S3 bucket for backups"
  value       = aws_s3_bucket.learning_hub_backups.id
}
