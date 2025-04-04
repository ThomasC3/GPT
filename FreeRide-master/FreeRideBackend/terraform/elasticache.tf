resource "aws_elasticache_replication_group" "development" {
  provider                = aws.us-east-1
  description             = "FreeRide Redis For Dev environment"
  replication_group_id    = "dev-freeride-redis"
  num_node_groups         = "1"
  replicas_per_node_group = "1"

  automatic_failover_enabled = true
  engine                     = "redis"
  engine_version             = "7.0"
  parameter_group_name       = "default.redis7"
  auto_minor_version_upgrade = "true"
  node_type                  = "cache.t3.micro"
  maintenance_window         = "mon:09:00-mon:12:00"
  snapshot_retention_limit   = 1
  snapshot_window            = "08:00-09:00"

  at_rest_encryption_enabled = "false"
  transit_encryption_enabled = "false"

  security_group_ids = [
    aws_security_group.dev_east_1_elasticache.id
  ]
}

resource "aws_elasticache_replication_group" "staging" {
  provider                = aws.us-east-1
  description             = "FreeRide Redis For Dev and Stage environments"
  replication_group_id    = "stage-freeride-redis"
  num_node_groups         = "1"
  replicas_per_node_group = "1"

  automatic_failover_enabled = true
  engine                     = "redis"
  engine_version             = "7.0"
  parameter_group_name       = "default.redis7"
  auto_minor_version_upgrade = "true"
  node_type                  = "cache.t3.micro"
  maintenance_window         = "mon:09:00-mon:12:00"
  snapshot_retention_limit   = 1
  snapshot_window            = "08:00-09:00"

  at_rest_encryption_enabled = "false"
  transit_encryption_enabled = "false"

  security_group_ids = [
    aws_security_group.staging_east_1_elasticache.id
  ]
}

resource "aws_elasticache_replication_group" "production" {
  provider                = aws.us-east-1
  description             = " Redis on EC for FreeRide Production"
  replication_group_id    = "production-freeride-redis-v2"
  num_node_groups         = "1"
  replicas_per_node_group = "2"

  automatic_failover_enabled = true
  engine                     = "redis"
  engine_version             = "7.0"
  parameter_group_name       = "default.redis7"
  auto_minor_version_upgrade = "true"
  node_type                  = "cache.t3.micro"
  maintenance_window         = "sun:09:00-sun:11:00"
  snapshot_retention_limit   = 2
  snapshot_window            = "08:00-09:00"

  at_rest_encryption_enabled = "false"
  transit_encryption_enabled = "false"

  security_group_ids = [
    aws_security_group.production_east_1_elasticache.id
  ]
}
