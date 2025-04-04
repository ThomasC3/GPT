'''
Drivers provides function for sorting, filtering and evaluating drivers
'''
import numpy as np
import route

def get_eval(typ, route_info):
    """
    This function helps calculates the driver fitness by creating
    helper fit variables based on driver route.
    Eval options are:
    - total_travel_time: calculates the time elapsed between route start
    and the end of all actions in route
    - pickup_count: calculates for each ride the number of pickups until the ride's dropoff
    - new_rider_wait: calculates the time to pickup of new rider
    - eta_increase: calculates increase in time to pickup from originally given ETA
    """
    plan = route_info['plan']
    full_route = route_info['full_route']

    if typ == "total_travel_time":
        if len(plan) > 0:
            route_start = plan[0]['cost']
            route_end = plan[-1]['cost']

            total_route_time_seconds = route_end - route_start
        else:
            total_route_time_seconds = 0
        return total_route_time_seconds

    elif typ == "pickup_count":
        active_rides = []
        for stop in plan:
            if 'ride' in stop.keys():
                active_rides += [stop['ride']]
            elif 'request_id' in stop.keys():
                active_rides += [stop['request_id']]

        pickups_deliveries, *_ = route.group_pickup_deliveries(
            full_route, active_rides=active_rides
        )

        pick_counts_for_ride = {}
        for pick_drop in pickups_deliveries:
            trip = full_route[pick_drop[0]:pick_drop[1] + 1]
            if 'ride' in trip[0].keys():
                ride_id = str(trip[0]['ride'])
            elif 'request_id' in trip[0].keys():
                ride_id = str(trip[0]['request_id'])
            n_picks = 0
            for stop in trip[1:]:
                if stop['stopType'] == "pickup" and stop['status'] != "cancelled":
                    n_picks += 1
            pick_counts_for_ride[ride_id] = n_picks
        return pick_counts_for_ride

    elif typ == "new_rider_wait":
        new_rider_wait_sec = 0
        starting_eta = plan[0]["cost"]
        for stop in plan:
            if 'request_id' in stop.keys():
                pickup_eta = stop["cost"]
                new_rider_wait_sec = pickup_eta - starting_eta
                break
        return new_rider_wait_sec

    elif typ == "eta_increase":
        eta_increases = []
        for stop in plan:
            if stop['stopType'] == "pickup" and stop['status'] != "cancelled":
                if "initialEta" in stop.keys() and stop["initialEta"]:
                    eta_increases += [(stop["cost"] - stop["initialEta"])]
        return eta_increases

def sort_drivers_by_ride_count(driver_list):
    '''
    Sorts driver list by increasing number of rides associated that are not yet fullfilled
    '''
    sort_value_list = [driver['activeRidesCount'] for driver in driver_list]

    ordered_idx = np.argsort(sort_value_list)
    sorted_drivers = list(np.array(driver_list)[ordered_idx])
    return sorted_drivers

def sort_drivers(typ, driver_list, location_cancel_time=10):
    '''
    Receives a type (typ) of matrix to be used in the TSP (time or distance) and the
    location cancel time with maximum time a new rider may wait to be picked up.
    If time or distance:
    - First sorts drivers by increasing detour distance
    If time:
    - Then, splits drivers into those will have new rider wait longer than the cancel time limit
    and drivers that won't, reamining in same order as previous sorting
    - Sorts by increasing wait time those that exceed the cancel time limit 
    - Rebuilds array with drivers that do not exceed first and drivers that exceed
    '''
    # If typ is distance or time,
    # Sort increasing detour distance
    cost_list = []
    for driver in driver_list:
        if sum(driver['old']['total_dist']) == 0:
            cost_list += [driver['new']['total_dist'][1]]
        else:
            cost_list += [sum(driver['new']['total_dist']) - sum(driver['old']['total_dist'])]

    ordered_idx = np.argsort(cost_list)
    sorted_drivers = list(np.array(driver_list)[ordered_idx])

    # If typ is time,
    # - Split drivers by exceeding or not cancel time limit, keeping previous sorting order
    # - Sort drivers that exceed limit by increasing wait time
    # - Rebuild array with drivers that do not exceed first and drivers that exceed
    if typ == "time":
        ok_drivers, ok_drivers_times = [], []
        fail_drivers, fail_drivers_times = [], []
        wait_times = [
            get_eval("new_rider_wait", driver['new']) for driver in sorted_drivers
        ]
        for idx, driver in enumerate(sorted_drivers):
            if wait_times[idx] > location_cancel_time * 60:
                fail_drivers += [driver]
                fail_drivers_times += [wait_times[idx]]
            else:
                ok_drivers += [driver]
                ok_drivers_times += [wait_times[idx]]

        all_times = ok_drivers_times
        if len(fail_drivers_times) > 0:
            fail_ordered_idx = np.argsort(fail_drivers_times)
            fail_drivers = list(np.array(fail_drivers)[fail_ordered_idx])
            all_times += list(np.array(fail_drivers_times)[fail_ordered_idx])

        sorted_drivers = ok_drivers + fail_drivers

    return sorted_drivers

def apply_filter(
    typ, driver_plan, location_queue_limit=30, eta_increase_limit=15,
    request_actions=None, logger=None
):
    '''
    Filters out drivers that do not meet the requirements:
    - travel_time: fully fulfilling queue should not take more than location_queue_limit
    - eta_increase_limit: time to pickup from originally given ETA should not increase
    past eta_increase_limit
    - fixed_stop_check: last fixed-stop driver already went through should not be
    same as request's pickup
    '''
    driver_id = driver_plan['id']
    new_plan = driver_plan['new']
    old_plan = driver_plan['old']

    # Filter out if total travel time is more than location limit
    if typ == "travel_time":
        if len(old_plan['plan']) == 0:
            return True
        travel_time = get_eval("total_travel_time", new_plan)
        if travel_time <= location_queue_limit * 60:
            return True
        else:
            logger.info(f'''
                \t>>> Driver {driver_id} not added as route longer than {location_queue_limit} min.
            ''')
            return False

    # Filter out if there are ETA increases longer than location limit
    elif typ == "eta_increase_limit":
        eta_increases = get_eval("eta_increase", new_plan)
        for increase in eta_increases:
            if increase >= eta_increase_limit * 60:
                logger.info(f'''
                    \t>>> Driver {driver_id} not added because eta increase
                    for a rider was longer than {eta_increase_limit} min.
                ''')
                return False
        return True

    # Filter out if the pickup is the same as last done fixed stop
    elif typ == "fixed_stop_check":
        if "fixedStopId" not in request_actions[0].keys():
            return True
        [
            completed_fixed_stops, to_do_fixed_stops
        ] = route.split_fixed_stops_by_status(old_plan['full_route'])
        # If last done fixed-stop is the same as the request's pickup
        if len(completed_fixed_stops) > 0 and (
            completed_fixed_stops[-1] == request_actions[0]["fixedStopId"]
        ):
            # and next waiting fixed-stop is not the same as last done fixed-stop
            if to_do_fixed_stops and to_do_fixed_stops[0] != completed_fixed_stops[-1]:
                logger.info(
                    f"\t>>> Driver {driver_id} not added because driver just passed fixed-stop."
                )
                return False
        return True

def check_waiting_stops_limit(driver):
    '''
    Checks if remaining actions is less than 2 per ride
    for a limit of 4 rides
    '''
    if 'activeRoute' in driver:
        return route.count_waiting_stops(driver['activeRoute']) <= 8
    else:
        return True
