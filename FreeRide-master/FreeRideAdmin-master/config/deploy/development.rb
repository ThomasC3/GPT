server 'ec2-54-84-8-106.compute-1.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]
server 'ec2-54-193-102-33.us-west-1.compute.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]

set :build_command, 'build-dev'
