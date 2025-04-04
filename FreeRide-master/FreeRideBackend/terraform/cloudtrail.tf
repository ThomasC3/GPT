resource "aws_cloudtrail" "management_events" {
  provider   = aws.us-east-1
  depends_on = [aws_s3_bucket_policy.cloudtrail_bucket_policy]

  name                       = "management-events"
  s3_bucket_name             = aws_s3_bucket.cloudtrail_bucket.id
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail_log_group.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_role.arn
  kms_key_id                 = aws_kms_key.cloudtrail_kms_key.arn

  include_global_service_events = true
  is_multi_region_trail         = true

  advanced_event_selector {
    name = "Management events selector"

    field_selector {
      field = "eventCategory"
      equals = [
        "Management",
      ]
    }
  }
}
