variable "aws_region" {
  description = "Target AWS region for the S3 vault"
  type        = string
  default     = "ap-south-1"
}

variable "bucket_name" {
  description = "Globally unique name for the private S3 bucket"
  type        = string
}

variable "environment" {
  description = "Environment tag (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "allowed_cors_origins" {
  description = "List of frontend origins allowed by CORS"
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:3000"]
}
