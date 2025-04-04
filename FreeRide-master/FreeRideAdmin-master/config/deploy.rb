lock "~> 3.18.0"

set :application, "free_ride_admin"
set :repo_url, "git@github.com:thefreerideinc/FreeRideAdmin.git"
set :branch, ENV.fetch('BRANCH', nil) || (proc { `git rev-parse --abbrev-ref HEAD`.chomp }).call
set :deploy_to, "/var/www/free_ride_admin"
set :pty, true
set :ssh_options, forward_agent: true
set :yarn_flags, ''

ask(:admin_version, nil, prompt: 'What is the new admin version?')
fetch(:admin_version)

namespace :yarn do
  desc 'Build admin'
  task :build do
    on roles(:app) do
      within fetch(:yarn_target_path, release_path) do
        execute "NODE_OPTIONS=--openssl-legacy-provider", "VERSION=#{fetch(:admin_version)}", fetch(:yarn_bin), fetch(:build_command)
      end
    end
  end
end

after 'yarn:install', 'yarn:build'

puts "Deploying\n\tbranch: '#{fetch(:branch)}'\n\tto stage: '#{fetch(:stage)}'"
