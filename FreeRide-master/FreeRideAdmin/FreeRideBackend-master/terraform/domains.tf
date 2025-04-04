resource "godaddy_domain_record" "tfrholdingscorp_com" {
  domain = "tfrholdingscorp.com"

  nameservers = [
    "ns31.domaincontrol.com",
    "ns32.domaincontrol.com",
  ]

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.dev_global_1.ip_sets[0].ip_addresses
    content {
      name     = "devadmin"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.dev_global_1.ip_sets[0].ip_addresses
    content {
      name     = "devdriver"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.dev_global_1.ip_sets[0].ip_addresses
    content {
      name     = "devrider"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.staging_global_1.ip_sets[0].ip_addresses
    content {
      name     = "stageadmin"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.staging_global_1.ip_sets[0].ip_addresses
    content {
      name     = "stagedriver"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.staging_global_1.ip_sets[0].ip_addresses
    content {
      name     = "stagerider"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.production_global_1.ip_sets[0].ip_addresses
    content {
      name     = "admin"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.production_global_1.ip_sets[0].ip_addresses
    content {
      name     = "driver"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  dynamic "record" {
    for_each = aws_globalaccelerator_accelerator.production_global_1.ip_sets[0].ip_addresses
    content {
      name     = "rider"
      type     = "A"
      data     = record.value
      priority = 0
      ttl      = 3600
    }
  }

  record {
    name     = "www"
    type     = "CNAME"
    data     = "@"
    priority = 0
    ttl      = 3600
  }

  record {
    name     = "@"
    type     = "TXT"
    data     = "M3/nO9P05kzr3O2TZnPraAuo5r2Wq1nd1pmd9Bpy+6w="
    priority = 0
    ttl      = 1800
  }

  record {
    name     = "_amazonses.tfrholdingscorp.com"
    type     = "TXT"
    data     = "M3/nO9P05kzr3O2TZnPraAuo5r2Wq1nd1pmd9Bpy+6w="
    priority = 0
    ttl      = 3600
  }

  record {
    name     = "@"
    type     = "A"
    data     = "Parked"
    priority = 0
    ttl      = 600
  }

  record {
    name     = "_3d6b76ab61aa07a6c77467d4fea90b5c.tfrholdingscorp.com"
    type     = "CNAME"
    data     = "_a502bda51267f40b973c26438d02df4e.hkvuiqjoua.acm-validations.aws"
    priority = 0
    ttl      = 3600
  }

  record {
    name     = "_domainconnect"
    type     = "CNAME"
    data     = "_domainconnect.gd.domaincontrol.com"
    priority = 0
    ttl      = 3600
  }

  record {
    name     = "tfrholdingscorp.com"
    type     = "TXT"
    data     = "amazonses:M3/nO9P05kzr3O2TZnPraAuo5r2Wq1nd1pmd9Bpy+6w="
    priority = 0
    ttl      = 1800
  }

  record {
    name     = "huj776dsbiwzmylphdal4g5pwtycx6l2._domainkey"
    type     = "CNAME"
    data     = "huj776dsbiwzmylphdal4g5pwtycx6l2.dkim.amazonses.com"
    priority = 0
    ttl      = 3600
  }

  record {
    name     = "images"
    type     = "CNAME"
    data     = "images.tfrholdingscorp.com.s3.amazonaws.com"
    priority = 0
    ttl      = 3600
  }

  record {
    name     = "tfrholdingscorp.com"
    type     = "MX"
    data     = "inbound-smtp.us-east-1.amazonaws.com"
    priority = 10
    ttl      = 3600
  }

  record {
    name     = "itog2xxhe5x4dop33xphl5squ5wuzz57._domainkey"
    type     = "CNAME"
    data     = "itog2xxhe5x4dop33xphl5squ5wuzz57.dkim.amazonses.com"
    priority = 0
    ttl      = 3600
  }

  record {
    name     = "pvpu4c56kdeq3l22doifb74z2imf7n2q._domainkey"
    type     = "CNAME"
    data     = "pvpu4c56kdeq3l22doifb74z2imf7n2q.dkim.amazonses.com"
    priority = 0
    ttl      = 3600
  }
}
