# Deployment - Capistrano

Before proceeding, make sure your apps are properly provisioned.

## Install

For deployments you will need to use `capistrano` recipes. This is a one time step to be done on your machine.

On your root folder run the following command to install the necessary dependencies for capistrano
```bash
bundle install
```

There are three possible stages: `production`, `stage`, and `development`.

There are two possible apps: `backend` and `cron`.

There's a config file for each one of the apps (cron and backend) and for each env under `config/deploy/<app>` folder.

Each file contains the necessary info for the deployment. Make sure everything is correct before deploying:

* provisioner user must match the one created on provisioning
* ec2 instance url is correct
* branch to be deployed for that stage

## Testing

There's a 4th stage which is `vagrant`. If you have your vagrant machine provisioned, up and running, you can test capistrano deploys on it by using this stage.

## Deploy

```bash
cap <app>:<stage> deploy --backtrace
```

For testing purposes, on stage `development` or `vagrant` you can deploy any branch you want exlcuding (`master` and `stage`). To do that, there are possible solutions:

* by specifying the branch

```bash
BRANCH=<branch-name> cap <app>:<development|vagrant> deploy --backtrace
```

* by checking out to the branch

```bash
git checkout <branch-name>
cap <app>:<development|vagrant> deploy --backtrace
```

### Tips

For stage and development, you can also use the following commands to deploy both backend and cron at once:

* `make deploy-to-dev` : this will deploy **your current working branch** to development
* `make deploy-stage` : this will deploy **stage branch** to stage

## Rollback

```bash
cap <app>:<stage> deploy:rollback ROLLBACK_RELEASE=<20190705145029> --backtrace
```