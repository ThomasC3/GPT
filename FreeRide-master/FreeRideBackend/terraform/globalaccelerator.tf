### Development
resource "aws_globalaccelerator_accelerator" "dev_global_1" {
  provider        = aws.us-east-1
  name            = "DEV"
  ip_address_type = "IPV4"
  enabled         = true
}

resource "aws_globalaccelerator_listener" "dev_us_east_1" {
  provider        = aws.us-east-1
  accelerator_arn = aws_globalaccelerator_accelerator.dev_global_1.id
  port_range {
    from_port = 1
    to_port   = 65535
  }
  protocol        = "TCP"
  client_affinity = "SOURCE_IP"
}

resource "aws_globalaccelerator_endpoint_group" "dev_us_east_1" {
  provider              = aws.us-east-1
  listener_arn          = aws_globalaccelerator_listener.dev_us_east_1.id
  endpoint_group_region = "us-east-1"

  health_check_interval_seconds = 30
  health_check_port             = 443

  endpoint_configuration {
    endpoint_id                    = aws_lb.dev_us_east_1.arn
    client_ip_preservation_enabled = true
    weight                         = 128
  }
}

resource "aws_globalaccelerator_endpoint_group" "dev_us_west_1" {
  provider              = aws.us-east-1
  listener_arn          = aws_globalaccelerator_listener.dev_us_east_1.id
  endpoint_group_region = "us-west-1"

  health_check_interval_seconds = 30
  health_check_port             = 443

  endpoint_configuration {
    endpoint_id                    = aws_lb.dev_us_west_1.arn
    client_ip_preservation_enabled = true
    weight                         = 128
  }
}


### Staging
resource "aws_globalaccelerator_accelerator" "staging_global_1" {
  provider        = aws.us-east-1
  name            = "STAGING"
  ip_address_type = "IPV4"
  enabled         = true
}

resource "aws_globalaccelerator_listener" "staging_us_east_1" {
  provider        = aws.us-east-1
  accelerator_arn = aws_globalaccelerator_accelerator.staging_global_1.id
  port_range {
    from_port = 1
    to_port   = 65535
  }
  protocol        = "TCP"
  client_affinity = "SOURCE_IP"
}

resource "aws_globalaccelerator_endpoint_group" "staging_us_east_1" {
  provider              = aws.us-east-1
  listener_arn          = aws_globalaccelerator_listener.staging_us_east_1.id
  endpoint_group_region = "us-east-1"

  health_check_interval_seconds = 30
  health_check_port             = 443

  endpoint_configuration {
    endpoint_id                    = aws_lb.staging_us_east_1.id
    client_ip_preservation_enabled = true
    weight                         = 128
  }
}

resource "aws_globalaccelerator_endpoint_group" "staging_us_west_1" {
  provider              = aws.us-east-1
  listener_arn          = aws_globalaccelerator_listener.staging_us_east_1.id
  endpoint_group_region = "us-west-1"

  health_check_interval_seconds = 30
  health_check_port             = 443

  endpoint_configuration {
    endpoint_id                    = aws_lb.staging_us_west_1.id
    client_ip_preservation_enabled = true
    weight                         = 128
  }
}

### Production
resource "aws_globalaccelerator_accelerator" "production_global_1" {
  provider        = aws.us-east-1
  name            = "PRODUCTION"
  ip_address_type = "IPV4"
  enabled         = true
}

resource "aws_globalaccelerator_listener" "production_us_east_1" {
  provider        = aws.us-east-1
  accelerator_arn = aws_globalaccelerator_accelerator.production_global_1.id
  port_range {
    from_port = 1
    to_port   = 65535
  }
  protocol        = "TCP"
  client_affinity = "SOURCE_IP"
}

resource "aws_globalaccelerator_endpoint_group" "production_us_east_1" {
  provider              = aws.us-east-1
  listener_arn          = aws_globalaccelerator_listener.production_us_east_1.id
  endpoint_group_region = "us-east-1"

  health_check_interval_seconds = 30
  health_check_port             = 443

  endpoint_configuration {
    endpoint_id                    = aws_lb.production_us_east_1.id
    client_ip_preservation_enabled = true
    weight                         = 128
  }
}

resource "aws_globalaccelerator_endpoint_group" "production_us_west_1" {
  provider              = aws.us-east-1
  listener_arn          = aws_globalaccelerator_listener.production_us_east_1.id
  endpoint_group_region = "us-west-1"

  health_check_interval_seconds = 30
  health_check_port             = 443

  endpoint_configuration {
    endpoint_id                    = aws_lb.production_us_west_1.id
    client_ip_preservation_enabled = true
    weight                         = 128
  }
}
