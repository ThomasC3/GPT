locals {
  ec2_instances = concat(
    local.ec2_instances__us_east_1,
    local.ec2_instances__us_west_1
  )
}
