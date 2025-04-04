server 'ec2-52-5-51-203.compute-1.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]
server 'ec2-54-176-115-186.us-west-1.compute.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]

set :build_command, 'build'
