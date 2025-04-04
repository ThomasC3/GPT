#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Dependencies
source maestro/request_flow/secrets.sh
source maestro/request_flow/helpers/parse_args.sh
source maestro/request_flow/helpers/device_helpers.sh


### SETUP

readonly driver_lat_coordinate=38.7985
readonly driver_long_coordinate=-9.1245
readonly driver_vehicle_name="Tesla Model 3 (TL-99-03)"
prepareDriverApp $driver_lat_coordinate $driver_long_coordinate "$driver_vehicle_name"


### START TEST

prepareRiderApp +38.7721 -9.1604

maestro --device $riderDeviceID test -e PROMOCODE="BEERFRIDAY" maestro/request_flow/Rider_Payments_add_promocode.yaml

# Request a ride with Payments
maestro --device $riderDeviceID test -e DROPOFF="Hospital Pulido Valente" -e COST_PREVIEW_COPY="This ride is powered by Whitesmith. Total ride cost of \$0.78, including \$0.42 of discount." -e COST_CONFIRMATION_COPY="Total ride cost of \$0.78, including \$0.42 of discount using BEERFRIDAY. You will only be charged when you are picked up.\n\nAfter confirmation, the total ride value will be preauthorized, you will see this reflected in your payment account. More Info" maestro/request_flow/Rider_Request_a_paid_ride.yaml
executeCompleteDriverJourney
maestro --device $riderDeviceID test -e CONTRIBUTION_COPY="\$0.78, including \$0.42 of discount" maestro/request_flow/Rider_Request_submit_feedback_with_tip.yaml

prepareRiderApp +38.7949 -9.1548

# Request a ride with PWYW
maestro --device $riderDeviceID test -e DROPOFF="Feira das Galinheiras" -e COST_PREVIEW_COPY="Total ride cost of \$1.30, including \$0.70 of discount. Good news! Minimum payment has been reduced by a promocode BEERFRIDAY" -e COST_CONFIRMATION_COPY="Total ride cost of \$1.30, including \$0.70 of discount using BEERFRIDAY. You will only be charged when you are picked up.\n\nAfter confirmation, the total ride value will be preauthorized, you will see this reflected in your payment account. More Info" maestro/request_flow/Rider_Request_a_paid_ride.yaml
executeCompleteDriverJourney
maestro --device $riderDeviceID test -e CONTRIBUTION_COPY="\$1.30, including \$0.70 of discount" maestro/request_flow/Rider_Request_submit_feedback_with_tip.yaml

maestro --device $riderDeviceID test maestro/request_flow/Rider_Payments_remove_promocode.yaml


### FINISH
finishDriverShift

# Exit the script with a success status code
exit 0
