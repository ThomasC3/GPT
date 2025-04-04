lock '~> 3.11.0'

set :application, 'FreeRideBackend'
set :repo_url, 'git@github.com:thefreerideinc/FreeRideBackend.git'

# Default branch is :master
# ask :branch, `git rev-parse --abbrev-ref HEAD`.chomp

# Default deploy_to directory is /var/www/my_app_name
set :deploy_to, '/var/www/free_ride_backend'

# Default value for :format is :airbrussh.
# set :format, :airbrussh

# You can configure the Airbrussh format using :format_options.
# These are the defaults.
set :format_options, command_output: true,
                     log_file: 'log/capistrano.log',
                     color: :auto, truncate: :auto

# Default value for :pty is false
set :pty, false

# Default value for :linked_files is []
# append :linked_files, "config/database.yml"

# Default value for linked_dirs is []
# append :linked_dirs, "log", "tmp/pids", "tmp/cache", "tmp/sockets", "public/system"

# Default value for default_env is {}
# set :default_env, { path: "/opt/ruby/bin:$PATH" }

# Default value for local_user is ENV['USER']
# set :local_user, -> { `git config user.name`.chomp }

# Default value for keep_releases is 5
set :keep_releases, 5

# PM2
set :pm2_env_variables, 'NODE_ENV' => fetch(:stage)

# Uncomment the following to require manually verifying the host key before first deploy.
# set :ssh_options, verify_host_key: :secure

namespace :deploy do
  desc 'Restart application'
  task :restart do
    invoke! 'pm2:restart'
  end

  desc 'Production Sanity Check'
  task :ask_production_confirmation do
    if fetch(:stage).to_s.casecmp('production').zero?
      puts <<-WARN

      ========================================================================
            WARNING: You're about to deploy to Production
      ========================================================================

      WARN

      # gen 5 length upcase code
      code = rand(36**5).to_s(36).upcase

      ask :answer, "Are you sure you want to continue? Type '#{code}'"

      if fetch(:answer) != code
        puts "\nDeploy cancelled!"
        exit
      end
    end
  end

  before 'deploy', 'deploy:ask_production_confirmation'
  after :publishing, :restart
end

namespace :yarn do
  desc 'install'
  task :install do
    on roles(:app) do
      within fetch(:npm_target_path, release_path) do
        with fetch(:npm_env_variables, 'NODE_ENV' => fetch(:stage)) do
          execute :yarn, :install
        end
      end
    end
    on roles(:ws_0) do
      vars = role_properties(:ws_0)
      vars.each do |var|
        execute "sed -i 's/ws_0/#{var[:LOCATION_WORKING_SET]}/' #{release_path}/capistrano_ecosystem.cronjob.config.js"
      end
    end
    on roles(:ws_1) do
      vars = role_properties(:ws_1)
      vars.each do |var|
        execute "sed -i 's/ws_0/#{var[:LOCATION_WORKING_SET]}/' #{release_path}/capistrano_ecosystem.cronjob.config.js"
      end
    end
  end
end

namespace :npm do
  desc 'build'
  task :build do
    on roles(:app) do
      within fetch(:npm_target_path, release_path) do
        with fetch(:npm_env_variables, {}) do
          execute :npm, :run, :build
        end
      end
    end
  end

  # after :publishing, :build
  before 'deploy:updated', 'yarn:install'
  after 'yarn:install', 'npm:build'
end
