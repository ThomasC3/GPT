### Development
resource "aws_wafv2_web_acl" "dev_us_west_1" {
  provider = aws.us-west-1
  name     = "Development"
  scope    = "REGIONAL"
  default_action {
    allow {

    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "Development"
    sampled_requests_enabled   = false
  }

  rule {
    name     = "GeoLocationAndDDoSBlock"
    priority = 0

    override_action {
      none {}
    }

    statement {
      rule_group_reference_statement {
        arn = aws_wafv2_rule_group.custom_block_us_west_1.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoLocationAndDDoSBlock"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "StopNotFoundOnOlderVersions"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rule_group_reference_statement {
        arn = aws_wafv2_rule_group.custom_block_us_west_2_development.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "StopNotFoundOnOlderVersions"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          name = "NoUserAgent_HEADER"

          action_to_use {
            count {
            }
          }
        }
        rule_action_override {
          name = "SizeRestrictions_BODY"

          action_to_use {
            allow {
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
        rule_action_override {
          name = "AWSManagedIPDDoSList"

          action_to_use {
            block {
            }
          }
        }
      }

    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }
}

resource "aws_wafv2_web_acl_association" "dev_us_west_1" {
  provider     = aws.us-west-1
  resource_arn = aws_lb.dev_us_west_1.arn
  web_acl_arn  = aws_wafv2_web_acl.dev_us_west_1.arn
}

### Staging
resource "aws_wafv2_web_acl" "staging_us_west_1" {
  provider = aws.us-west-1
  name     = "Staging"
  scope    = "REGIONAL"
  default_action {
    allow {

    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "Staging"
    sampled_requests_enabled   = false
  }

  rule {
    name     = "GeoLocationAndDDoSBlock"
    priority = 0

    override_action {
      none {}
    }

    statement {
      rule_group_reference_statement {
        arn = aws_wafv2_rule_group.custom_block_us_west_1.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoLocationAndDDoSBlock"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "StopNotFoundOnOlderVersions"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rule_group_reference_statement {
        arn = aws_wafv2_rule_group.custom_block_us_west_2_staging.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "StopNotFoundOnOlderVersions"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          name = "NoUserAgent_HEADER"

          action_to_use {
            count {
            }
          }
        }
        rule_action_override {
          name = "SizeRestrictions_BODY"

          action_to_use {
            allow {
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
        rule_action_override {
          name = "AWSManagedIPDDoSList"

          action_to_use {
            block {
            }
          }
        }
      }

    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }
}

resource "aws_wafv2_web_acl_association" "staging_us_west_1" {
  provider     = aws.us-west-1
  resource_arn = aws_lb.staging_us_west_1.arn
  web_acl_arn  = aws_wafv2_web_acl.staging_us_west_1.arn
}

### Production
resource "aws_wafv2_web_acl" "production_us_west_1" {
  provider = aws.us-west-1
  name     = "Production"
  scope    = "REGIONAL"
  default_action {
    allow {

    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "Production"
    sampled_requests_enabled   = false
  }

  rule {
    name     = "GeoLocationAndDDoSBlock"
    priority = 0

    override_action {
      none {}
    }

    statement {
      rule_group_reference_statement {
        arn = aws_wafv2_rule_group.custom_block_us_west_1.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoLocationAndDDoSBlock"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "StopNotFoundOnOlderVersions"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rule_group_reference_statement {
        arn = aws_wafv2_rule_group.custom_block_us_west_2_production.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "StopNotFoundOnOlderVersions"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          name = "NoUserAgent_HEADER"

          action_to_use {
            count {
            }
          }
        }
        rule_action_override {
          name = "SizeRestrictions_BODY"

          action_to_use {
            allow {
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
        rule_action_override {
          name = "AWSManagedIPDDoSList"

          action_to_use {
            block {
            }
          }
        }
      }

    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }
}

resource "aws_wafv2_web_acl_association" "production_us_west_1" {
  provider     = aws.us-west-1
  resource_arn = aws_lb.production_us_west_1.arn
  web_acl_arn  = aws_wafv2_web_acl.production_us_west_1.arn
}

resource "aws_cloudwatch_log_group" "production_us_west_1" {
  provider          = aws.us-west-1
  name              = "aws-waf-logs-production-us-west-1"
  retention_in_days = 30
}

resource "aws_wafv2_web_acl_logging_configuration" "production_us_west_1" {
  provider                = aws.us-west-1
  log_destination_configs = [aws_cloudwatch_log_group.production_us_west_1.arn]
  resource_arn            = aws_wafv2_web_acl.production_us_west_1.arn

  logging_filter {
    default_behavior = "DROP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

### Rule groups
resource "aws_wafv2_rule_group" "custom_block_us_west_1" {
  provider = aws.us-west-1
  name     = "GeolocationAndDDoSBlock"
  scope    = "REGIONAL"
  capacity = 100

  lifecycle {
    create_before_destroy = true
  }

  rule {
    name     = "GeoMatch"
    priority = 0

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          not_statement {
            statement {
              geo_match_statement {
                country_codes = [
                  "CA",
                  "CO",
                  "MX",
                  "NG",
                  "PT",
                  "US",
                  "PR",
                ]
              }
            }
          }
        }
        statement {
          not_statement {
            statement {
              or_statement {
                statement {
                  ip_set_reference_statement {
                    arn = aws_wafv2_ip_set.apple_ipv4_us_west_1.arn
                  }
                }
                statement {
                  ip_set_reference_statement {
                    arn = aws_wafv2_ip_set.apple_ipv6_us_west_1.arn
                  }
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoMatch"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "DDoSAttempt"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        aggregate_key_type = "CUSTOM_KEYS"
        limit              = 100

        custom_key {
          uri_path {
            text_transformation {
              priority = 0
              type     = "NORMALIZE_PATH"
            }
          }
        }

        custom_key {
          ip {}
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "DDoSAttempt"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "FaultyUserAgentCheck"
    priority = 2

    action {
      block {}
    }

    statement {
      byte_match_statement {
        positional_constraint = "EXACTLY"
        search_string         = "RiderApp-Prod/10.0.0 (com.thefreeride.app; build:1; iOS 16.6.0) Alamofire/5.6.2"

        field_to_match {
          single_header {
            name = "user-agent"
          }
        }

        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "FaultyUserAgentCheck"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GeoLocationAndDDoSBlockRuleGroup"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_rule_group" "custom_block_us_west_2_development" {
  provider = aws.us-west-1
  name     = "StopNotFoundOnOlderVersions-Development"
  scope    = "REGIONAL"
  capacity = 29

  lifecycle {
    create_before_destroy = true
  }

  rule {
    name     = "OldVersionAndStopEndpoint"
    priority = 0

    action {
      block {
        custom_response {
          custom_response_body_key = "StopNotFound"
          response_code            = 400
        }
      }
    }

    statement {
      and_statement {
        statement {
          not_statement {
            statement {
              regex_pattern_set_reference_statement {
                arn = aws_wafv2_regex_pattern_set.development_app_version_regex_us_west_1.arn
                field_to_match {
                  single_header {
                    name = "x-app-version"
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
          }
        }
        statement {
          byte_match_statement {
            positional_constraint = "EXACTLY"
            search_string         = "/v1/stop"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
        statement {
          byte_match_statement {
            positional_constraint = "ENDS_WITH"
            search_string         = "rider.tfrholdingscorp.com"

            field_to_match {
              single_header {
                name = "host"
              }
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "OldVersionAndStopEndpoint"
      sampled_requests_enabled   = true
    }
  }

  custom_response_body {
    content = jsonencode(
      {
        code    = 400
        message = "Stop not found within service location"
      }
    )
    content_type = "APPLICATION_JSON"
    key          = "StopNotFound"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "StopNotFoundOnOlderVersions"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_rule_group" "custom_block_us_west_2_staging" {
  provider = aws.us-west-1
  name     = "StopNotFoundOnOlderVersions-Staging"
  scope    = "REGIONAL"
  capacity = 29

  lifecycle {
    create_before_destroy = true
  }

  rule {
    name     = "OldVersionAndStopEndpoint"
    priority = 0

    action {
      block {
        custom_response {
          custom_response_body_key = "StopNotFound"
          response_code            = 400
        }
      }
    }

    statement {
      and_statement {
        statement {
          not_statement {
            statement {
              regex_pattern_set_reference_statement {
                arn = aws_wafv2_regex_pattern_set.staging_app_version_regex_us_west_1.arn
                field_to_match {
                  single_header {
                    name = "x-app-version"
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
          }
        }
        statement {
          byte_match_statement {
            positional_constraint = "EXACTLY"
            search_string         = "/v1/stop"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
        statement {
          byte_match_statement {
            positional_constraint = "ENDS_WITH"
            search_string         = "rider.tfrholdingscorp.com"

            field_to_match {
              single_header {
                name = "host"
              }
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "OldVersionAndStopEndpoint"
      sampled_requests_enabled   = true
    }
  }

  custom_response_body {
    content = jsonencode(
      {
        code    = 400
        message = "Stop not found within service location"
      }
    )
    content_type = "APPLICATION_JSON"
    key          = "StopNotFound"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "StopNotFoundOnOlderVersions"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_rule_group" "custom_block_us_west_2_production" {
  provider = aws.us-west-1
  name     = "StopNotFoundOnOlderVersions-Production"
  scope    = "REGIONAL"
  capacity = 29

  lifecycle {
    create_before_destroy = true
  }

  rule {
    name     = "OldVersionAndStopEndpoint"
    priority = 0

    action {
      block {
        custom_response {
          custom_response_body_key = "StopNotFound"
          response_code            = 400
        }
      }
    }

    statement {
      and_statement {
        statement {
          not_statement {
            statement {
              regex_pattern_set_reference_statement {
                arn = aws_wafv2_regex_pattern_set.production_app_version_regex_us_west_1.arn
                field_to_match {
                  single_header {
                    name = "x-app-version"
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
          }
        }
        statement {
          byte_match_statement {
            positional_constraint = "EXACTLY"
            search_string         = "/v1/stop"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
        statement {
          byte_match_statement {
            positional_constraint = "ENDS_WITH"
            search_string         = "rider.tfrholdingscorp.com"

            field_to_match {
              single_header {
                name = "host"
              }
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "OldVersionAndStopEndpoint"
      sampled_requests_enabled   = true
    }
  }

  custom_response_body {
    content = jsonencode(
      {
        code    = 400
        message = "Stop not found within service location"
      }
    )
    content_type = "APPLICATION_JSON"
    key          = "StopNotFound"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "StopNotFoundOnOlderVersions"
    sampled_requests_enabled   = true
  }
}

## Regex pattern sets
resource "aws_wafv2_regex_pattern_set" "development_app_version_regex_us_west_1" {
  provider    = aws.us-west-1
  name        = "development-app-version-regex"
  scope       = "REGIONAL"
  description = "Regex pattern set for development app version"

  regular_expression {
    regex_string = "^(1[5-9](\\.[0-9]+){0,2}|[2-9][0-9](\\.[0-9]+){0,2}|[1-9][0-9]{2,}(\\.[0-9]+){0,2}|14\\.(7(\\.[0-9]+)?|[8-9](\\.[0-9]+)?|[1-9][0-9](\\.[0-9]+)?)?)$"
  }
}

resource "aws_wafv2_regex_pattern_set" "staging_app_version_regex_us_west_1" {
  provider    = aws.us-west-1
  name        = "staging-app-version-regex"
  scope       = "REGIONAL"
  description = "Regex pattern set for staging app version"

  regular_expression {
    regex_string = "^(1[5-9](\\.[0-9]+){0,2}|[2-9][0-9](\\.[0-9]+){0,2}|[1-9][0-9]{2,}(\\.[0-9]+){0,2}|14\\.(7(\\.[0-9]+)?|[8-9](\\.[0-9]+)?|[1-9][0-9](\\.[0-9]+)?)?)$"
  }
}

resource "aws_wafv2_regex_pattern_set" "production_app_version_regex_us_west_1" {
  provider    = aws.us-west-1
  name        = "production-app-version-regex"
  scope       = "REGIONAL"
  description = "Regex pattern set for production app version"

  regular_expression {
    regex_string = "^(1[5-9](\\.[0-9]+){0,2}|[2-9][0-9](\\.[0-9]+){0,2}|[1-9][0-9]{2,}(\\.[0-9]+){0,2}|14\\.(7(\\.[0-9]+)?|[8-9](\\.[0-9]+)?|[1-9][0-9](\\.[0-9]+)?)?)$"
  }
}

### IP sets
resource "aws_wafv2_ip_set" "apple_ipv4_us_west_1" {
  provider           = aws.us-west-1
  name               = "Apple_app_reviewer_ipv4"
  description        = "IPv4 addresses for Apple app review team"
  ip_address_version = "IPV4"
  scope              = "REGIONAL"
  addresses = [
    "17.188.128.0/18",
    "17.188.20.0/23",
    "17.249.0.0/16",
    "17.252.0.0/16",
    "17.57.144.0/22"
  ]
}

resource "aws_wafv2_ip_set" "apple_ipv6_us_west_1" {
  provider           = aws.us-west-1
  name               = "Apple_app_reviewer_ipv6"
  description        = "IPv6 addresses for Apple app review team"
  ip_address_version = "IPV6"
  scope              = "REGIONAL"
  addresses = [
    "2403:0300:0a42:0000:0000:0000:0000:0000/48",
    "2403:0300:0a51:0000:0000:0000:0000:0000/48",
    "2620:0149:0a44:0000:0000:0000:0000:0000/48",
    "2a01:b740:0a42:0000:0000:0000:0000:0000/48"
  ]
}
