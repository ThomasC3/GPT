# FreeRideDriverFinder
Search the optimal driver

## Setup
1. Make sure you're on python 3.11.4
2. Install packages: `pip install -r requirements.txt`
3. Fill out .env
4. Run server: `python flask_lambda.py`

### .env
Common env keys:
```
LOG_LEVEL='<debug|local|info|error>'
SENTRY_DSN='<sentry_url>'
GH_API_KEY='<graphhopper_api_key>'
GH_VEHICLE_PROFILE='<graphhopper_vehicle_profile>' # ex: scooter
GH_VEHICLE_PROFILE_FALLBACK='<graphhopper_vehicle_profile>' # ex: scooter
TEST_DEV_DB_HOST='localhost'
TEST_DEV_DB_PORT='27017'
TEST_DEV_DB_USER=''
TEST_DEV_DB_PWD=''
TEST_DEV_DB='thefreeride-test'
```

Database connection needs to be set according to the database setup:

1)
```
DEV_DB='<db_name>'
DEV_DB_USER='<db_user>'
DEV_DB_PWD='<db_pass>'
DEV_DB_HOST='<db_host>'
DEV_DB_PORT='<db_port>'
```

2)
```
DEV_DB='<db_name>'
DEV_DB_USER='<db_user>'
DEV_DB_PWD='<db_pass>'
DEV_AUTH_SRC='<db_auth_source>'
DEV_DB_CLUSTER_HOST='<db_cluster_host>'
DEV_REPLICA_SET='<db_replica_set>'
```

## Deploy
Deploy is now performed by running the `driver_finder_provision_playbook.yml` playbook, in the Ansible directory. Refer to [the respective documentation](../../ansible/README.md) for more.
