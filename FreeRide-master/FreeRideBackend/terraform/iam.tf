### Locations API
#### Development
resource "aws_iam_role" "dev_locations_api_lambda_role" {
  provider = aws.us-east-1
  name     = "LocationsAPILambdaRole-development"
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "lambda.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "dev_locations_api_lambda_policy" {
  provider = aws.us-east-1
  name     = "LocationsAPILambdaPolicy-development"
  role     = aws_iam_role.dev_locations_api_lambda_role.id

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource" : "arn:aws:logs:*:*:*"
      },
      {
        "Effect" : "Allow",
        "Action" : "lambda:InvokeFunction",
        "Resource" : [
          aws_lambda_function.dev_locations_api_lambda_function.arn
        ]
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "execute-api:Invoke"
        ],
        "Resource" : "arn:aws:execute-api:*:*:*"
      }
    ]
  })
}

#### Staging
resource "aws_iam_role" "staging_locations_api_lambda_role" {
  provider = aws.us-east-1
  name     = "LocationsAPILambdaRole-staging"
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "lambda.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "staging_locations_api_lambda_policy" {
  provider = aws.us-east-1
  name     = "LocationsAPILambdaPolicy-staging"
  role     = aws_iam_role.staging_locations_api_lambda_role.id

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource" : "arn:aws:logs:*:*:*"
      },
      {
        "Effect" : "Allow",
        "Action" : "lambda:InvokeFunction",
        "Resource" : [
          aws_lambda_function.staging_locations_api_lambda_function.arn
        ]
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "execute-api:Invoke"
        ],
        "Resource" : "arn:aws:execute-api:*:*:*"
      }
    ]
  })
}

#### Production
resource "aws_iam_role" "prod_locations_api_lambda_role" {
  provider = aws.us-east-1
  name     = "LocationsAPILambdaRole-production"
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "lambda.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "prod_locations_api_lambda_policy" {
  provider = aws.us-east-1
  name     = "LocationsAPILambdaPolicy-production"
  role     = aws_iam_role.prod_locations_api_lambda_role.id

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource" : "arn:aws:logs:*:*:*"
      },
      {
        "Effect" : "Allow",
        "Action" : "lambda:InvokeFunction",
        "Resource" : [
          aws_lambda_function.prod_locations_api_lambda_function.arn
        ]
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "execute-api:Invoke"
        ],
        "Resource" : "arn:aws:execute-api:*:*:*"
      }
    ]
  })
}

### Global
resource "aws_iam_role" "locations_api_api_gateway_cloudwatch_role" {
  provider = aws.us-east-1
  name     = "APIGatewayCloudWatchLogsRole"

  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "apigateway.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "locations_api_api_gateway_cloudwatch_policy" {
  provider = aws.us-east-1
  name     = "APIGatewayCloudWatchLogsPolicy"
  role     = aws_iam_role.locations_api_api_gateway_cloudwatch_role.id

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
          "logs:CreateLogDelivery",
          "logs:PutResourcePolicy",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:DescribeResourcePolicies",
          "logs:GetLogDelivery",
          "logs:ListLogDeliveries"
        ],
        "Resource" : "*"
      }
    ]
  })
}

### Cloudtrail
resource "aws_iam_role" "cloudtrail_role" {
  provider    = aws.us-east-1
  name        = "CloudTrailRoleForCloudWatchLogs_management-events"
  description = "Role for config CloudWathLogs for trail management-events"
  path        = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_policy" "cloudtrail_role_policy" {
  provider    = aws.us-east-1
  name        = "Cloudtrail-CW-access-policy-management-events"
  description = "Policy for config CloudWathLogs for trail management-events, created by CloudTrail console"
  path        = "/service-role/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogStream",
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:logs:us-east-1:${var.aws_account_id}:log-group:aws-cloudtrail-logs:log-stream:${var.aws_account_id}_CloudTrail_us-east-1*",
        ]
        Sid = "AWSCloudTrailCreateLogStream2014110"
      },
      {
        Action = [
          "logs:PutLogEvents",
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:logs:us-east-1:${var.aws_account_id}:log-group:aws-cloudtrail-logs:log-stream:${var.aws_account_id}_CloudTrail_us-east-1*",
        ]
        Sid = "AWSCloudTrailPutLogEvents20141101"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cloudtrail_role_policy_attachment" {
  role       = aws_iam_role.cloudtrail_role.name
  policy_arn = aws_iam_policy.cloudtrail_role_policy.arn
}

data "aws_iam_policy_document" "cloudtrail_bucket_policy" {
  statement {
    sid    = "AWSCloudTrailAclCheck20150319"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.cloudtrail_bucket.arn]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = ["arn:aws:cloudtrail:us-east-1:${var.aws_account_id}:trail/management-events"]
    }
  }

  statement {
    sid    = "AWSCloudTrailWrite20150319"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cloudtrail_bucket.arn}/AWSLogs/${var.aws_account_id}/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = ["arn:aws:cloudtrail:us-east-1:${var.aws_account_id}:trail/management-events"]
    }
  }
}
