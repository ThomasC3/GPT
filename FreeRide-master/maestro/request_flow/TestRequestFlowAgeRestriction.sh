#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Dependencies
source maestro/request_flow/secrets.sh
source maestro/request_flow/helpers/parse_args.sh
source maestro/request_flow/helpers/device_helpers.sh


### START TEST

prepareRiderApp +38.8171 -9.1482 #IKEA Loures

maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_logout.yaml
maestro --device $riderDeviceID test -e USERNAME=$RIDER_UNDER_AGED_USERNAME -e PASSWORD=$RIDER_UNDER_AGED_PASSWORD maestro/request_flow/Rider_Request_login.yaml

maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_a_ride_with_age_restriction.yaml

prepareRiderApp +38.7717 -9.0932 #FIL - Feira Internacional Lisboa

maestro --device $riderDeviceID test -e DROPOFF="Casino" maestro/request_flow/Rider_Request_a_ride_with_age_restricted_free_ride.yaml

### FINISH
maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_logout.yaml
maestro --device $riderDeviceID test -e USERNAME=$RIDER_USERNAME -e PASSWORD=$RIDER_PASSWORD maestro/request_flow/Rider_Request_login.yaml

# Exit the script with a success status code
exit 0
