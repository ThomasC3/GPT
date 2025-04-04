# server-based syntax
# ======================
# Defines a single server with a list of roles and multiple properties.
# You can define all roles on a single server, or split them:

server 'ec2-3-92-170-99.compute-1.amazonaws.com',
       user: 'provisioner', roles: %w[app]
server 'ec2-54-176-113-167.us-west-1.compute.amazonaws.com',
       user: 'provisioner', roles: %w[app]
# server "db.example.com", user: "deploy", roles: %w{db}

# role-based syntax
# ==================

# Defines a role with one or multiple servers. The primary server in each
# group is considered to be the first unless any hosts have the primary
# property set. Specify the username and a domain or IP for the server.
# Don't use `:all`, it's a meta role.

# role :app, %w{deploy@example.com}, my_property: :my_value
# role :web, %w{user1@primary.com user2@additional.com},
#      other_property: :other_value
# role :db,  %w{deploy@example.com}

# Configuration
# =============
# You can set any configuration variable like in config/deploy.rb
# These variables are then only loaded and set in this stage.
# For available Capistrano configuration variables see the documentation page.
# http://capistranorb.com/documentation/getting-started/configuration/
# Feel free to add new variables to customise your setup.

# Custom SSH Options
# ==================
# You may pass any option but keep in mind that net/ssh understands a
# limited set of options, consult the Net::SSH documentation.
# http://net-ssh.github.io/net-ssh/classes/Net/SSH.html#method-c-start
#
# Global options
# --------------
# set :ssh_options,
#     user: 'ubuntu',
#     keys: %w[~/.ssh/freeride.pem],
#     forward_agent: false,
#     auth_methods: %w[publickey]

#
# The server-based syntax can be used to override options:
# ------------------------------------
# server "example.com",
#   user: "user_name",
#   roles: %w{web app},
#   ssh_options: {
#     user: "user_name", # overrides user setting above
#     keys: %w(/home/user_name/.ssh/id_rsa),
#     forward_agent: false,
#     auth_methods: %w(publickey password)
#     # password: "please use keys"
#   }

# Git config
# ==================
set :branch, (proc { `git rev-parse --abbrev-ref master`.chomp })
set :stage, :production

# PM2
# ==================
set :pm2_env_variables, 'NODE_ENV' => 'production'
set :pm2_start_params, "#{release_path}/capistrano_ecosystem.admin.config.js --env #{fetch(:stage)}"
set :pm2_app_command, ''

set :linked_files, %w[config_keys/production.key]

puts "Deploying\n\tbranch: '#{fetch(:branch)}'\n\tto stage: '#{fetch(:stage)}'"
