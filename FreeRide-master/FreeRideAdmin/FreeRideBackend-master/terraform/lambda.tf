### Development
resource "aws_lambda_function" "dev_locations_api_lambda_function" {
  provider      = aws.us-east-1
  function_name = "dev-locations-api"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.dev_locations_api_lambda_role.arn
  s3_bucket     = aws_s3_bucket.dev_locations_api_deployments.id
  s3_key        = "lambda_function.zip"
  timeout       = 15

  lifecycle {
    ignore_changes = [environment]
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_permission" "dev_locations_api_api_gateway_permission" {
  provider      = aws.us-east-1
  statement_id  = "AllowExecutionFromAPIGateway-development"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dev_locations_api_lambda_function.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dev_locations_api.execution_arn}/*"
}

### Staging
resource "aws_lambda_function" "staging_locations_api_lambda_function" {
  provider      = aws.us-east-1
  function_name = "staging-locations-api"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.staging_locations_api_lambda_role.arn
  s3_bucket     = aws_s3_bucket.staging_locations_api_deployments.id
  s3_key        = "lambda_function.zip"
  timeout       = 15

  lifecycle {
    ignore_changes = [environment]
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_permission" "staging_locations_api_api_gateway_permission" {
  provider      = aws.us-east-1
  statement_id  = "AllowExecutionFromAPIGateway-staging"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.staging_locations_api_lambda_function.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.staging_locations_api.execution_arn}/*"
}

### Production
resource "aws_lambda_function" "prod_locations_api_lambda_function" {
  provider      = aws.us-east-1
  function_name = "prod-locations-api"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.prod_locations_api_lambda_role.arn
  s3_bucket     = aws_s3_bucket.prod_locations_api_deployments.id
  s3_key        = "lambda_function.zip"
  timeout       = 15

  lifecycle {
    ignore_changes = [environment]
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_permission" "prod_locations_api_api_gateway_permission" {
  provider      = aws.us-east-1
  statement_id  = "AllowExecutionFromAPIGateway-production"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.prod_locations_api_lambda_function.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.prod_locations_api.execution_arn}/*"
}
