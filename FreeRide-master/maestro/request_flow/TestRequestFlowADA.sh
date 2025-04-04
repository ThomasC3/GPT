#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Dependencies
source maestro/request_flow/secrets.sh
source maestro/request_flow/helpers/parse_args.sh
source maestro/request_flow/helpers/device_helpers.sh


### SETUP

readonly driver_lat_coordinate=+38.7716 #Aeroporto
readonly driver_long_coordinate=-9.1303 #Aeroporto
readonly driver_vehicle_name="Renault Eve (RN-18-AB)"
prepareDriverApp $driver_lat_coordinate $driver_long_coordinate "$driver_vehicle_name"

readonly rider_lat_coordinates=+38.8171 #IKEA Loures
readonly rider_long_coordinate=-9.1482 #IKEA Loures
prepareRiderApp $rider_lat_coordinates $rider_long_coordinate


### START TEST

# Rider: request a ride with ADA
maestro --device $riderDeviceID test -e DROPOFF="IKEA Loures" maestro/request_flow/Rider_Request_a_ride_with_ADA.yaml

executeCompleteDriverJourney

# Rider: submit feedback and add tip
maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_submit_feedback_with_tip.yaml


### FINISH
maestro --device $riderDeviceID test -e ADA_STATUS="No" maestro/request_flow/Rider_change_ADA_setting.yaml
finishDriverShift

# Exit the script with a success status code
exit 0
