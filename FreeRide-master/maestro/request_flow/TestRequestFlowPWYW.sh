#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Dependencies
source maestro/request_flow/secrets.sh
source maestro/request_flow/helpers/parse_args.sh
source maestro/request_flow/helpers/device_helpers.sh


### SETUP

readonly driver_lat_coordinate=+38.7444 #Jardim Zoológico
readonly driver_long_coordinate=-9.1707 #Jardim Zoológico
readonly driver_vehicle_name="Renault Eve (UP-19-12)"
prepareDriverApp $driver_lat_coordinate $driver_long_coordinate "$driver_vehicle_name"

readonly rider_lat_coordinates=+38.7536 #Centro Comercial Colombo
readonly rider_long_coordinate=-9.1884 #Centro Comercial Colombo
prepareRiderApp $rider_lat_coordinates $rider_long_coordinate


### START TEST

# Rider: request a ride
maestro --device $riderDeviceID test -e DROPOFF="Jardim Zoologico de Lisboa" maestro/request_flow/Rider_Request_a_ride_with_pwyw.yaml

executeCompleteDriverJourney

# Rider: submit feedback and add tip
maestro --device $riderDeviceID test -e CONTRIBUTION_COPY="\$2.00" maestro/request_flow/Rider_Request_submit_feedback_with_tip.yaml


### FINISH
finishDriverShift

# Exit the script with a success status code
exit 0
