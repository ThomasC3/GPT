# server-based syntax
# ======================
server '127.0.0.1:2222',
       user: 'provisioner',
       roles: %w[app],
       ssh_options: {
         forward_agent: true,
         keys: ['~/.ssh/id_rsa']
       }

# Global options
# --------------
set :user, 'provisioner'
set :pty, true

# Git config
# ==================
branch =
  ENV.fetch('BRANCH', nil) ||
  (proc { `git rev-parse --abbrev-ref HEAD`.chomp }).call

if %w[master stage].include?(branch)
  branch = (proc { `git rev-parse --abbrev-ref develop`.chomp }).call
end

set :branch, branch
set :deploy_to, '/var/www/free_ride_cron'

# PM2
# ==================
set :stage, :development
set :pm2_env_variables, 'NODE_ENV' => fetch(:stage)
set :pm2_start_params, "#{release_path}/capistrano_ecosystem.cronjob.config.js --env #{fetch(:stage)}"
set :pm2_app_command, ''

puts "Deploying\n\tbranch: '#{fetch(:branch)}'\n\tto stage: '#{fetch(:stage)}'"
