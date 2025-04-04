#!/bin/bash

# Function to prepare Driver app.
# Usage: prepareDriverApp lat_coordinate long_coordinate
prepareDriverApp() {
    local lat_coordinate=$1
    local long_coordinate=$2
    local vehicle_name=$3

    # *** DRIVER APP should be already open and logged out! ***
    # *** DRIVER be sure that the Driver account is in locations ***

    echo "[iOS Simulator] setting location coordinates to ${lat_coordinate} : ${long_coordinate}"
    xcrun simctl location $driverDeviceID set $lat_coordinate,$long_coordinate
    maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_logout_if_needed.yaml
    maestro --device $driverDeviceID test -e USERNAME="$DRIVER_USERNAME" -e PASSWORD="$DRIVER_PASSWORD" maestro/request_flow/Driver_Request_login.yaml
    maestro --device $driverDeviceID test -e VEHICLE_NAME="$vehicle_name" maestro/request_flow/Driver_Request_check_out_vehicle.yaml
}

# Function to prepare Rider app.
# Usage: prepareRiderApp lat_coordinate long_coordinate
prepareRiderApp() {
    local lat_coordinate=$1
    local long_coordinate=$2

    echo "[Android Emulator] setting location coordinates to ${lat_coordinate} : ${long_coordinate}"
    adb emu geo fix $long_coordinate $lat_coordinate
    sleep 5
    maestro --device $riderDeviceID test maestro/request_flow/Rider_restart_app.yaml
    maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_ignore_stop_not_found.yaml
    maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_rate_last_ride_if_needed.yaml
}

# Function that encompasses all the driver actions from acceptance to drop-off.
#  (accepting the ride, picking up the rider, dropping off the rider, and submitting feedback)
executeCompleteDriverJourney() {
    maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_accept.yaml
    maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_rider_pick_up.yaml
    maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_rider_drop_off.yaml
    maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_submit_feedback.yaml
}

# Function that submits feedback and adds a tip.
submitRiderFeedback() {
    maestro --device $riderDeviceID test maestro/request_flow/Rider_Request_submit_feedback_with_tip.yaml
}

# Function that checks in the current vehicle and ends the driver shift.
finishDriverShift() {
    maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_check_in_vehicle.yaml
    maestro --device $driverDeviceID test maestro/request_flow/Driver_Request_logout_if_needed.yaml
}
