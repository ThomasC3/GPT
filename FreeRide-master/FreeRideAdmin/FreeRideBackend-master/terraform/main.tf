terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.75.0"
      configuration_aliases = [aws.us-east-1, aws.us-west-1]
    }

    godaddy = {
      source  = "n3integration/godaddy"
      version = "1.9.1"
    }
  }

  backend "s3" {}
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us-west-1"
  region = "us-west-1"
}

provider "godaddy" {
  key    = var.godaddy_api_key
  secret = var.godaddy_api_secret
}
