### Dashboards
resource "aws_cloudwatch_dashboard" "development" {
  provider       = aws.us-east-1
  dashboard_name = "Development"
  dashboard_body = templatefile("${path.module}/widgets.tftpl", { data : merge(var.dashboard_data.development, { elbs : { east : aws_lb.dev_us_east_1, west : aws_lb.dev_us_west_1 } }) })
}

resource "aws_cloudwatch_dashboard" "staging" {
  provider       = aws.us-east-1
  dashboard_name = "Staging"
  dashboard_body = templatefile("${path.module}/widgets.tftpl", { data : merge(var.dashboard_data.staging, { elbs : { east : aws_lb.staging_us_east_1, west : aws_lb.staging_us_west_1 } }) })
}

resource "aws_cloudwatch_dashboard" "production" {
  provider       = aws.us-east-1
  dashboard_name = "Production"
  dashboard_body = templatefile("${path.module}/widgets.tftpl", { data : merge(var.dashboard_data.production, { elbs : { east : aws_lb.production_us_east_1, west : aws_lb.production_us_west_1 } }) })
}

### Log Groups
resource "aws_cloudwatch_log_group" "cloudtrail_log_group" {
  provider          = aws.us-east-1
  name              = "aws-cloudtrail-logs"
  retention_in_days = 30
}

