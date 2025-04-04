# The Free Ride Provisioning

## Deploying to a stage

Change `<stage>` to `production`, `stage` or `development`.

All of them should be already defined. However, make sure everything is correct before proceeding any provision operation.

Stage files should be defined following structure below:

```
[web]
<ec2 instance url >

[cron]
<ec2 instance url >

[development:children]
web
cron

[all:vars]
stage=<stage>
```

All the necessary vars used in any ansible playbook are under `group_vars` folder.

### Installing Requirements
```bash
# Installs Ansible (requires python2)
pip install -r requirements.txt

# Installs necessary Ansible roles
ansible-galaxy install -r requirements.yml --roles-path=./roles
```

### Running deploy playbooks
```bash
# This will create the provisioner account and handle server auth.
ansible-playbook -i <stage> user_provisioning_playbook.yml -v

# This will install all the required packages and setup the services on the backend
ansible-playbook -i <stage> app_provision_playbook.yml -v

# This will install all the required packages and setup the services on cron
ansible-playbook -i <stage> cron_provision_playbook.yml -v

# This will call the two playbooks of user and backend
ansible-playbook -i <stage> backend.yml -v

# This will call the two playbooks of user and cron
ansible-playbook -i <stage> cron.yml -v

# This will setup the machine with Nginx for one of the environments
ansible-playbook -i <stage> nginx_provision_playbook.yml -v
```

## Testing the provisioning

Create Ubuntu 18.04 virtual machine and provision it automatically using the `backend.yml` playbook.

```bash
vagrant up --provision
```

or if it already exists

```bash
vagrant destroy && vagrant up --provision
```

Alternatively, to test the setup of the Nginx machine, run:
```bash
VAGRANT_VAGRANTFILE=Vagrantfile.nginx vagrant up --provision
```

## General notes

### Users
- A provisioner user is created for running the ansible playbooks as sudo instead of root

- An application user is created to deploy the application that is different from
the provisioner user; the application is deployed to an `var/www` folder.

### Available playbooks

This repo includes the following playbooks:

* The user playbook, [user_provision_playbook.yml][], which creates the provisioner user and limits the root access.
* The app playbook, [app_provision_playbook.yml][], which installs most of the application's dependencies, as described in the services section.
* The main playbook, [backend.yml][], which calls the two previous playbooks in order.
* The cron provision playbook, [cron_provision_playbook.yml][], which installs `cron` and its dependencies.
* The cron playbook, [cron.yml][], which calls the user playbook and the cron provision playbook.
* The nginx provision playbook, [nginx_provision_playbook.yml][], which installs and configures an Nginx reverse proxy/load balancer.

### Current Services

  - Mongo
  - PM2
  - Node.js

### Add a new public key:

`==> NOT TESTED <==`

* Add your .pub key under ssh_keys folder.
* Add the path under every `authorized_keys:` key on `group_vars/all/main.yml`
* Re-run provisioner user playbook.

## Previous Deployment (outdated)
Deployments are done manually. A PR is made to that branch (on dev for normal dev cycle, stage for emergency fixes).  Once merged ill ssh to the appropriate server, do a git pull, run the build script (yarn build, which you can find the package.json), finally use pm2 to restart the process. If its an update to all branches, ill repeat the steps on the other servers.

Haven't had to deal with rollbacks yet because while we have different environments, everything had been in development up until Saturday (which even now is off stage).

### Ops
* pm2 is on installed under root
* for this project the source is in /var/apps/
* for websites its in /var/www/

[site.yml]: site.yml
[user_provisioning_playbook.yml]: user_provisioning_playbook.yml
[app_provisioning_playbook.yml]: app_provisioning_playbook.yml

### Misc

A playbook called `misc.yml` was added because the signing key for the Yarn release server was updated, and any task depending on running `apt`/`apt-get` would throw an error as a consequence. Right now, the playbook just calls a task from the `yarn` role that updates the existing key.

To run the playbook, run `ansible-playbook -i <stage> misc.yml --tags=utility`. This will run the playbook in all machines in the inventory for the defined stage (for example, running this with the flag `-i production` would run the playbook against the 4 backend servers, the admin backend server, the 2 cron servers, the new driver rider and Nginx). The task that updates the key has the "utility" tag, so by running the command like this only that task is run. To add more tasks to this playbook, mark them with the "utility" tag, and make sure the roles are imported in the playbook file.

This playbook should be run once for each existing machine, before running other playbooks, to update Yarn signing keys. After that, it can be run again, but it won't have any impact.

### `env_vars` in `group_vars` files
There is a new field in the `group_vars` files called `env_vars`. This field includes the environment variables that'll be used by the new driver finder process:

* `DEV_AUTH_SRC`
* `DEV_DB` → Name of the database to be used
* `DEV_DB_CLUSTER_HOST` → Comma-separated list of MongoDB endpoints to connect to (including port, but with no protocol)
* `DEV_DB_PWD` → Password to use to connect to MongoDB
* `DEV_DB_USER` → Username to use to connecto to MongoDB
* `DEV_REPLICA_SET` → Replica Set to use when connecting to MongoDB
* `GH_API_KEY` → Graphhopper API key
* `GH_VEHICLE_PROFILE` → Vehicle type to be used by Graphhopper (like `scooter`)
* `GH_VEHICLE_PROFILE_FALLBACK` → Alternative in case there's an issue with `GH_VEHICLE_PROFILE` (like `car`)
* `LOG_LEVEL` → How detailed we want logs to be (like `debug`, `info`, `warning`, `error`)
* `SENTRY_DSN` → Sentry endpoint to send errors data to
