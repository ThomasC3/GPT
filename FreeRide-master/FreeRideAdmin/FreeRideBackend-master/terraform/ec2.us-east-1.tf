### Development
resource "aws_instance" "dev_all_1" {
  provider      = aws.us-east-1
  ami           = "ami-0729e439b6769d6ab"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Development"
    Name = "[DEV] All Together Now"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1d"
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
  subnet_id  = aws_subnet.subnet_east_1_az1d.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.dev_east_1_default.id,
    aws_security_group.dev_east_1_load_balancer.id,
    aws_security_group.dev_east_1_backend.id,
    aws_security_group.dev_east_1_cron.id,
    aws_security_group.dev_east_1_driver_finder.id
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
resource "aws_instance" "staging_nginx_1" {
  provider      = aws.us-east-1
  ami           = "ami-0729e439b6769d6ab"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Staging"
    Name = "[STAGE] Nginx"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1a"
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
  subnet_id  = aws_subnet.subnet_east_1_az1a.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.staging_east_1_default.id,
    aws_security_group.staging_east_1_load_balancer.id
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

resource "aws_instance" "staging_backend_1" {
  provider      = aws.us-east-1
  ami           = "ami-00ddb0e5626798373"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Staging"
    Name = "[STAGE] Backend Node"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1d"
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
  subnet_id  = aws_subnet.subnet_east_1_az1d.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.staging_east_1_default.id,
    aws_security_group.staging_east_1_backend.id
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
    volume_size           = 16
    volume_type           = "gp3"
  }
}

resource "aws_instance" "staging_cron_1" {
  provider      = aws.us-east-1
  ami           = "ami-04b9e92b5572fa0d1"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Staging"
    Name = "[STAGE] Cron"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1d"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit"
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
  subnet_id  = aws_subnet.subnet_east_1_az1d.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.staging_east_1_default.id,
    aws_security_group.staging_east_1_cron.id
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
    volume_size           = 16
    volume_type           = "gp3"
    tags = {
      Name = "CronStage"
    }
  }
}

resource "aws_instance" "staging_lambda_1" {
  provider      = aws.us-east-1
  ami           = "ami-0729e439b6769d6ab"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Staging"
    Name = "[STAGE] Driver Finder"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1a"
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
  subnet_id  = aws_subnet.subnet_east_1_az1a.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.staging_east_1_default.id,
    aws_security_group.staging_east_1_driver_finder.id
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
resource "aws_instance" "prod_nginx_1" {
  provider      = aws.us-east-1
  ami           = "ami-0ac019f4fcb7cb7e6"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Nginx SSL"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1d"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "freeride"
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
  subnet_id  = aws_subnet.subnet_east_1_az1d.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_east_1_default.id,
    aws_security_group.production_east_1_load_balancer.id
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
    volume_size           = 200
    volume_type           = "gp3"
    tags = {
      Name = "Nginx SSL"
      name = "load balancer"
    }
  }
}

resource "aws_instance" "prod_backend_1" {
  provider      = aws.us-east-1
  ami           = "ami-0ac019f4fcb7cb7e6"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Backend Node"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1d"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "freeride"
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
  subnet_id  = aws_subnet.subnet_east_1_az1d.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_east_1_default.id,
    aws_security_group.production_east_1_backend.id
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
    volume_size           = 200
    volume_type           = "gp3"
    tags = {
      Name = "App nodejs"
    }
  }
}

resource "aws_instance" "prod_backend_2" {
  provider      = aws.us-east-1
  ami           = "ami-0ac019f4fcb7cb7e6"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Backend Node Second"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1d"
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
  subnet_id  = aws_subnet.subnet_east_1_az1d.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_east_1_default.id,
    aws_security_group.production_east_1_backend.id
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

resource "aws_instance" "prod_cron_1" {
  provider      = aws.us-east-1
  ami           = "ami-04b9e92b5572fa0d1"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Cron"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1b"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit"
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
  subnet_id  = aws_subnet.subnet_east_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_east_1_default.id,
    aws_security_group.production_east_1_cron.id
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
    volume_size           = 16
    volume_type           = "gp3"
    tags = {
      ENV = "PROD"
    }
  }
}

resource "aws_instance" "prod_cron_2" {
  provider      = aws.us-east-1
  ami           = "ami-0729e439b6769d6ab"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Cron 2"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1b"
  user_data_replace_on_change = false
  get_password_data           = false
  host_id                     = ""
  host_resource_group_arn     = ""
  iam_instance_profile        = "CloudWatchAgentServerRole"
  key_name                    = "circuit"
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
  subnet_id  = aws_subnet.subnet_east_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_east_1_default.id,
    aws_security_group.production_east_1_cron.id
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
    volume_size           = 32
    volume_type           = "gp3"
  }
}

resource "aws_instance" "prod_lambda_1" {
  provider      = aws.us-east-1
  ami           = "ami-0729e439b6769d6ab"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Driver Finder"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1b"
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
  subnet_id  = aws_subnet.subnet_east_1_az1b.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_east_1_default.id,
    aws_security_group.production_east_1_driver_finder.id
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

resource "aws_instance" "prod_admin_backend_1" {
  provider      = aws.us-east-1
  ami           = "ami-00ddb0e5626798373"
  instance_type = "t3.medium"
  tags = {
    ENV  = "Production"
    Name = "[PROD] Admin Backend Node"
  }

  associate_public_ip_address = true
  availability_zone           = "us-east-1f"
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
  subnet_id  = aws_subnet.subnet_east_1_az1f.id
  tenancy    = "default"
  vpc_security_group_ids = [
    aws_security_group.production_east_1_default.id,
    aws_security_group.production_east_1_backend.id
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
    volume_size           = 24
    volume_type           = "gp3"
  }
}

locals {
  ec2_instances__us_east_1 = [
    # Development
    {
      id          = aws_instance.dev_all_1.id,
      label       = "[Development] [us-east-1] All Together Now"
      environment = "development"
    },
    # Staging
    {
      id          = aws_instance.staging_nginx_1.id,
      label       = "[Staging] [us-east-1] Nginx"
      environment = "stage"
    },
    {
      id          = aws_instance.staging_backend_1.id,
      label       = "[Staging] [us-east-1] Backend Node"
      environment = "stage"
    },
    {
      id          = aws_instance.staging_cron_1.id,
      label       = "[Staging] [us-east-1] Cron"
      environment = "stage"
    },
    {
      id          = aws_instance.staging_lambda_1.id,
      label       = "[Staging] [us-east-1] Driver Finder"
      environment = "stage"
    },
    # Production
    {
      id          = aws_instance.prod_nginx_1.id,
      label       = "[Production] [us-east-1] Nginx"
      environment = "production"
    },
    {
      id          = aws_instance.prod_backend_1.id,
      label       = "[Production] [us-east-1] Backend Node"
      environment = "production"
    },
    {
      id          = aws_instance.prod_backend_2.id,
      label       = "[Production] [us-east-1] Backend Node Second"
      environment = "production"
    },
    {
      id          = aws_instance.prod_cron_1.id,
      label       = "[Production] [us-east-1] Cron"
      environment = "production"
    },
    {
      id          = aws_instance.prod_cron_2.id,
      label       = "[Production] [us-east-1] Cron 2"
      environment = "production"
    },
    {
      id          = aws_instance.prod_lambda_1.id,
      label       = "[Production] [us-east-1] Driver Finder"
      environment = "production"
    },
    {
      id          = aws_instance.prod_admin_backend_1.id,
      label       = "[Production] [us-east-1] Admin Backend Node"
      environment = "production"
    }
  ]
}