### Log Metric Filters
resource "aws_cloudwatch_log_metric_filter" "production_total_requests" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "${each.value}TotalRequests"
  pattern        = "[host, logName, user, timestamp, request, statusCode=*, size]"
  log_group_name = "${each.key}_nginx_access"

  metric_transformation {
    name          = "Total Requests"
    namespace     = "Nginx (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "production_success_requests" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "${each.value}SuccessRequests"
  pattern        = "[host, logName, user, timestamp, request, statusCode=1* || statusCode=2* || statusCode=3*, size]"
  log_group_name = "${each.key}_nginx_access"

  metric_transformation {
    name          = "Success"
    namespace     = "Nginx (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "production_client_errors" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "${each.value}ClientErrors"
  pattern        = "[host, logName, user, timestamp, request, statusCode=4*, size]"
  log_group_name = "${each.key}_nginx_access"

  metric_transformation {
    name          = "Client Errors"
    namespace     = "Nginx (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "production_server_errors" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "${each.value}ServerErrors"
  pattern        = "[host, logName, user, timestamp, request, statusCode=5*, size]"
  log_group_name = "${each.key}_nginx_access"

  metric_transformation {
    name          = "Server Errors"
    namespace     = "Nginx (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "graphhopper_credits" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "GraphHopper Credits ${each.value}"
  pattern        = "{$.GH_X_RateLimit_Credits=*}"
  log_group_name = "${each.key}_lambda_out"

  metric_transformation {
    name          = "Credits"
    namespace     = "GraphHopper (${title(each.key)})"
    value         = "$.GH_X_RateLimit_Credits"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "driver_finder_request_duration" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "DriverFinder Request Duration ${each.value}"
  pattern        = "[req, ip, user=\"()\", v1, v2, v3, v4, v5, time, method=POST || method=GET, path, g1, g2, size, s1, s2, duration, ...]"
  log_group_name = "${each.key}_lambda_out"

  metric_transformation {
    name      = "Request Duration"
    namespace = "DriverFinder (${title(each.key)})"
    value     = "$duration"
    unit      = "Milliseconds"
  }
}

resource "aws_cloudwatch_log_metric_filter" "total_websocket_messages" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Total Websocket messages ${each.value}"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type,...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Total count"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_authenticate" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - authenticate"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"authenticate\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - authenticate"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_ride_driver_moved" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - ride-driver-moved"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"ride-driver-moved\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - ride-driver-moved"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_ride_request_received" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - ride-request-received"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"ride-request-received\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - ride-request-received"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_ride_request_received_ack" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - ride-request-received-ack"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"ride-request-received-ack\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - ride-request-received-ack"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_ride_message" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - ride-message"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"ride-message\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - ride-message"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_ride_request_call" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - ride-request-call"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"ride-request-call\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - ride-request-call"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_ride_cancel" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - ride-cancel"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"ride-cancel\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - ride-cancel"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_request_completed" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - request-completed"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"request-completed\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - request-completed"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "websocket_messages_ride_updates" {
  provider       = aws.us-east-1
  for_each       = { development = "Development", stage = "Staging", production = "Production" }
  name           = "Websocket messages ${each.value} - ride-updates"
  pattern        = "[date,hour,msec,timestamp,source=\"socket.io\",type=\"ride-updates\",...]"
  log_group_name = "${each.key}_web_out"

  metric_transformation {
    name          = "Count - ride-updates"
    namespace     = "Websocket messages (${title(each.key)})"
    value         = "1"
    default_value = "0"
  }
}

#### CIS Benchmark

resource "aws_cloudwatch_log_metric_filter" "unauthorized_api_calls" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Unauthorized API Calls"
  pattern        = "{($.errorCode = \"*UnauthorizedOperation\" || $.errorCode = \"AccessDenied*\") && ($.sourceIPAddress != \"delivery.logs.amazonaws.com\") && ($.eventName != \"HeadBucket\")}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Unauthorized API Calls"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "no_mfa_console_signin" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] No MFA Console Signin"
  pattern        = "{$.eventName=ConsoleLogin && $.additionalEventData.MFAUsed!=Yes && $.userIdentity.type=IAMUser && $.responseElements.ConsoleLogin=Success}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "No MFA Console Signin"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "root_account_usage" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Root Account Usage"
  pattern        = "{$.userIdentity.type=\"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType !=\"AwsServiceEvent\"}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Root Account Usage"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "iam_policy_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] IAM Policy Changes"
  pattern        = "{($.eventName=DeleteGroupPolicy)||($.eventName=DeleteRolePolicy)||($.eventName=DeleteUserPolicy)||($.eventName=PutGroupPolicy)||($.eventName=PutRolePolicy)||($.eventName=PutUserPolicy)||($.eventName=CreatePolicy)||($.eventName=DeletePolicy)||($.eventName=CreatePolicyVersion)||($.eventName=DeletePolicyVersion)||($.eventName=AttachRolePolicy)||($.eventName=DetachRolePolicy)||($.eventName=AttachUserPolicy)||($.eventName=DetachUserPolicy)||($.eventName=AttachGroupPolicy)||($.eventName=DetachGroupPolicy)}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "IAM Policy Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "cloudtrail_cfg_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] CloudTrail Configuration Changes"
  pattern        = "{($.eventName = CreateTrail) || ($.eventName = UpdateTrail) || ($.eventName = DeleteTrail) || ($.eventName = StartLogging) || ($.eventName = StopLogging)}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "CloudTrail Configuration Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "console_signin_failure" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Console Signin Failure"
  pattern        = "{($.eventName = ConsoleLogin) && ($.errorMessage = \"Failed authentication\")}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Console Signin Failure"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "disable_or_delete_cmk_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Disable or Delete CMK Changes"
  pattern        = "{($.eventSource = kms.amazonaws.com) && (($.eventName=DisableKey)||($.eventName=ScheduleKeyDeletion))}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Disable or Delete CMK Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "s3_bucket_policy_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] S3 Bucket Policy Changes"
  pattern        = "{($.eventSource = s3.amazonaws.com) && (($.eventName = PutBucketAcl) || ($.eventName = PutBucketPolicy) || ($.eventName = PutBucketCors) || ($.eventName = PutBucketLifecycle) || ($.eventName = PutBucketReplication) || ($.eventName = DeleteBucketPolicy) || ($.eventName = DeleteBucketCors) || ($.eventName = DeleteBucketLifecycle) || ($.eventName = DeleteBucketReplication))}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "S3 Bucket Policy Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "config_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Config Changes"
  pattern        = "{($.eventSource = config.amazonaws.com) && (($.eventName=StopConfigurationRecorder)||($.eventName=DeleteDeliveryChannel)||($.eventName=PutDeliveryChannel)||($.eventName=PutConfigurationRecorder))}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Config Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "security_group_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Security Group Changes"
  pattern        = "{($.eventName=AuthorizeSecurityGroupIngress) || ($.eventName=AuthorizeSecurityGroupEgress) || ($.eventName=RevokeSecurityGroupIngress) || ($.eventName=RevokeSecurityGroupEgress) || ($.eventName=CreateSecurityGroup) || ($.eventName=DeleteSecurityGroup)}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Security Group Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "nacl_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] NACL Changes"
  pattern        = "{($.eventName=CreateNetworkAcl) || ($.eventName=CreateNetworkAclEntry) || ($.eventName=DeleteNetworkAcl) || ($.eventName=DeleteNetworkAclEntry) || ($.eventName=ReplaceNetworkAclEntry) ||($.eventName=ReplaceNetworkAclAssociation)}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "NACL Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "network_gateway_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Network Gateway Changes"
  pattern        = "{($.eventName=CreateCustomerGateway) || ($.eventName=DeleteCustomerGateway) || ($.eventName=AttachInternetGateway) || ($.eventName=CreateInternetGateway) || ($.eventName=DeleteInternetGateway) || ($.eventName=DetachInternetGateway)}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Network Gateway Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "route_table_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Route Table Changes"
  pattern        = "{($.eventName=CreateRoute) || ($.eventName=CreateRouteTable) || ($.eventName=ReplaceRoute) || ($.eventName=ReplaceRouteTableAssociation) || ($.eventName=DeleteRouteTable) || ($.eventName=DeleteRoute) || ($.eventName=DisassociateRouteTable)}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Route Table Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "vpc_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] VPC Changes"
  pattern        = "{($.eventName=CreateVpc) || ($.eventName=DeleteVpc) || ($.eventName=ModifyVpcAttribute) || ($.eventName=AcceptVpcPeeringConnection) || ($.eventName=CreateVpcPeeringConnection) || ($.eventName=DeleteVpcPeeringConnection) || ($.eventName=RejectVpcPeeringConnection) || ($.eventName=AttachClassicLinkVpc) ||($.eventName=DetachClassicLinkVpc) || ($.eventName=DisableVpcClassicLink) || ($.eventName=EnableVpcClassicLink)}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "VPC Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "organizations_changes" {
  provider       = aws.us-east-1
  name           = "[CIS Benchmark] Organizations Changes"
  pattern        = "{($.eventSource=organizations.amazonaws.com) && (($.eventName=AcceptHandshake) || ($.eventName=AttachPolicy) ||($.eventName=CreateAccount) || ($.eventName=CreateOrganizationalUnit)|| ($.eventName=CreatePolicy) || ($.eventName=DeclineHandshake) ||($.eventName=DeleteOrganization) || ($.eventName=DeleteOrganizationalUnit) || ($.eventName=DeletePolicy) || ($.eventName=DetachPolicy) || ($.eventName=DisablePolicyType) || ($.eventName=EnablePolicyType) || ($.eventName=InviteAccountToOrganization) || ($.eventName=LeaveOrganization) || ($.eventName=MoveAccount) || ($.eventName=RemoveAccountFromOrganization) || ($.eventName=UpdatePolicy) || ($.eventName=UpdateOrganizationalUnit))}"
  log_group_name = "aws-cloudtrail-logs"

  metric_transformation {
    name          = "Organizations Changes"
    namespace     = "CISBenchmark"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

### Alarms
resource "aws_cloudwatch_metric_alarm" "rebroadcast_count_alarm" {
  provider            = aws.us-east-1
  for_each            = { stage = "Staging", production = "Production" }
  alarm_name          = "[${each.value}] High Driver ReBroadcast count"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "2"
  evaluation_periods  = "5"
  threshold           = "10"
  alarm_description   = "Too many calls to Driver ReBroadcast method"
  treat_missing_data  = "notBreaching"

  alarm_actions = [
    aws_sns_topic.default_cloudwatch_alarms_topic.arn
  ]

  metric_query {
    id          = "e1"
    expression  = "SUM(METRICS())"
    label       = "Driver ReBroadcast calls"
    return_data = "true"
  }

  dynamic "metric_query" {
    for_each = var.dashboard_data[lower(each.value)]["working_sets"]
    content {
      id          = metric_query.value.name
      return_data = "false"
      metric {
        metric_name = "driverReBroadcastMetric"
        namespace   = "circuit/${each.key}/requestProcessor/${metric_query.value.name}"
        period      = "60"
        stat        = "Sum"
        unit        = "Count"
        dimensions = {
          "requestProcessorId" = "main"
        }
      }
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "elasticache_high_memory_percentage_alarm" {
  provider            = aws.us-east-1
  for_each            = { development = "Development", stage = "Staging", production = "Production" }
  alarm_name          = "[${each.value}] Elasticache High Memory Percentage"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "2"
  evaluation_periods  = "5"
  threshold           = "20"
  alarm_description   = "Elasticache memory usage spikes"
  treat_missing_data  = "notBreaching"

  alarm_actions = [
    aws_sns_topic.default_cloudwatch_alarms_topic.arn
  ]

  metric_query {
    id          = "e1"
    expression  = "MAX(METRICS())"
    label       = "Elasticache Memory Percentage"
    return_data = "true"
  }

  dynamic "metric_query" {
    for_each = var.dashboard_data[lower(each.value)]["elasticache_nodes"]
    content {
      id          = "m${metric_query.key}"
      return_data = "false"
      metric {
        metric_name = "DatabaseMemoryUsagePercentage"
        namespace   = "AWS/ElastiCache"
        period      = "60"
        stat        = "Average"
        dimensions = {
          "CacheClusterId" = metric_query.value.id,
          "CacheNodeId"    = metric_query.value.node_id
        }
      }
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "elasticache_network_bandwidth_out_allowance_exceeded_alarm" {
  provider            = aws.us-east-1
  for_each            = { development = "Development", stage = "Staging", production = "Production" }
  alarm_name          = "[${each.value}] Elasticache Bandwidth Allowance Exceeded"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "2"
  evaluation_periods  = "5"
  threshold           = "15000"
  alarm_description   = "Elasticache network usage spikes"
  treat_missing_data  = "notBreaching"

  alarm_actions = [
    aws_sns_topic.default_cloudwatch_alarms_topic.arn
  ]

  metric_query {
    id          = "e1"
    expression  = "MAX(METRICS())"
    label       = "Elasticache Network Out Allowance Exceeded"
    return_data = "true"
  }

  dynamic "metric_query" {
    for_each = var.dashboard_data[lower(each.value)]["elasticache_nodes"]
    content {
      id          = "m${metric_query.key}"
      return_data = "false"
      metric {
        metric_name = "NetworkBandwidthOutAllowanceExceeded"
        namespace   = "AWS/ElastiCache"
        period      = "60"
        stat        = "Average"
        dimensions = {
          "CacheClusterId" = metric_query.value.id,
          "CacheNodeId"    = metric_query.value.node_id
        }
      }
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "driver_searcher_stopped_alarm" {
  provider            = aws.us-east-1
  alarm_name          = "[Production] Driver Searcher Stopped"
  comparison_operator = "LessThanThreshold"
  datapoints_to_alarm = "2"
  evaluation_periods  = "5"
  threshold           = "0"
  alarm_description   = "Driver Searcher Timing equal to 0"
  treat_missing_data  = "breaching"

  alarm_actions = [
    aws_sns_topic.default_cloudwatch_alarms_topic.arn
  ]

  metric_query {
    id          = "e1"
    expression  = "MIN(METRICS())"
    label       = "Driver Searcher Timing"
    return_data = "true"
  }

  dynamic "metric_query" {
    for_each = var.dashboard_data["production"]["working_sets"]
    content {
      id          = "m${metric_query.key}"
      return_data = "false"
      metric {
        metric_name = "driverSearchTimingMetric"
        namespace   = "circuit/production/requestProcessor/${metric_query.value.name}"
        period      = "60"
        stat        = "Minimum"
        dimensions = {
          "requestProcessorId" = "main"
        }
      }
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_cpu_usage_limit" {
  provider = aws.us-east-1
  for_each = {
    for index, instance in local.ec2_instances :
    instance.id => instance
  }
  alarm_name          = "${each.value.label} CPU limit"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "2"
  evaluation_periods  = "5"
  threshold           = "80"
  alarm_description   = "EC2 CPU Usage too high for ${each.key}"
  treat_missing_data  = "notBreaching"

  metric_name = "cpu_usage_active"
  namespace   = "CWAgent"
  period      = "60"
  statistic   = "Average"
  dimensions = {
    "InstanceId"  = each.key,
    "Environment" = each.value.environment,
    "cpu"         = "cpu-total"
  }

  alarm_actions = [
    aws_sns_topic.default_cloudwatch_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "ec2_ram_usage_limit" {
  provider = aws.us-east-1
  for_each = {
    for index, instance in local.ec2_instances :
    instance.id => instance
  }
  alarm_name          = "${each.value.label} RAM limit"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "2"
  evaluation_periods  = "5"
  threshold           = "2000000000"
  alarm_description   = "EC2 RAM Usage too high for ${each.key}"
  treat_missing_data  = "notBreaching"

  metric_name = "mem_used"
  namespace   = "CWAgent"
  period      = "60"
  statistic   = "Average"
  dimensions = {
    "InstanceId"  = each.key,
    "Environment" = each.value.environment
  }

  alarm_actions = [
    aws_sns_topic.default_cloudwatch_alarms_topic.arn
  ]
}

#### CIS Benchmark Alarms

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_unauthorized_api_calls" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Unauthorized API Calls"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Unauthorized API calls detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Unauthorized API Calls"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_no_mfa_console_signin" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] No MFA Console Signin"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "No MFA console signin detected"
  treat_missing_data  = "notBreaching"

  metric_name = "No MFA Console Signin"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_root_account_usage" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Root Account Usage"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Root account usage detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Root Account Usage"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_iam_policy_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] IAM Policy Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "IAM policy changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "IAM Policy Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_cloudtrail_cfg_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] CloudTrail Configuration Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "CloudTrail configuration changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "CloudTrail Configuration Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_console_signin_failure" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Console Signin Failure"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Console signin failure detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Console Signin Failure"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_disable_or_delete_cmk_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Disable or Delete CMK Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Disable or delete CMK changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Disable or Delete CMK Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_s3_bucket_policy_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] S3 Bucket Policy Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "S3 bucket policy changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "S3 Bucket Policy Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_config_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Config Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Config changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Config Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_security_group_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Security Group Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Security group changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Security Group Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_nacl_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] NACL Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "NACL changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "NACL Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_network_gateway_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Network Gateway Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Network Gateway changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Network Gateway Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_route_table_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Route Table Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Route Table changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Route Table Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_vpc_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] VPC Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "VPC changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "VPC Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}

resource "aws_cloudwatch_metric_alarm" "cis_benchmark_organizations_changes" {
  provider            = aws.us-east-1
  alarm_name          = "[CIS Benchmark] Organizations Changes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  threshold           = "1"
  alarm_description   = "Organizations changes detected"
  treat_missing_data  = "notBreaching"

  metric_name = "Organizations Changes"
  namespace   = "CISBenchmark"
  period      = "300"
  statistic   = "Sum"
  dimensions  = {}

  alarm_actions = [
    aws_sns_topic.cloudtrail_alarms_topic.arn
  ]
}
