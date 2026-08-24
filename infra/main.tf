# 1. Private S3 Bucket for Document Vault
resource "aws_s3_bucket" "vault" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Strict 100% Public Access Block (Zero Direct Public Internet Access)
resource "aws_s3_bucket_public_access_block" "vault_pab" {
  bucket = aws_s3_bucket.vault.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. Bucket Ownership Controls
resource "aws_s3_bucket_ownership_controls" "vault_ownership" {
  bucket = aws_s3_bucket.vault.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# 4. CORS Configuration for Frontend (localhost:5173 / localhost:3000)
resource "aws_s3_bucket_cors_configuration" "vault_cors" {
  bucket = aws_s3_bucket.vault.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.allowed_cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# 5. Server-Side Encryption at Rest (AES256 Default)
resource "aws_s3_bucket_server_side_encryption_configuration" "vault_encryption" {
  bucket = aws_s3_bucket.vault.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 6. Bucket Versioning (Protects legal documents from accidental overwrites)
resource "aws_s3_bucket_versioning" "vault_versioning" {
  bucket = aws_s3_bucket.vault.id

  versioning_configuration {
    status = "Enabled"
  }
}
