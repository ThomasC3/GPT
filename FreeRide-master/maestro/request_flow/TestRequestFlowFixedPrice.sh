#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Dependencies
source maestro/request_flow/secrets.sh
source maestro/request_flow/helpers/parse_args.sh
source maestro/request_flow/helpers/device_helpers.sh


### SETUP

readonly driver_lat_coordinate=+38.7646 #Casino
readonly driver_long_coordinate=-9.0966 #Casino
readonly driver_vehicle_name="Renault Eve (RN-18-AC)"
prepareDriverApp $driver_lat_coordinate $driver_long_coordinate "$driver_vehicle_name"

readonly rider_lat_coordinates=+38.7717 #FIL - Feira Internacional Lisboa
readonly rider_long_coordinate=-9.0932 #FIL - Feira Internacional Lisboa
prepareRiderApp $rider_lat_coordinates $rider_long_coordinate


### START TEST

# Rider: request a ride
maestro --device $riderDeviceID test -e DROPOFF="Casino" maestro/request_flow/Rider_Request_a_ride_with_payments.yaml

executeCompleteDriverJourney

# Rider: submit feedback and add tip
maestro --device $riderDeviceID test -e CONTRIBUTION_COPY="\$1.00" maestro/request_flow/Rider_Request_submit_feedback_with_tip.yaml


### FINISH
finishDriverShift

# Exit the script with a success status code
exit 0
