# server-based syntax
# ======================
# Defines a single server with a list of roles and multiple properties.
# You can define all roles on a single server, or split them:

server 'ec2-3-92-54-115.compute-1.amazonaws.com',
       user: 'provisioner', roles: %w[app ws_0],
       ws_0: [ { LOCATION_WORKING_SET: 'ws_0' } ]
server 'ec2-3-90-253-192.compute-1.amazonaws.com',
       user: 'provisioner', roles: %w[app ws_1],
       ws_1: [ { LOCATION_WORKING_SET: 'ws_1' } ]

# Git config
# ==================
set :branch, (proc { `git rev-parse --abbrev-ref master`.chomp })
set :stage, :production

set :deploy_to, '/var/www/free_ride_cron'

# PM2
# ==================
set :pm2_env_variables, 'NODE_ENV' => 'production'
set :pm2_start_params, "#{release_path}/capistrano_ecosystem.cronjob.config.js --env #{fetch(:stage)}"
set :pm2_app_command, ''

set :linked_files, %w[config_keys/production.key]

puts "Deploying\n\tbranch: '#{fetch(:branch)}'\n\tto stage: '#{fetch(:stage)}'"
