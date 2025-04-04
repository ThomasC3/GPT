'''
The Route module provides processing and analysis of driver routes
for route sorting, data model building and driver evaluation
'''
import copy

def get_pickup_idx(dropoff_idx, pickup_dict):
    '''
    Receives a dropoff index and the pickup dictionary in order to find
    the pickup index from the route that corresponds to the given dropoff index
    '''
    pickup_idx = -1
    if dropoff_idx in pickup_dict.keys():
        pickup_idx = pickup_dict[dropoff_idx]
    return pickup_idx

def get_close_pickup_stops(ride_indexes, distance_matrix_line, stops):
    '''
    Groups pickup stops that are within 30 meters of each other
    '''
    max_close_stop_distance_m = 30
    close_nodes = []
    for stop_idx, distance in enumerate(distance_matrix_line):
        # Is neither the current location (0) of driver
        # nor the pickup or dropoff of the ride (ride_indexes)
        if stop_idx in [0, *ride_indexes]:
            continue
        if stops[stop_idx]['stopType'] == 'pickup' and distance <= max_close_stop_distance_m:
            close_nodes += [stop_idx]
    return close_nodes

def group_close_nodes(data):
    '''
    Create a list of rides from the dropoff actions with:
    - pickup: index of pickup in route
    - dropoff: index of dropoff in route
    - close_nodes: indexes of other pickup actions that are within 30 meters of the dropoff
    '''
    close_nodes_list = []
    stops = data['nodes']
    for dropoff_idx, stop in enumerate(data['nodes']):
        if stop['stopType'] == 'dropoff':
            pickup_idx = get_pickup_idx(dropoff_idx, data['pickup_dict'])
            ride_indexes = [pickup_idx, dropoff_idx]
            distance_matrix_line = data['distance_matrix'][dropoff_idx]
            close_nodes = get_close_pickup_stops(
                ride_indexes, distance_matrix_line, stops
            )
            has_close_stops = len(close_nodes) > 0
            if has_close_stops:
                close_nodes_list += [{
                    'pickup': pickup_idx,
                    'dropoff': dropoff_idx,
                    'close_nodes': close_nodes
                }]
    return close_nodes_list

def group_pickup_deliveries(stops, active_rides=None):
    '''
    Receives route stops and a list of active rides (optional) and creates:
    - pickups_deliveries: array with pickup and dropoff indexes for each ride
    - pickup_dict: dictionary that matches dropoff indexes with pickup indexes
    - lone_dropoffs: array with ride id and dropoff index for those rides already picked-up
    - picked_up_passengers: used seat count for non-ada passengers
    - picked_up_ada_passengers: used seat count for ada passengers
    These indexes are according to their stop position in the route stops.
    If active_rides are provided, grouping will only happen for active rides.
    '''
    pickup_dict = {}
    stops_dict = {}
    pickups_deliveries = []
    lone_dropoffs = []
    picked_up_passengers = 0
    picked_up_ada_passengers = 0

    # Match stops from a ride (pickup + dropoff) and corresponding passenger count into stops_dict
    for idx, stop in enumerate(stops):
        if 'ride' in stop.keys():
            stop_id = str(stop['ride'])
        elif 'request_id' in stop.keys():
            stop_id = str(stop['request_id'])
        else:
            continue

        # Build dictionary with keys ride_id or request_id with items in the format:
        # {
        #   'pickup': <Number> (Index of pickup stop in route)
        #   'dropoff': <Number> (Index of dropoff stop in route)
        #   'passengers': <Number> (Ride passenger count)
        #   'ADApassengers': <Number> (Ride ADA passenger count)
        # }
        if stop['stopType'] == "pickup" or stop['stopType'] == "dropoff":
            if active_rides is None or stop_id in active_rides:
                if stop_id not in stops_dict:
                    stops_dict[stop_id] = {}
                stops_dict[stop_id][stop['stopType']] = idx
                stops_dict[stop_id]['passengers'] = stop['passengers']
                stops_dict[stop_id]['ADApassengers'] = stop['ADApassengers']

    for [key, item] in stops_dict.items():
        if "pickup" in item.keys() and "dropoff" in item.keys():
            pickups_deliveries += [[
                item["pickup"],
                item["dropoff"]
            ]]
            pickup_dict[item["dropoff"]] = item["pickup"]
        elif "pickup" not in item.keys():
            lone_dropoffs += [[key, item["dropoff"]]]
            picked_up_passengers += item["passengers"]
            picked_up_ada_passengers += item['ADApassengers']

    return [
        pickups_deliveries, pickup_dict,
        lone_dropoffs, picked_up_passengers,
        picked_up_ada_passengers
    ]

