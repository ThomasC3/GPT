### VPC
resource "aws_vpc" "default_east_1" {
  provider                             = aws.us-east-1
  cidr_block                           = var.east_vpc_cidr_block
  assign_generated_ipv6_cidr_block     = false
  enable_network_address_usage_metrics = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  instance_tenancy = "default"
}

### Internet Gateway
resource "aws_internet_gateway" "default_east_1" {
  provider = aws.us-east-1
  vpc_id   = aws_vpc.default_east_1.id
}

resource "aws_internet_gateway_attachment" "default_east_1" {
  provider            = aws.us-east-1
  internet_gateway_id = aws_internet_gateway.default_east_1.id
  vpc_id              = aws_vpc.default_east_1.id
}

### Route Tables
resource "aws_route_table" "default_east_1" {
  provider = aws.us-east-1
  vpc_id   = aws_vpc.default_east_1.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.default_east_1.id
  }

  route {
    cidr_block                = var.west_vpc_cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.vpc_peering_us_east_1_us_west_1.id
  }
}

### Subnets
resource "aws_subnet" "subnet_east_1_az1a" {
  provider                = aws.us-east-1
  vpc_id                  = aws_vpc.default_east_1.id
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  cidr_block                      = "172.31.16.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_east_1_az1a" {
  provider       = aws.us-east-1
  subnet_id      = aws_subnet.subnet_east_1_az1a.id
  route_table_id = aws_route_table.default_east_1.id
}

resource "aws_subnet" "subnet_east_1_az1b" {
  provider                = aws.us-east-1
  vpc_id                  = aws_vpc.default_east_1.id
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true

  cidr_block                      = "172.31.32.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_east_1_az1b" {
  provider       = aws.us-east-1
  subnet_id      = aws_subnet.subnet_east_1_az1b.id
  route_table_id = aws_route_table.default_east_1.id
}

resource "aws_subnet" "subnet_east_1_az1c" {
  provider                = aws.us-east-1
  vpc_id                  = aws_vpc.default_east_1.id
  availability_zone       = "us-east-1c"
  map_public_ip_on_launch = true

  cidr_block                      = "172.31.0.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_east_1_az1c" {
  provider       = aws.us-east-1
  subnet_id      = aws_subnet.subnet_east_1_az1c.id
  route_table_id = aws_route_table.default_east_1.id
}

resource "aws_subnet" "subnet_east_1_az1d" {
  provider                = aws.us-east-1
  vpc_id                  = aws_vpc.default_east_1.id
  availability_zone       = "us-east-1d"
  map_public_ip_on_launch = true

  cidr_block                      = "172.31.80.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_east_1_az1d" {
  provider       = aws.us-east-1
  subnet_id      = aws_subnet.subnet_east_1_az1d.id
  route_table_id = aws_route_table.default_east_1.id
}

resource "aws_subnet" "subnet_east_1_az1e" {
  provider                = aws.us-east-1
  vpc_id                  = aws_vpc.default_east_1.id
  availability_zone       = "us-east-1e"
  map_public_ip_on_launch = true

  cidr_block                      = "172.31.64.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_east_1_az1e" {
  provider       = aws.us-east-1
  subnet_id      = aws_subnet.subnet_east_1_az1e.id
  route_table_id = aws_route_table.default_east_1.id
}

resource "aws_subnet" "subnet_east_1_az1f" {
  provider                = aws.us-east-1
  vpc_id                  = aws_vpc.default_east_1.id
  availability_zone       = "us-east-1f"
  map_public_ip_on_launch = true

  cidr_block                      = "172.31.48.0/20"
  ipv6_native                     = false
  assign_ipv6_address_on_creation = false

  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
}

resource "aws_route_table_association" "subnet_east_1_az1f" {
  provider       = aws.us-east-1
  subnet_id      = aws_subnet.subnet_east_1_az1f.id
  route_table_id = aws_route_table.default_east_1.id
}

### Security Groups
resource "aws_security_group" "default_east_1" {
  provider               = aws.us-east-1
  name                   = "default"
  description            = "default VPC security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "dev_east_1_default" {
  provider               = aws.us-east-1
  name                   = "[DEV] Default Security Group"
  description            = "[DEV] Default Security Group"
  vpc_id                 = aws_vpc.default_east_1.id
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

resource "aws_security_group" "dev_east_1_load_balancer" {
  provider               = aws.us-east-1
  name                   = "[DEV] Load Balancer Security Group"
  description            = "[DEV] Load Balancer security group"
  vpc_id                 = aws_vpc.default_east_1.id
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

resource "aws_security_group" "dev_east_1_backend" {
  provider               = aws.us-east-1
  name                   = "[DEV] Backend Security Group"
  description            = "[DEV] Backend security group"
  vpc_id                 = aws_vpc.default_east_1.id
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
      aws_security_group.dev_east_1_load_balancer.id
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

resource "aws_security_group" "dev_east_1_cron" {
  provider               = aws.us-east-1
  name                   = "[DEV] Cron Security Group"
  description            = "[DEV] Cron security group"
  vpc_id                 = aws_vpc.default_east_1.id
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

resource "aws_security_group" "dev_east_1_elasticache" {
  provider               = aws.us-east-1
  name                   = "[DEV] Elasticache Security Group"
  description            = "[DEV] Elasticache security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[DEV] Elasticache Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    security_groups = [
      aws_security_group.dev_east_1_default.id
    ]
  }

  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    cidr_blocks = [
      var.west_vpc_cidr_block
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

resource "aws_security_group" "dev_east_1_driver_finder" {
  provider               = aws.us-east-1
  name                   = "[DEV] Driver Finder Security Group"
  description            = "[DEV] Driver Finder security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[DEV] Driver Finder Security Group"
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
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
    security_groups = [
      aws_security_group.dev_east_1_default.id
    ]
  }

  ingress {
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
    cidr_blocks = [
      var.west_vpc_cidr_block
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

resource "aws_security_group" "staging_east_1_default" {
  provider               = aws.us-east-1
  name                   = "[STAGE] Default Security Group"
  description            = "[STAGE] Default Security Group"
  vpc_id                 = aws_vpc.default_east_1.id
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

resource "aws_security_group" "staging_east_1_load_balancer" {
  provider               = aws.us-east-1
  name                   = "[STAGE] Load Balancer Security Group"
  description            = "[STAGE] Load Balancer security group"
  vpc_id                 = aws_vpc.default_east_1.id
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

resource "aws_security_group" "staging_east_1_backend" {
  provider               = aws.us-east-1
  name                   = "[STAGE] Backend Security Group"
  description            = "[STAGE] Backend security group"
  vpc_id                 = aws_vpc.default_east_1.id
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
      aws_security_group.staging_east_1_load_balancer.id
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

resource "aws_security_group" "staging_east_1_cron" {
  provider               = aws.us-east-1
  name                   = "[STAGE] Cron Security Group"
  description            = "[STAGE] Cron security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[STAGE] Cron Security Group"
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

resource "aws_security_group" "staging_east_1_elasticache" {
  provider               = aws.us-east-1
  name                   = "[STAGE] Elasticache Security Group"
  description            = "[STAGE] Elasticache security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[STAGE] Elasticache Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    security_groups = [
      aws_security_group.staging_east_1_default.id
    ]
  }

  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    cidr_blocks = [
      var.west_vpc_cidr_block
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

resource "aws_security_group" "staging_east_1_driver_finder" {
  provider               = aws.us-east-1
  name                   = "[STAGE] Driver Finder Security Group"
  description            = "[STAGE] Driver Finder security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[STAGE] Driver Finder Security Group"
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
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
    security_groups = [
      aws_security_group.staging_east_1_default.id
    ]
  }

  ingress {
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
    cidr_blocks = [
      var.west_vpc_cidr_block
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

resource "aws_security_group" "production_east_1_default" {
  provider               = aws.us-east-1
  name                   = "[PROD] Default Security Group"
  description            = "[PROD] Default security group"
  vpc_id                 = aws_vpc.default_east_1.id
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

resource "aws_security_group" "production_east_1_load_balancer" {
  provider               = aws.us-east-1
  name                   = "[PROD] Load Balancer Security Group"
  description            = "[PROD] Load Balancer security group"
  vpc_id                 = aws_vpc.default_east_1.id
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

resource "aws_security_group" "production_east_1_backend" {
  provider               = aws.us-east-1
  name                   = "[PROD] Backend Security Group"
  description            = "[PROD] Backend security group"
  vpc_id                 = aws_vpc.default_east_1.id
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
      aws_security_group.production_east_1_load_balancer.id
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

resource "aws_security_group" "production_east_1_cron" {
  provider               = aws.us-east-1
  name                   = "[PROD] Cron Security Group"
  description            = "[PROD] Cron security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[PROD] Cron Security Group"
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

resource "aws_security_group" "production_east_1_elasticache" {
  provider               = aws.us-east-1
  name                   = "[PROD] Elasticache Security Group"
  description            = "[PROD] Elasticache security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[PROD] Elasticache Security Group"
  }

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    security_groups = [
      aws_security_group.production_east_1_default.id
    ]
  }

  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    cidr_blocks = [
      var.west_vpc_cidr_block
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

resource "aws_security_group" "production_east_1_driver_finder" {
  provider               = aws.us-east-1
  name                   = "[PROD] Driver Finder Security Group"
  description            = "[PROD] Driver Finder security group"
  vpc_id                 = aws_vpc.default_east_1.id
  revoke_rules_on_delete = false

  tags = {
    Name = "[PROD] Driver Finder Security Group"
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
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
    security_groups = [
      aws_security_group.production_east_1_default.id
    ]
  }

  ingress {
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
    cidr_blocks = [
      var.west_vpc_cidr_block
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
resource "aws_vpc_peering_connection_accepter" "vpc_peering_us_east_1_us_west_1" {
  provider                  = aws.us-east-1
  vpc_peering_connection_id = aws_vpc_peering_connection.vpc_peering_us_east_1_us_west_1.id
  auto_accept               = true
}
