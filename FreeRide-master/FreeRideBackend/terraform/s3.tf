### Development
resource "aws_s3_bucket" "dev_locations_api_deployments" {
  provider = aws.us-east-1
  bucket   = "dev-locations-api-deployments"
}

resource "aws_s3_bucket_versioning" "dev_locations_api_deployments_versioning" {
  provider = aws.us-east-1
  bucket   = aws_s3_bucket.dev_locations_api_deployments.id
  versioning_configuration {
    status = "Enabled"
  }
}

### Staging
resource "aws_s3_bucket" "staging_locations_api_deployments" {
  provider = aws.us-east-1
  bucket   = "staging-locations-api-deployments"
}

resource "aws_s3_bucket_versioning" "staging_locations_api_deployments_versioning" {
  provider = aws.us-east-1
  bucket   = aws_s3_bucket.staging_locations_api_deployments.id
  versioning_configuration {
    status = "Enabled"
  }
}

### Production
resource "aws_s3_bucket" "prod_locations_api_deployments" {
  provider = aws.us-east-1
  bucket   = "prod-locations-api-deployments"
}

resource "aws_s3_bucket_versioning" "prod_locations_api_deployments_versioning" {
  provider = aws.us-east-1
  bucket   = aws_s3_bucket.prod_locations_api_deployments.id
  versioning_configuration {
    status = "Enabled"
  }
}

### Cloudtrail
resource "aws_s3_bucket" "cloudtrail_bucket" {
  provider = aws.us-east-1
  bucket   = "circuit-aws-cloudtrail-logs"
}

resource "aws_s3_bucket_policy" "cloudtrail_bucket_policy" {
  provider = aws.us-east-1
  bucket   = aws_s3_bucket.cloudtrail_bucket.id
  policy   = data.aws_iam_policy_document.cloudtrail_bucket_policy.json
}
