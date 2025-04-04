### Topics
resource "aws_sns_topic" "default_cloudwatch_alarms_topic" {
  name = "Default_CloudWatch_Alarms_Topic"
}

resource "aws_sns_topic" "cloudtrail_alarms_topic" {
  name = "CloudTrail_Alarms_Topic"
}
