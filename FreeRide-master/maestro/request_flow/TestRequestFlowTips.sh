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

if [ "$prepareApps" == "true" ]; then
  prepareDriverApp $driver_lat_coordinate $driver_long_coordinate "$driver_vehicle_name"
fi

readonly rider_lat_coordinates=+38.8171 #IKEA Loures
readonly rider_long_coordinate=-9.1482 #IKEA Loures

if [ "$prepareApps" == "true" ]; then
	prepareRiderApp $rider_lat_coordinates $rider_long_coordinate
fi


### START TEST


### CANCELLATIONS
# Rider: request a ride
maestro --device $riderDeviceID test -e DROPOFF="IKEA Loures" maestro/request_flow/Rider_Request_a_ride.yaml

# Cancel the ride after driver matched
maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_cancel_after_accepted.yaml
maestro --device $riderDeviceID test -e DROPOFF="IKEA Loures" maestro/request_flow/Rider_Request_a_ride.yaml
maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_ack_wait_to_request_new_ride.yaml
maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_ack_ride_has_been_cancelled_by_rider.yaml

echo "Wait before we can make another request (3 minutes remaining)"
sleep 60 #wait 1 min
echo "2 minutes remaining..."
sleep 60
echo "1 minute remaining..."
sleep 60
echo "Requesting another ride"

# Rider: request a ride
maestro --device $riderDeviceID test -e DROPOFF="IKEA Loures" maestro/request_flow/Rider_Request_retry.yaml

# Driver: cancel the ride
maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_cancel_before_accepted.yaml

# Rider: request a ride
maestro --device $riderDeviceID test maestro/request_flow/Rider_restart_app.yaml
maestro --device $riderDeviceID test -e DROPOFF="IKEA Loures" maestro/request_flow/Rider_Request_a_ride.yaml

# Driver: accept the ride
maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_accept.yaml

# Driver: cancel the ride
maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_cancel_after_accepted.yaml


### TIPS
# Rider: request a ride
maestro --device $riderDeviceID test maestro/request_flow/Rider_restart_app.yaml
maestro --device $riderDeviceID test -e DROPOFF="IKEA Loures" maestro/request_flow/Rider_Request_a_ride.yaml

executeCompleteDriverJourney

# Rider: submit feedback and add tip
maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_submit_feedback_with_tip.yaml


### FINISH
if [ "$prepareApps" == "true" ]; then
	finishDriverShift
fi

# Exit the script with a success status code
exit 0
