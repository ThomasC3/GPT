resource "aws_budgets_budget" "ec2" {
  name       = "Daily Ec2 budget"
  account_id = var.aws_account_id

  budget_type  = "COST"
  limit_amount = "70"
  limit_unit   = "USD"

  time_period_start = "2020-10-08_23:00"
  time_unit         = "DAILY"

  cost_types {
    include_credit = false
    include_refund = false
  }

  cost_filter {
    name   = "BillingEntity"
    values = ["AWS"]
  }

  notification {
    comparison_operator = "GREATER_THAN"
    notification_type   = "ACTUAL"
    threshold           = 110
    threshold_type      = "PERCENTAGE"

    subscriber_email_addresses = var.budget_alarm_recipients
  }
}