def get_stop_limit_for_picked_up(old_plan, lone_dropoff):
    '''
    Receives initial driver's plan and dropoff indexes for already picked-up rides
    and calculates allowed fixed-stops / stops limit with actions that already happened
    '''
    counting_stops = {}
    dropoff_limit = {}
    curr_fs = False
    for stop in old_plan:
        if stop['stopType'] == "current_location":
            continue
        is_fs = 'fixedStopId' in stop
        same_fs = is_fs and stop['fixedStopId'] == curr_fs
        for drop_ride_id, idx in lone_dropoff:
            if (
                stop['stopType'] == "dropoff"
                and drop_ride_id in counting_stops
                and counting_stops[drop_ride_id]
                and drop_ride_id == str(stop['ride'])
            ):
                counting_stops[drop_ride_id] = False
            if (
                stop['status'] == "done"
                and drop_ride_id in counting_stops
                and counting_stops[drop_ride_id]
                and drop_ride_id != str(stop['ride'])
            ):
                if not is_fs or not same_fs:
                    dropoff_limit[drop_ride_id][1] -= 1
            if (
                stop['stopType'] == "pickup"
            ) and (
                drop_ride_id == str(stop['ride'])
            ) and (
                drop_ride_id not in dropoff_limit
            ):
                counting_stops[drop_ride_id] = True
                # At most 2 fixed-stops / stops before dropoff
                dropoff_limit[drop_ride_id] = [idx, 3]
        curr_fs = 'fixedStopId' in stop and stop['fixedStopId']
    return dropoff_limit

def get_unfulfilled_stops(route_, current_location, request_actions=None):
    '''
    Splits a driver's route into fulfilled and unfulfilled actions and builds
    a route (stops) with fullfilled actions first and unfulfilled, including
    request actions, at the end:
    - prefix_route: fulfilled (done or cancelled) and current location actions
    - remaining_route: unfulfilled actions (waiting) starting with a current location action
    - stops: route with fulfilled actions, followed by unfulfilled and then request actions
    '''
    route = copy.deepcopy(sort_completed_stops(route_))

    status_curr = [item['status'] for item in route]

    sufix_route = []
    prefix_route = []
    remaining_route = []

    # Find index of first unfulfilled stop
    if "waiting" in status_curr:
        last_stop_idx = status_curr.index("waiting")
        sufix_route = route[last_stop_idx:]
        prefix_route = route[:last_stop_idx]

        remaining_route = [current_location] + sufix_route

    # Build unfulfilled stops array
    if request_actions:
        stops = [current_location] + sufix_route + request_actions
    else:
        stops = [current_location] + sufix_route

    return [prefix_route, remaining_route, stops]

def get_current_plan_distances(route_stops, data_model):
    '''
    Extracts the diagonal from distance matrix that defines the old route's
    unfulfilled distance cost between each action, starting with current
    driver's location and then fulfilling each action in the initial order
    '''
    dist_matrix = data_model['distance_matrix']
    route_distances = [0]
    route_distances += [dist_matrix[idx][idx + 1] for idx in range(len(route_stops) - 1)]

    return route_distances

def sort_completed_stops(route):
    '''
    Compiles all actions (stops) that are either done or cancelled and adds them to the beginning
    and compiles the stops that are unfullfilled and adds them end of the route
    '''
    stops_done = []
    stops_todo = []
    for idx, stop in enumerate(route):
        if '_id' in stop.keys():
            route[idx]['_id'] = str(route[idx]['_id'])
        if 'ride' in stop.keys():
            route[idx]['ride'] = str(route[idx]['ride'])
        if 'request_id' in stop.keys():
            route[idx]['request_id'] = str(route[idx]['request_id'])
        if 'fixedStopId' in stop.keys():
            route[idx]['fixedStopId'] = str(route[idx]['fixedStopId'])
        if stop['status'] == "done" or stop['status'] == "cancelled":
            stops_done += [stop]
        else:
            stops_todo += [stop]

    sorted_route = stops_done + stops_todo
    return sorted_route

def split_fixed_stops_by_status(route):
    '''
    Split fixed-stops for each action by status:
    - completed_fixed_stops: fixed-stops for actions with fixed-stop id and done status
    - to_do_fixed_stops: fixed-stops for actions with fixed-stop id and waiting status
    When fixed-stop id is not present ride id is used instead as a different 'fixed-stop'
    '''
    completed_fixed_stops = []
    to_do_fixed_stops = []
    for stop in route:
        if stop['stopType'] != "current_location" and stop['status'] == "done":
            if "fixedStopId" in stop.keys():
                completed_fixed_stops += [stop['fixedStopId']]
            elif "ride" in stop.keys():
                completed_fixed_stops += [stop['ride']]
        if stop['stopType'] != "current_location" and stop['status'] == "waiting":
            if "fixedStopId" in stop.keys():
                to_do_fixed_stops += [stop['fixedStopId']]
            elif "ride" in stop.keys():
                to_do_fixed_stops += [stop['ride']]
    return [completed_fixed_stops, to_do_fixed_stops]

def count_waiting_stops(route):
    '''
    Counts number of waiting actions
    '''
    waiting_action_count = 0
    if not route or ('stops' not in route) or len(route['stops']) == 0:
        return 0
    for stop in route['stops']:
        if stop['status'] == "waiting":
            waiting_action_count += 1
    return waiting_action_count
