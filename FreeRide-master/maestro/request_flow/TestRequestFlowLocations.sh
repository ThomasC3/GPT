#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Dependencies
source maestro/request_flow/secrets.sh
source maestro/request_flow/helpers/parse_args.sh
source maestro/request_flow/helpers/device_helpers.sh


### START TEST

prepareRiderApp +38.8171 -9.1482 #IKEA Loures

# Login if needed
maestro --device $riderDeviceID test -e USERNAME=$RIDER_USERNAME -e PASSWORD=$RIDER_PASSWORD maestro/request_flow/Rider_Request_login_if_needed.yaml

maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_a_ride_in_closed_location.yaml

# Exit the script with a success status code
exit 0
