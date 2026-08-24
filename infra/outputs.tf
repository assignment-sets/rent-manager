output "bucket_id" {
  description = "The name / ID of the created private S3 bucket"
  value       = aws_s3_bucket.vault.id
}

output "bucket_arn" {
  description = "The Amazon Resource Name (ARN) of the S3 bucket"
  value       = aws_s3_bucket.vault.arn
}

output "bucket_region" {
  description = "The AWS region where the bucket is hosted"
  value       = aws_s3_bucket.vault.region
}
