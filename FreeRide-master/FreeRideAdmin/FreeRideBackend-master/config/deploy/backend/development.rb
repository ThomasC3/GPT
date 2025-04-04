# server-based syntax
# ======================
# Defines a single server with a list of roles and multiple properties.
# You can define all roles on a single server, or split them:

server 'ec2-54-84-8-106.compute-1.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]
server 'ec2-54-193-102-33.us-west-1.compute.amazonaws.com',
       user: 'provisioner',
       roles: %w[app]

# Global options
# --------------
set :pty, true

set :linked_files, %w[config_keys/development.key]

# Git config
# ==================
branch =
  ENV.fetch('BRANCH', nil) ||
  (proc { `git rev-parse --abbrev-ref HEAD`.chomp }).call

if %w[master stage].include?(branch)
  branch = (proc { `git rev-parse --abbrev-ref stage`.chomp }).call
end

set :branch, branch
set :stage, :development

# PM2
# ==================
set :pm2_env_variables, 'NODE_ENV' => 'development'
set :pm2_start_params, "#{release_path}/capistrano_ecosystem.config.js --env #{fetch(:stage)}"
set :pm2_app_command, ''

puts "Deploying\n\tbranch: '#{fetch(:branch)}'\n\tto stage: '#{fetch(:stage)}'"
