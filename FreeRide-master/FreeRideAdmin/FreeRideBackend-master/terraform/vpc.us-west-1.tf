### VPC
resource "aws_vpc" "default_west_1" {
  provider                             = aws.us-west-1
  cidr_block                           = var.west_vpc_cidr_block
  assign_generated_ipv6_cidr_block     = false
  enable_network_address_usage_metrics = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  instance_tenancy = "default"
}

### Internet Gateway
resource "aws_internet_gateway" "default_west_1" {
  provider = aws.us-west-1
  vpc_id   = aws_vpc.default_west_1.id
}

resource "aws_internet_gateway_attachment" "default_west_1" {
  provider            = aws.us-west-1
  internet_gateway_id = aws_internet_gateway.default_west_1.id
  vpc_id              = aws_vpc.default_west_1.id
}

### Route Tables
resource "aws_route_table" "default_west_1" {
  provider = aws.us-west-1
  vpc_id   = aws_vpc.default_west_1.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.default_west_1.id
  }

  route {
    cidr_block                = var.east_vpc_cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.vpc_peering_us_east_1_us_west_1.id
  }
}

### Subnets
resource "aws_subnet" "subnet_west_1_az1b" {
  provider                = aws.us-west-1
  vpc_id                  = aws_vpc.default_west_1.id
  availability_zone       = "us-west-1b"
  map_public_ip_on_launch = true

  cidr_block                      = "172.32.32.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_west_1_az1b" {
  provider       = aws.us-west-1
  subnet_id      = aws_subnet.subnet_west_1_az1b.id
  route_table_id = aws_route_table.default_west_1.id
}

resource "aws_subnet" "subnet_west_1_az1c" {
  provider                = aws.us-west-1
  vpc_id                  = aws_vpc.default_west_1.id
  availability_zone       = "us-west-1c"
  map_public_ip_on_launch = true

  cidr_block                      = "172.32.0.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_west_1_az1c" {
  provider       = aws.us-west-1
  subnet_id      = aws_subnet.subnet_west_1_az1c.id
  route_table_id = aws_route_table.default_west_1.id
}

### Security Groups
resource "aws_security_group" "default_west_1" {
  provider               = aws.us-west-1
  name                   = "default"
  description            = "default VPC security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "dev_west_1_default" {
  provider               = aws.us-west-1
  name                   = "[DEV] Default Security Group"
  description            = "[DEV] Default Security Group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[DEV] Default Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "dev_west_1_load_balancer" {
  provider               = aws.us-west-1
  name                   = "[DEV] Load Balancer Security Group"
  description            = "[DEV] Load Balancer security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[DEV] Load Balancer Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "dev_west_1_backend" {
  provider               = aws.us-west-1
  name                   = "[DEV] Backend Security Group"
  description            = "[DEV] Backend security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[DEV] Backend Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port = 3000
    to_port   = 3000
    protocol  = "tcp"
    security_groups = [
      aws_security_group.dev_west_1_load_balancer.id
    ]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "dev_west_1_cron" {
  provider               = aws.us-west-1
  name                   = "[DEV] Cron Security Group"
  description            = "[DEV] Cron security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[DEV] Cron Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "staging_west_1_default" {
  provider               = aws.us-west-1
  name                   = "[STAGE] Default Security Group"
  description            = "[STAGE] Default Security Group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[STAGE] Default Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "staging_west_1_load_balancer" {
  provider               = aws.us-west-1
  name                   = "[STAGE] Load Balancer Security Group"
  description            = "[STAGE] Load Balancer security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[STAGE] Load Balancer Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "staging_west_1_backend" {
  provider               = aws.us-west-1
  name                   = "[STAGE] Backend Security Group"
  description            = "[STAGE] Backend security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[STAGE] Backend Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port = 3000
    to_port   = 3000
    protocol  = "tcp"
    security_groups = [
      aws_security_group.staging_west_1_load_balancer.id
    ]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "production_west_1_default" {
  provider               = aws.us-west-1
  name                   = "[PROD] Default Security Group"
  description            = "[PROD] Default security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[PROD] Default Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "production_west_1_load_balancer" {
  provider               = aws.us-west-1
  name                   = "[PROD] Load Balancer Security Group"
  description            = "[PROD] Load Balancer security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[PROD] Load Balancer Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "production_west_1_backend" {
  provider               = aws.us-west-1
  name                   = "[PROD] Backend Security Group"
  description            = "[PROD] Backend security group"
  vpc_id                 = aws_vpc.default_west_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[PROD] Backend Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port = 3000
    to_port   = 3000
    protocol  = "tcp"
    security_groups = [
      aws_security_group.production_west_1_load_balancer.id
    ]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "all"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

### VPC Peering
resource "aws_vpc_peering_connection" "vpc_peering_us_east_1_us_west_1" {
  provider    = aws.us-west-1
  peer_vpc_id = aws_vpc.default_east_1.id
  peer_region = "us-east-1"
  vpc_id      = aws_vpc.default_west_1.id
}
