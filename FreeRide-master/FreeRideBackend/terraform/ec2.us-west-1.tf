### Development
resource "aws_instance" "dev_all_2" {
  provider      = aws.us-west-1
  ami           = "ami-09563a10670fc573c"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Development"
    Name = "[DEV] All Together Now"
  }

  associate_public_ip_address = true
  availability_zone           = "us-west-1b"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit-dev"
  maintenance_options {
    auto_recovery = "default"
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }
  monitoring = true
  subnet_id  = aws_subnet.subnet_west_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.dev_west_1_default.id,
    aws_security_group.dev_west_1_load_balancer.id,
    aws_security_group.dev_west_1_backend.id,
    aws_security_group.dev_west_1_cron.id
  ]

  credit_specification {
    cpu_credits = "standard"
  }
  enclave_options {
    enabled = false
  }
  disable_api_stop        = false
  disable_api_termination = true
  ebs_optimized           = false

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    volume_size           = 30
    volume_type           = "gp3"
  }
}

### Staging
resource "aws_instance" "staging_nginx_2" {
  provider      = aws.us-west-1
  ami           = "ami-09563a10670fc573c"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Staging"
    Name = "[STAGE] Nginx"
  }

  associate_public_ip_address = true
  availability_zone           = "us-west-1b"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit-stage"
  maintenance_options {
    auto_recovery = "default"
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }
  monitoring = true
  subnet_id  = aws_subnet.subnet_west_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.staging_west_1_default.id,
    aws_security_group.staging_west_1_load_balancer.id
  ]

  credit_specification {
    cpu_credits = "standard"
  }
  enclave_options {
    enabled = false
  }
  disable_api_stop        = false
  disable_api_termination = true
  ebs_optimized           = false

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    volume_size           = 30
    volume_type           = "gp3"
  }
}

resource "aws_instance" "staging_backend_2" {
  provider      = aws.us-west-1
  ami           = "ami-09563a10670fc573c"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Staging"
    Name = "[STAGE] Backend Node"
  }

  associate_public_ip_address = true
  availability_zone           = "us-west-1b"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit-stage"
  maintenance_options {
    auto_recovery = "default"
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }
  monitoring = true
  subnet_id  = aws_subnet.subnet_west_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.staging_west_1_default.id,
    aws_security_group.staging_west_1_backend.id
  ]


  credit_specification {
    cpu_credits = "standard"
  }
  enclave_options {
    enabled = false
  }
  disable_api_stop        = false
  disable_api_termination = true
  ebs_optimized           = false

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    volume_size           = 30
    volume_type           = "gp3"
  }
}

### Production
resource "aws_instance" "production_nginx_2" {
  provider      = aws.us-west-1
  ami           = "ami-09563a10670fc573c"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Nginx"
  }

  associate_public_ip_address = true
  availability_zone           = "us-west-1b"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit-prod"
  maintenance_options {
    auto_recovery = "default"
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }
  monitoring = true
  subnet_id  = aws_subnet.subnet_west_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_west_1_default.id,
    aws_security_group.production_west_1_load_balancer.id
  ]


  credit_specification {
    cpu_credits = "standard"
  }
  enclave_options {
    enabled = false
  }
  disable_api_stop        = false
  disable_api_termination = true
  ebs_optimized           = false

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    volume_size           = 64
    volume_type           = "gp3"
    tags = {
      Name = "Nginx"
    }
  }
}

resource "aws_instance" "production_backend_5" {
  provider      = aws.us-west-1
  ami           = "ami-09563a10670fc573c"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Backend Node First"
  }

  associate_public_ip_address = true
  availability_zone           = "us-west-1b"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit-prod"
  maintenance_options {
    auto_recovery = "default"
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }
  monitoring = true
  subnet_id  = aws_subnet.subnet_west_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_west_1_default.id,
    aws_security_group.production_west_1_backend.id
  ]

  credit_specification {
    cpu_credits = "standard"
  }
  enclave_options {
    enabled = false
  }
  disable_api_stop        = false
  disable_api_termination = true
  ebs_optimized           = false

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    volume_size           = 64
    volume_type           = "gp3"
  }
}

resource "aws_instance" "production_backend_6" {
  provider      = aws.us-west-1
  ami           = "ami-09563a10670fc573c"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Backend Node Second"
  }

  associate_public_ip_address = true
  availability_zone           = "us-west-1c"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit-prod"
  maintenance_options {
    auto_recovery = "default"
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }
  monitoring = true
  subnet_id  = aws_subnet.subnet_west_1_az1c.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_west_1_default.id,
    aws_security_group.production_west_1_backend.id
  ]

  credit_specification {
    cpu_credits = "standard"
  }
  enclave_options {
    enabled = false
  }
  disable_api_stop        = false
  disable_api_termination = true
  ebs_optimized           = false

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    volume_size           = 64
    volume_type           = "gp3"
  }
}

resource "aws_instance" "production_admin_backend_2" {
  provider      = aws.us-west-1
  ami           = "ami-09563a10670fc573c"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Admin Backend Node"
  }

  associate_public_ip_address = true
  availability_zone           = "us-west-1c"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit-prod"
  maintenance_options {
    auto_recovery = "default"
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }
  monitoring = true
  subnet_id  = aws_subnet.subnet_west_1_az1c.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_west_1_default.id,
    aws_security_group.production_west_1_backend.id
  ]

  credit_specification {
    cpu_credits = "standard"
  }
  enclave_options {
    enabled = false
  }
  disable_api_stop        = false
  disable_api_termination = true
  ebs_optimized           = false

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    volume_size           = 64
    volume_type           = "gp3"
  }
}

locals {
  ec2_instances__us_west_1 = [
    # Development
    {
      id          = aws_instance.dev_all_2.id,
      label       = "[Development] [us-west-1] All Together Now",
      environment = "development"
    },
    # Staging
    {
      id          = aws_instance.staging_nginx_2.id,
      label       = "[Staging] [us-west-1] Nginx",
      environment = "stage"
    },
    {
      id          = aws_instance.staging_backend_2.id,
      label       = "[Staging] [us-west-1] Backend Node",
      environment = "stage"
    },
    # Production
    {
      id          = aws_instance.production_nginx_2.id,
      label       = "[Production] [us-west-1] Nginx",
      environment = "production"
    },
    {
      id          = aws_instance.production_backend_5.id,
      label       = "[Production] [us-west-1] Backend Node First",
      environment = "production"
    },
    {
      id          = aws_instance.production_backend_6.id,
      label       = "[Production] [us-west-1] Backend Node Second",
      environment = "production"
    },
    {
      id          = aws_instance.production_admin_backend_2.id,
      label       = "[Production] [us-west-1] Admin Backend Node",
      environment = "production"
    }
  ]
}
