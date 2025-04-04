### Global
resource "aws_api_gateway_account" "api_gateway_account" {
  cloudwatch_role_arn = aws_iam_role.locations_api_api_gateway_cloudwatch_role.arn
}

### Development
resource "aws_api_gateway_rest_api" "dev_locations_api" {
  provider = aws.us-east-1
  name     = "locations-api-dev"
}

resource "aws_api_gateway_resource" "dev_locations_api_resource" {
  provider    = aws.us-east-1
  rest_api_id = aws_api_gateway_rest_api.dev_locations_api.id
  parent_id   = aws_api_gateway_rest_api.dev_locations_api.root_resource_id
  path_part   = "locations"
}

resource "aws_api_gateway_method" "dev_locations_api_get" {
  provider         = aws.us-east-1
  rest_api_id      = aws_api_gateway_rest_api.dev_locations_api.id
  resource_id      = aws_api_gateway_resource.dev_locations_api_resource.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "dev_locations_api_lambda_integration" {
  provider                = aws.us-east-1
  rest_api_id             = aws_api_gateway_rest_api.dev_locations_api.id
  resource_id             = aws_api_gateway_resource.dev_locations_api_resource.id
  http_method             = aws_api_gateway_method.dev_locations_api_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.dev_locations_api_lambda_function.invoke_arn
}

resource "aws_api_gateway_deployment" "dev_locations_api_deployment" {
  provider    = aws.us-east-1
  rest_api_id = aws_api_gateway_rest_api.dev_locations_api.id

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "dev_locations_api_stage" {
  provider      = aws.us-east-1
  rest_api_id   = aws_api_gateway_rest_api.dev_locations_api.id
  stage_name    = "dev"
  deployment_id = aws_api_gateway_deployment.dev_locations_api_deployment.id
}

resource "aws_api_gateway_usage_plan" "dev_locations_api_usage_plan" {
  provider = aws.us-east-1
  name     = "dev-locations-api-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.dev_locations_api.id
    stage  = aws_api_gateway_stage.dev_locations_api_stage.stage_name
  }

  quota_settings {
    limit  = 2400
    period = "DAY"
  }

  throttle_settings {
    burst_limit = 1
    rate_limit  = 1
  }
}

### Staging
resource "aws_api_gateway_rest_api" "staging_locations_api" {
  provider = aws.us-east-1
  name     = "locations-api-staging"
}

resource "aws_api_gateway_resource" "staging_locations_api_resource" {
  provider    = aws.us-east-1
  rest_api_id = aws_api_gateway_rest_api.staging_locations_api.id
  parent_id   = aws_api_gateway_rest_api.staging_locations_api.root_resource_id
  path_part   = "locations"
}

resource "aws_api_gateway_method" "staging_locations_api_get" {
  provider         = aws.us-east-1
  rest_api_id      = aws_api_gateway_rest_api.staging_locations_api.id
  resource_id      = aws_api_gateway_resource.staging_locations_api_resource.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "staging_locations_api_lambda_integration" {
  provider                = aws.us-east-1
  rest_api_id             = aws_api_gateway_rest_api.staging_locations_api.id
  resource_id             = aws_api_gateway_resource.staging_locations_api_resource.id
  http_method             = aws_api_gateway_method.staging_locations_api_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.staging_locations_api_lambda_function.invoke_arn
}

resource "aws_api_gateway_deployment" "staging_locations_api_deployment" {
  provider    = aws.us-east-1
  rest_api_id = aws_api_gateway_rest_api.staging_locations_api.id

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "staging_locations_api_stage" {
  provider      = aws.us-east-1
  rest_api_id   = aws_api_gateway_rest_api.staging_locations_api.id
  stage_name    = "staging"
  deployment_id = aws_api_gateway_deployment.staging_locations_api_deployment.id
}

resource "aws_api_gateway_usage_plan" "staging_locations_api_usage_plan" {
  provider = aws.us-east-1
  name     = "staging-locations-api-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.staging_locations_api.id
    stage  = aws_api_gateway_stage.staging_locations_api_stage.stage_name
  }

  quota_settings {
    limit  = 2400
    period = "DAY"
  }

  throttle_settings {
    burst_limit = 1
    rate_limit  = 1
  }
}

### Production
resource "aws_api_gateway_rest_api" "prod_locations_api" {
  provider = aws.us-east-1
  name     = "locations-api-prod"
}

resource "aws_api_gateway_resource" "prod_locations_api_resource" {
  provider    = aws.us-east-1
  rest_api_id = aws_api_gateway_rest_api.prod_locations_api.id
  parent_id   = aws_api_gateway_rest_api.prod_locations_api.root_resource_id
  path_part   = "locations"
}

resource "aws_api_gateway_method" "prod_locations_api_get" {
  provider         = aws.us-east-1
  rest_api_id      = aws_api_gateway_rest_api.prod_locations_api.id
  resource_id      = aws_api_gateway_resource.prod_locations_api_resource.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "prod_locations_api_lambda_integration" {
  provider                = aws.us-east-1
  rest_api_id             = aws_api_gateway_rest_api.prod_locations_api.id
  resource_id             = aws_api_gateway_resource.prod_locations_api_resource.id
  http_method             = aws_api_gateway_method.prod_locations_api_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.prod_locations_api_lambda_function.invoke_arn
}

resource "aws_api_gateway_deployment" "prod_locations_api_deployment" {
  provider    = aws.us-east-1
  rest_api_id = aws_api_gateway_rest_api.prod_locations_api.id

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod_locations_api_stage" {
  provider      = aws.us-east-1
  rest_api_id   = aws_api_gateway_rest_api.prod_locations_api.id
  stage_name    = "prod"
  deployment_id = aws_api_gateway_deployment.prod_locations_api_deployment.id
}

resource "aws_api_gateway_usage_plan" "prod_locations_api_usage_plan" {
  provider = aws.us-east-1
  name     = "prod-locations-api-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.prod_locations_api.id
    stage  = aws_api_gateway_stage.prod_locations_api_stage.stage_name
  }

  quota_settings {
    limit  = 24
    period = "DAY"
  }

  throttle_settings {
    burst_limit = 1
    rate_limit  = 1
  }
}
