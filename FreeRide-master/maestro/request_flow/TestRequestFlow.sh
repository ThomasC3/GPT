#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e
# Dependencies
source maestro/request_flow/secrets.sh
source maestro/request_flow/helpers/parse_args.sh
source maestro/request_flow/helpers/cli_helpers.sh


# Record start time
start_time=$(date)
# Reset the SECONDS variable
SECONDS=0

echo "Testing Request Flow..."
echo "- Driver: iOS (${driverDeviceID})"
echo "- Rider: Android (${riderDeviceID})"
echo ""

# If needed, log in in the Rider app
maestro --device $riderDeviceID test -e USERNAME=$RIDER_USERNAME -e PASSWORD=$RIDER_PASSWORD maestro/request_flow/Rider_Request_login_if_needed.yaml

printHeader "Tips & Cancellations"
maestro/request_flow/TestRequestFlowTips.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID --prepareApps true

printHeader "Payments (Fixed Price)"
maestro/request_flow/TestRequestFlowFixedPrice.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID

printHeader "PWYW"
maestro/request_flow/TestRequestFlowPWYW.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID

printHeader "ADA"
maestro/request_flow/TestRequestFlowADA.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID

printHeader "Fixed Stops"
maestro/request_flow/TestRequestFlowFixedStops.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID

printHeader "Promocodes"
maestro/request_flow/TestRequestFlowPromocodes.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID

printHeader "Age Restriction"
maestro/request_flow/TestRequestFlowAgeRestriction.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID

printHeader "Locations"
maestro/request_flow/TestRequestFlowLocations.sh --riderDeviceID $riderDeviceID --driverDeviceID $driverDeviceID


echo "Testing Request Flow finished successfully"
echo "All tests passed ✅"
# Print end time and elapsed time
end_time=$(date)
# Calculate elapsed time in minutes and seconds
elapsed_minutes=$((SECONDS / 60))
elapsed_seconds=$((SECONDS % 60))
echo "Start time: $start_time"
echo "End time: $end_time"
echo "Elapsed time: $elapsed_minutes minutes $elapsed_seconds seconds"

# Exit the script with a success status code
exit 0
