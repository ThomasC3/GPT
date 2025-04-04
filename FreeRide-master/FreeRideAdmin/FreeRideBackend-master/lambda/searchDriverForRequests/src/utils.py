"""
Miscelaneous helper functions
"""

import time
import uuid
import json
import subprocess
import re
import geopy.distance
import sentry_sdk
from sentry_sdk import capture_exception
from exceptions import TSPTimeoutError, TSPDefaultError, ExceptionWithContext

def runtime_start(logger, id_label, additional_params = None):
    """
    Logs and starts timer with an id label and additional information
    """
    start = time.time()
    time_dict = {'start': start}
    id_dict = {id_label: str(uuid.uuid1())}
    metric_dict = {**id_dict, **time_dict, **(additional_params if additional_params else {})}
    logger.info(json.dumps(metric_dict))
    return metric_dict

def runtime_stop(logger, start_dict, additional_params = None):
    """
    Logs runtime between timer start and now, start_dict params and
    additional information
    """
    start = start_dict['start']
    end = time.time()
    time_dict = {
        'end': end,
        'runtime': end-start
    }
    metric_dict = {**start_dict, **time_dict, **(additional_params if additional_params else {})}
    logger.info(json.dumps(metric_dict))
    return metric_dict

def calc_dist(coord_a, coord_b):
    """
    Calculates distance in meters between two coordinates (coord_a, coord_b)
    'coord_a' and 'coord_b' contains coordinates in the format [lat, lon]
    """
    return geopy.distance.geodesic(coord_a, coord_b).m

def extract_capacity(driver_info, reset_hailed=False):
    '''
    Returns filled vehicle capacity for a driver, taking into account
    both requested and hailed ride passenger information
    '''
    capacity_opts = {
        'passenger_capacity': driver_info['pax_capacity'],
        'ada_passenger_capacity': driver_info['pax_ada_capacity'],
        'hailed_passenger_count': driver_info['hailedRideInfo']['passengerCount'],
        'hailed_ada_passenger_count': driver_info['hailedRideInfo']['ADApassengerCount'],
    }

    if reset_hailed:
        capacity_opts['hailed_passenger_count'] = 0
        capacity_opts['hailed_ada_passenger_count'] = 0

    return capacity_opts

def build_capacity(capacity_opts):
    '''
    Builds available capacity preventing negative capacity
    due to hailed rides over vehicle capacity
    '''
    passenger_capacity = (
        capacity_opts['passenger_capacity'] - capacity_opts['hailed_passenger_count']
    )
    if passenger_capacity < 0:
        passenger_capacity = 0
    ada_passenger_capacity = (
        capacity_opts['ada_passenger_capacity'] - capacity_opts['hailed_ada_passenger_count']
    )
    if ada_passenger_capacity < 0:
        ada_passenger_capacity = 0

    return passenger_capacity, ada_passenger_capacity


def vehicle_call_order(driver_list, request_info):
    '''
    Takes in a list of drivers and a request and splits into buckets with vehicle call order:
    1. Locked vehicles with assigned zone (only if origin and destination zones are the same)
    2. Priority or exclusive vehicles with origin zone assigned
    3. Priority or exclusive vehicles with destination zone assigned
    4. Shared vehicles
    5. Priority vehicles with neither origin nor destination zones assigned
    '''
    origin_zone = request_info['pickupZone']['id']
    destination_zone = request_info['dropoffZone']['id']
    buckets = [[], [], [], [], []]

    for driver in driver_list:
        matching_rule = driver['vehicle']['matchingRule']['key']
        zones = [zone['id'] for zone in driver['vehicle']['zones']]
        if matching_rule == 'locked' and origin_zone in zones and destination_zone in zones:
            buckets[0].append(driver)
        elif matching_rule in ['priority', 'exclusive'] and origin_zone in zones:
            buckets[1].append(driver)
        elif matching_rule in ['priority', 'exclusive'] and destination_zone in zones:
            buckets[2].append(driver)
        elif matching_rule == 'shared':
            buckets[3].append(driver)
        elif matching_rule == 'priority':
            buckets[4].append(driver)

    return buckets

def build_request_actions(request):
    '''
    Create pickup and dropoff actions in the same format as route stops
    to integrate with driver's route
    '''
    is_ada = request["isADA"]
    is_pickup_fixed_stop = 'isPickupFixedStop' in request.keys() and request['isPickupFixedStop']
    is_dropoff_fixed_stop = 'isDropoffFixedStop' in request.keys() and request['isDropoffFixedStop']
    request_passengers = request["passengers"] - 1 if is_ada else request["passengers"]
    ada_passengers = 1 if is_ada else 0
    action = {
        'request_id': str(request['_id']),
        'status': "waiting",
        'passengers': request_passengers,
        'ADApassengers': ada_passengers
    }
    pickup = dict({
        'stopType': 'pickup',
        'coordinates': [
            request["pickupLatitude"],
            request["pickupLongitude"]
        ]
    }, **action)
    dropoff = dict({
        'stopType': 'dropoff',
        'coordinates': [
            request["dropoffLatitude"],
            request["dropoffLongitude"]
        ]
    }, **action)
    if is_pickup_fixed_stop:
        pickup.update({'fixedStopId': str(request["pickupFixedStopId"])})

    if is_dropoff_fixed_stop:
        dropoff.update({'fixedStopId': str(request["dropoffFixedStopId"])})

    return [pickup, dropoff]

