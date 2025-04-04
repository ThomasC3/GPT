### Development
resource "aws_lb" "dev_us_east_1" {
  provider           = aws.us-east-1
  name               = "dev-us-east-1"
  internal           = true
  load_balancer_type = "application"

  enable_deletion_protection = true

  security_groups = [
    aws_security_group.dev_east_1_load_balancer.id
  ]
  subnets = [
    aws_subnet.subnet_east_1_az1a.id,
    aws_subnet.subnet_east_1_az1b.id,
    aws_subnet.subnet_east_1_az1c.id,
    aws_subnet.subnet_east_1_az1d.id,
    aws_subnet.subnet_east_1_az1e.id,
    aws_subnet.subnet_east_1_az1f.id
  ]
  tags = {
    ENV = "Development"
  }
}

resource "aws_lb_listener" "dev_us_east_1" {
  provider          = aws.us-east-1
  load_balancer_arn = aws_lb.dev_us_east_1.arn
  protocol          = "HTTPS"
  port              = 443
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn.us_east_1

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dev_us_east_1.arn
  }
}

resource "aws_lb_target_group" "dev_us_east_1" {
  provider    = aws.us-east-1
  name        = "dev-us-east-1"
  target_type = "instance"
  port        = 443
  protocol    = "HTTPS"
  vpc_id      = aws_vpc.default_east_1.id

  health_check {
    enabled  = true
    protocol = "HTTPS"
    port     = 443
    path     = "/"
  }
}

resource "aws_lb_target_group_attachment" "dev_us_east_1" {
  provider         = aws.us-east-1
  target_group_arn = aws_lb_target_group.dev_us_east_1.arn
  target_id        = aws_instance.dev_all_1.id
  port             = 443
}

### Staging
resource "aws_lb" "staging_us_east_1" {
  provider           = aws.us-east-1
  name               = "staging-us-east-1"
  internal           = true
  load_balancer_type = "application"

  enable_deletion_protection = true

  security_groups = [
    aws_security_group.staging_east_1_load_balancer.id
  ]
  subnets = [
    aws_subnet.subnet_east_1_az1a.id,
    aws_subnet.subnet_east_1_az1b.id,
    aws_subnet.subnet_east_1_az1c.id,
    aws_subnet.subnet_east_1_az1d.id,
    aws_subnet.subnet_east_1_az1e.id,
    aws_subnet.subnet_east_1_az1f.id
  ]
  tags = {
    ENV = "Staging"
  }
}

resource "aws_lb_listener" "staging_us_east_1" {
  provider          = aws.us-east-1
  load_balancer_arn = aws_lb.staging_us_east_1.arn
  protocol          = "HTTPS"
  port              = 443
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn.us_east_1

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.staging_us_east_1.arn
  }
}

resource "aws_lb_target_group" "staging_us_east_1" {
  provider    = aws.us-east-1
  name        = "staging-us-east-1"
  target_type = "instance"
  port        = 443
  protocol    = "HTTPS"
  vpc_id      = aws_vpc.default_east_1.id

  health_check {
    enabled  = true
    protocol = "HTTPS"
    port     = 443
    path     = "/"
  }
}

resource "aws_lb_target_group_attachment" "staging_us_east_1" {
  provider         = aws.us-east-1
  target_group_arn = aws_lb_target_group.staging_us_east_1.arn
  target_id        = aws_instance.staging_nginx_1.id
  port             = 443
}

### Production
resource "aws_lb" "production_us_east_1" {
  provider           = aws.us-east-1
  name               = "production-us-east-1"
  internal           = true
  load_balancer_type = "application"

  enable_deletion_protection = true

  security_groups = [
    aws_security_group.production_east_1_load_balancer.id
  ]
  subnets = [
    aws_subnet.subnet_east_1_az1a.id,
    aws_subnet.subnet_east_1_az1b.id,
    aws_subnet.subnet_east_1_az1c.id,
    aws_subnet.subnet_east_1_az1d.id,
    aws_subnet.subnet_east_1_az1e.id,
    aws_subnet.subnet_east_1_az1f.id
  ]
  tags = {
    ENV = "Production"
  }
}

resource "aws_lb_listener" "production_us_east_1" {
  provider          = aws.us-east-1
  load_balancer_arn = aws_lb.production_us_east_1.arn
  protocol          = "HTTPS"
  port              = 443
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn.us_east_1

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.production_us_east_1.arn
  }
}

resource "aws_lb_target_group" "production_us_east_1" {
  provider    = aws.us-east-1
  name        = "production-us-east-1"
  target_type = "instance"
  port        = 443
  protocol    = "HTTPS"
  vpc_id      = aws_vpc.default_east_1.id

  health_check {
    enabled  = true
    protocol = "HTTPS"
    port     = 443
    path     = "/"
  }
}

resource "aws_lb_target_group_attachment" "production_us_east_1" {
  provider         = aws.us-east-1
  target_group_arn = aws_lb_target_group.production_us_east_1.arn
  target_id        = aws_instance.prod_nginx_1.id
  port             = 443
}
