variable "dashboard_data" {
  type = map(object({
    stage = string
    machines = list(object({
      id    = string
      label = string
      types = list(string)
    }))
    elasticache_nodes = list(object({
      id      = string
      node_id = string
    }))
    working_sets = list(object({
      name = string
    }))
    waf = object({
      name = string
      rule_groups = list(object({
        name  = string
        label = string
      }))
    })
  }))
  default = {
    "local" = {
      stage = "local",
      machines = [
        {
          id    = ""
          label = "Localhost: "
          types = ["nginx", "cron", "backend"]
        }
      ],
      elasticache_nodes = [
        {
          id      = "local-freeride-redis-001",
          node_id = "0001"
        }
      ],
      working_sets = [],
      waf = {
        name = "Local",
        rule_groups = [
          { name = "AWSManagedRulesCommonRuleSet", label = "Common Rules" },
          { name = "AWSManagedRulesKnownBadInputsRuleSet", label = "Bad Inputs" },
          { name = "AWSManagedRulesAmazonIpReputationList", label = "IP Reputation" }
        ]
      }
    }
  }
}

variable "godaddy_api_key" {
  type        = string
  sensitive   = true
  description = "API key to use when making requests to GoDaddy"
  nullable    = false
}

variable "godaddy_api_secret" {
  type        = string
  sensitive   = true
  description = "API secret to use when making requests to GoDaddy"
  nullable    = false
}

variable "acm_certificate_arn" {
  type = object({
    us_east_1 = string
    us_west_1 = string
  })
  description = "ARNs of the SSL certificates to be used"
  nullable    = false
}

variable "west_vpc_cidr_block" {
  type        = string
  description = "CIDR block for the VPC in us-west-1"
  nullable    = false
  default     = "172.32.0.0/16"
}
variable "east_vpc_cidr_block" {
  type        = string
  description = "CIDR block for the VPC in us-east-1"
  nullable    = false
  default     = "172.31.0.0/16"
}

variable "aws_account_id" {
  type        = string
  description = "The AWS account ID"
  nullable    = false
}

variable "budget_alarm_recipients" {
  type        = list(string)
  description = "Email addresses to notify when the budget is exceeded"
  nullable    = false
  default     = []
}
