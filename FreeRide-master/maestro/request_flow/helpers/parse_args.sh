# Set default values
prepareApps=true

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --riderDeviceID=?*)
      riderDeviceID=${1#*=}
      shift
      ;;
    --riderDeviceID)
      if [ -n "$2" ] && [[ "$2" != --* ]]; then
        riderDeviceID=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    --driverDeviceID=?*)
      driverDeviceID=${1#*=}
      shift
      ;;
    --driverDeviceID)
      if [ -n "$2" ] && [[ "$2" != --* ]]; then
        driverDeviceID=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    --prepareApps=?*)
      prepareApps=${1#*=}
      shift
      ;;
    --prepareApps)
      if [ -n "$2" ] && [[ "$2" != --* ]]; then
        prepareApps=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    *) # unknown option
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Check that both arguments were provided
if [ -z "$riderDeviceID" ] || [ -z "$driverDeviceID" ]; then
  echo "Usage: $0 --riderDeviceID riderDeviceID --driverDeviceID driverDeviceID"
  exit 1
fi

# Validate prepareApps value
if [[ "$prepareApps" != "true" && "$prepareApps" != "false" ]]; then
  echo "Error: --prepareApps must be 'true' or 'false'" >&2
  exit 1
fi