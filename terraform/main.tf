provider "aws" {
  region = "us-east-1"
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "19.0.0"
  cluster_name    = "learning-hub-god-mode"
  cluster_version = "1.27"

  vpc_id     = "vpc-12345678"
  subnet_ids = ["subnet-abcde001", "subnet-abcde002"]

  eks_managed_node_groups = {
    default = {
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      instance_types = ["t3.medium"]
    }
    gpu_nodes = {
      min_size       = 1
      max_size       = 5
      desired_size   = 1
      instance_types = ["g4dn.xlarge"] # For AI Inference
      labels = {
        role = "ai-inference"
      }
    }
  }
}

resource "aws_ecr_repository" "backend" {
  name = "learning-hub-backend"
}

resource "aws_ecr_repository" "frontend" {
  name = "learning-hub-frontend"
}

resource "aws_s3_bucket" "static_media" {
  bucket = "learning-hub-god-mode-assets"
}

resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.static_media.bucket_regional_domain_name
    origin_id   = "S3-learning-hub-assets"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-learning-hub-assets"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