def build_driver_dict(driver_list):
    '''
    Receives a driver list and converts to a dictionary with driver ids as keys
    '''
    driver_dict = {}
    for driver_info in driver_list:
        driver_dict[str(driver_info['_id'])] = driver_info
    return driver_dict

def add_margin(plan, pick_margin=2, drop_margin=2):
    '''
    Adds a default margin of 2 minute to each stop/action in the driver's route
    '''
    margin = 0
    curr_fs = False
    first_active_stop = True
    if len(plan) > 0:
        for idx, stop in enumerate(plan):
            if stop['status'] == "waiting":
                is_fs = 'fixedStopId' in stop
                same_fs = is_fs and stop['fixedStopId'] == curr_fs
                if not first_active_stop and (not is_fs or not same_fs):
                    if stop['stopType'] == "pickup":
                        margin += pick_margin
                    elif stop['stopType'] == "dropoff":
                        margin += drop_margin
                curr_fs = 'fixedStopId' in stop and stop['fixedStopId']
                first_active_stop = False
            plan[idx]['cost'] += margin * 60
    return plan

def handle_exception(e):
    '''
    Handles processing of additional info and tags from errors,
    adding it to sentry scope before sending to Sentry
    '''
    if isinstance(e, ExceptionWithContext):
        original_exception = e.original_exception
    else:
        original_exception = e
    with sentry_sdk.push_scope() as scope:
        if hasattr(e, 'additional_info') and e.additional_info:
            scope.set_context('additional_info', e.additional_info)
        if hasattr(e, 'tags') and e.tags:
            for key, value in e.tags.items():
                scope.set_tag(key, value)
        capture_exception(original_exception)

def tsp_handler(context, data_model, typ):
    '''
    Runs TSP on a separate subprocess and handles C++ errors
    thrown by TSP, translating them into python exceptions
    '''
    logger = context['logger']

    # Error info
    tags = {'location': context['location'], 'vehicle': data_model['profile']}
    additional_info = {'data_model': data_model, 'type': typ}

    try:
        result = subprocess.run(['python3', 'tsp_runner.py', json.dumps(data_model), typ],
            capture_output=True,
            check=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0 and result.stdout:
            tsp_result = json.loads(result.stdout.split('\n')[0])
            if tsp_result['success']:
                assignment = tsp_result['assignment']
                new_route = tsp_result['new_route']
                new_route_distances = tsp_result['new_route_distances']
                return [assignment, new_route, new_route_distances]
            else:
                # Catches handled python exceptions raised by tsp_runner
                additional_info['return_code'] = result.returncode
                additional_info['traceback'] = tsp_result['traceback']
                message = f"Error running TSP subprocess: {tsp_result['error']}"

                e = TSPDefaultError(message, additional_info, tags)
                logger.info(e)
                handle_exception(e)
        else:
            # Subprocess tsp_runner ran without errors but returned empty output
            additional_info['return_code'] = result.returncode
            additional_info['stdout'] = result.stdout
            additional_info['stderr'] = result.stderr
            message = "Error running TSP subprocess: Invalid output"

            e = TSPDefaultError(message, additional_info, tags)
            logger.info(e)
            handle_exception(e)
    except subprocess.TimeoutExpired as error:
        # Catches subprocess timeout
        additional_info['timeout'] = error.timeout
        message = f'TSP subprocess timed out after {error.timeout} seconds.'

        e = TSPTimeoutError(message, additional_info, tags).with_traceback(error.__traceback__)
        logger.info(e)
        handle_exception(e)
    except subprocess.CalledProcessError as error:
        # Catches any unhandled python and C++ exceptions raised by tsp_runner
        # Or subprocess returned status code other than 0
        additional_info['return_code'] = error.returncode
        additional_info['traceback'] = error.stderr

        original_message = ''
        # C++ error
        if error.stderr and ']' in error.stderr:
            match = re.search(r'\](.*?)\n', error.stderr)
            if match:
                original_message = match.group(1).strip()
        # Python error
        elif 'Traceback' in error.stderr:
            original_message = error.stderr.splitlines()[-1]

        message = f"Error running TSP subprocess: {original_message}"
        e = TSPDefaultError(message, additional_info, tags).with_traceback(error.__traceback__)

        logger.info(e)
        handle_exception(e)
    # pylint: disable=broad-exception-caught
    except Exception as error:
    # pylint: enable=broad-exception-caught
        # Catches any inner python exceptions
        additional_info['data_model'] = data_model
        additional_info['type'] = typ
        message = f'TSP unexpected error: {error}'

        e = ExceptionWithContext(
            error, message, additional_info, tags
        ).with_traceback(error.__traceback__)
        logger.info(e)
        handle_exception(e)

    return [False, False, False]
