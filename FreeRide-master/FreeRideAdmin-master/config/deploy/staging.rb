server 'ec2-54-90-150-131.compute-1.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]
server 'ec2-13-52-242-27.us-west-1.compute.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]

set :build_command, 'build-stage'
