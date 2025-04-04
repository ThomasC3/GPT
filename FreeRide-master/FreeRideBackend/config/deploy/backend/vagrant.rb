# server-based syntax
# ======================
server '127.0.0.1:2222',
       user: 'provisioner',
       roles: %w[app]

# Global options
# --------------
set :pty, true

set :linked_files, %w[config_keys/local.key]

# Git config
# ==================
branch =
  ENV.fetch('BRANCH', nil) ||
  (proc { `git rev-parse --abbrev-ref HEAD`.chomp }).call

if %w[master stage].include?(branch)
  branch = (proc { `git rev-parse --abbrev-ref develop`.chomp }).call
end

set :branch, branch
set :stage, :development

# PM2
# ==================
set :pm2_env_variables, 'NODE_ENV' => 'development'
set :pm2_start_params, "#{release_path}/capistrano_ecosystem.config.js --env #{fetch(:stage)}"
set :pm2_app_command, ''

puts "Deploying\n\tbranch: '#{fetch(:branch)}'\n\tto stage: '#{fetch(:stage)}'"
