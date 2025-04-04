'''
The DriverFinder module contains the logic for driver matching and driver routes' ETA update
'''
import copy
from concurrent import futures
import numpy as np

from data import DataModel
import route
import driver_processing as drivers
import utils

class DriverFinder:
    '''
    DriverFinder class provides two main functions:
    - update_route: refreshes a driver route's action order and ETA
    - find_drivers: matches a request with the optimal driver
    '''
    def __init__(self, db_client, logger):
        self.db_client = db_client
        self.logger = logger
        self.location_id = ''
        self.data_model = DataModel(logger)

    def update_route(self, driver_id, route_stops):
        '''
        Receives a driver id with current actions (route_stops)
        and returns a route with refreshed action order and ETAs
        '''
        rt_route = utils.runtime_start(self.logger, 'route_update_id',{'driver_id': str(driver_id)})

        # Fetch driver info
        driver = self.db_client.get_driver_vehicle(driver_id)

        # Fetch active location information
        [longitude, latitude] = driver['currentLocation']['coordinates']
        self.location_id = str(driver['activeLocation'])
        loc_opts = self.db_client.get_location_info(None, self.location_id)

        # Get unfulfilled stops of route
        current_location = {
            'stopType': "current_location",
            'status': "done",
            'coordinates': [latitude, longitude],
            'cost': 0,
            'distance': 0,
            'passengers': 0,
            'ADApassengers': 0
        }

        prefix_route, remaining_route, stops = route.get_unfulfilled_stops(
            route_stops, current_location
        )

        if len(stops) == 1:
            utils.runtime_stop(self.logger, rt_route, {'message': 'Empty route'})
            return {"plan": []}

        # Get vehicle capacity
        capacity_opts = utils.extract_capacity(driver)

        # Create matrix and additional data necessary to run TSP algorithm
        vehicle_profile = 'vehicle_profile' in driver and driver['vehicle_profile']
        vehicle_profile_fallback = (
            'vehicle_profile_fallback' in driver and driver['vehicle_profile_fallback']
        )
        data_model = self.data_model.create_data_model(
            copy.deepcopy(stops), typ="time", loc_opts=loc_opts,
            done_plan=prefix_route, capacity_opts=capacity_opts,
            location_id=self.location_id, vehicle_profile=vehicle_profile,
            vehicle_profile_fallback=vehicle_profile_fallback
        )

        # Runs TSP algorithm to build new route with updated ETAs
        rt_tsp = utils.runtime_start(
            self.logger, 'tsp_id',
            {'driver_id': str(driver_id), 'action_count': len(remaining_route)}
        )
        context = {'location': self.location_id, 'logger': self.logger}
        assignment, new_route, _ = utils.tsp_handler(context, data_model, "time")
        utils.runtime_stop(self.logger, rt_tsp)

        # If route building failed,
        # try again ignoring hailed rides changes to capacity
        hailed_passengers = (
            capacity_opts['hailed_passenger_count'] + capacity_opts['hailed_ada_passenger_count']
        )
        if not assignment and hailed_passengers:
            # Create matrix and additional data necessary to run TSP algorithm
            # ignoring capacity changes due to current hailed rides
            capacity_opts = utils.extract_capacity(driver, reset_hailed=True)
            [
                data_model['passenger_capacity'], data_model['ada_passenger_capacity']
            ] = utils.build_capacity(capacity_opts)

            # Runs TSP algorithm again to build new route with updated ETAs
            rt_tsp = utils.runtime_start(
                self.logger, 'tsp_id',
                {'driver_id': str(driver_id), 'retry': 'Trying without hailed capacity limitation'}
            )
            assignment, new_route, _ = utils.tsp_handler(context, data_model, "time")
            utils.runtime_stop(self.logger, rt_tsp)

        if (
            not assignment
            and 'dropoff_stop_limit' in data_model and len(data_model['dropoff_stop_limit'])
        ):
            # Create matrix and additional data necessary to run TSP algorithm
            # without at most 2 stops before dropoff constraint
            data_model['dropoff_stop_limit'] = {}

            # Runs TSP algorithm again to build new route with updated ETAs
            rt_tsp = utils.runtime_start(
                self.logger, 'tsp_id',
                {'driver_id': str(driver_id), 'retry': 'Trying without hailed capacity limitation'}
            )
            assignment, new_route, _ = utils.tsp_handler(context, data_model, "time")
            utils.runtime_stop(self.logger, rt_tsp)

        if not assignment:
            utils.runtime_stop(self.logger, rt_route, {'message': 'Could not process route update'})
            return prefix_route + remaining_route[1:]

        utils.runtime_stop(self.logger, rt_route, {'message': 'Route update was successful'})

        updated_plan = prefix_route + new_route
        updated_plan = utils.add_margin(updated_plan)
        return {"plan": updated_plan}

    def find_drivers(self, request_id='5cbbc72cf8143425df68fae1'):
        '''
        Receives a request id and returns an optimal driver with generated route
        '''
        self.logger.info("Finding driver for " + str(request_id))

        # Fetch request information
        request_info = self.db_client.get_request(request_id)
        request_actions = utils.build_request_actions(request_info)

        # Fetch location and global settings configuration
        self.location_id = str(request_info['location'])
        loc_opts = self.db_client.get_location_info({}, self.location_id)
        global_opts = self.db_client.get_settings_info()

        # Fetch available drivers
        available_drivers = self.db_client.get_driver_ride_list(request_info)
        available_drivers = list(filter(drivers.check_waiting_stops_limit, available_drivers))

        # Split drivers into buckets by vehicle call order
        if loc_opts["fleetEnabled"]:
            buckets = utils.vehicle_call_order(available_drivers, request_info)
        else:
            buckets = [available_drivers]


        rt_buckets = utils.runtime_start(
            self.logger,
            'buckets_id',
            {
                'skippingTSP': global_opts['skipDistanceTSP'],
                'buckets': [
                    [str(driver['_id']) for driver in bucket] for bucket in buckets
                ]
            }
        )

        bucket_times = []
        for idx, driver_list in enumerate(buckets):

            # Can be either set as 'closest' or unset for for a default nearest to pickup sorting
            # using query's $geoNear dist.calculated distance sort
            # or 'idle' for least ride count sorting
            if global_opts['driverLimitSort'] == 'idle':
                driver_list = drivers.sort_drivers_by_ride_count(driver_list)

            # Can be either set as '' for unlimited, a value or unset for a default of 10
            if global_opts['initialDriverLimit'] != '':
                driver_list = driver_list[:global_opts['initialDriverLimit']]

            driver_dict = utils.build_driver_dict(driver_list)

            rt_driver_assign = utils.runtime_start(
                self.logger, 'driver_assign_id',
                {'available_drivers': list(driver_dict.keys())}
            )

            # If global settings option for distance TSP is active,
            # run TSP for drivers to obtain increase in distance (detour)
            # for sorting by increasing detour and limiting number of drivers to evaluate
            if not global_opts['skipDistanceTSP']:
                ride_count_list = [
                    len(driver['driverRideList']) for _, driver in driver_dict.items()
                ]
                ride_count = np.average(ride_count_list) if len(ride_count_list) else 0
                rt_dist_tsp = utils.runtime_start(
                    self.logger,
                    'distance_tsp',
                    {
                        'driver_count': len(driver_dict.keys()),
                        'ride_count': ride_count
                    }
                )
                # Run TSP using distance and order available drivers by detour distance asc
                sorted_drivers = self.__tsp(
                    request_actions, driver_dict, list(driver_dict.keys()),
                    typ="distance", loc_opts=loc_opts
                )
                utils.runtime_stop(self.logger, rt_dist_tsp)

                if len(sorted_drivers) == 0:
                    bucket_rt = utils.runtime_stop(
                        self.logger,
                        rt_driver_assign,
                        {'message': f"No drivers available from vehicle call {idx}"}
                    )
                    bucket_times += [bucket_rt['runtime']]
                    continue
            else:
                sorted_drivers = [str(driver['_id']) for driver in driver_list]

            # Filter best 10 or as configured in global settings finalDriverLimit
            ten_pick = sorted_drivers[:global_opts['finalDriverLimit']]
            ten_dict = {k: v for (k, v) in driver_dict.items() if k in ten_pick}

            # Run TSP to obtain a new route, including new request actions,
            # with cost of distance and time between each action
            ride_count_list = [len(driver['driverRideList']) for _, driver in driver_dict.items()]
            ride_count = np.average(ride_count_list) if len(ride_count_list) else 0
            rt_time_tsp = utils.runtime_start(
                self.logger,
                'time_tsp',
                {
                    'driver_count': len(driver_dict.keys()),
                    'ride_count': ride_count
                }
            )

            best_drivers = self.__tsp(
                request_actions, ten_dict, ten_pick, typ="time", loc_opts=loc_opts
            )
            utils.runtime_stop(self.logger, rt_time_tsp)

            if len(best_drivers) == 0:
                bucket_rt = utils.runtime_stop(
                    self.logger,
                    rt_driver_assign,
                    {'message': f"No drivers could be assigned from vehicle call {idx}"}
                )
                bucket_times += [bucket_rt['runtime']]
                continue

            plan = best_drivers[0]['new']['full_route']
            plan = utils.add_margin(plan)
            best_driver = {
                'driver': best_drivers[0]['id'],
                'plan': plan,
                'profile': best_drivers[0]['profile']
            }

            success_timer_data = {
                'message': 'Best driver assigned',
                'driver_id': str(best_driver['driver'])
            }
            bucket_rt = utils.runtime_stop(self.logger, rt_driver_assign, success_timer_data)
            bucket_times += [bucket_rt['runtime']]
            success_timer_data.update({'bucket_times': bucket_times})
            utils.runtime_stop(self.logger, rt_buckets, success_timer_data)
            return best_driver

        utils.runtime_stop(self.logger, rt_buckets, {
            'message': 'No drivers could be assigned',
            'bucket_times': bucket_times
        })
        return []

    def __process_driver(self, driver_info, request_actions, typ, loc_opts, pool_id=''):
        rt_process_driver = utils.runtime_start(
            self.logger, 'process_driver_id', {'thread_pool_id': pool_id}
        )
        current_location = {
            'stopType': "current_location",
            'status': "done",
            'coordinates': driver_info['currentLocation']['coordinates'][::-1],
            'cost': 0,
            'distance': 0,
            'passengers': 0,
            'ADApassengers': 0
        }

        if (
            'activeRoute' in driver_info
            and 'stops' in driver_info['activeRoute']
            and len(driver_info['activeRoute']['stops']) > 0
        ):
            old_route = copy.deepcopy(driver_info['activeRoute']['stops'])
        else:
            old_route = []

        # Build route stops with unfulfilled stops of route and request actions
        prefix_route, remaining_route, stops = route.get_unfulfilled_stops(
            old_route, current_location, request_actions=request_actions
        )

        # Create matrix and additional data necessary to run TSP algorithm
        capacity_opts = utils.extract_capacity(driver_info)
        vehicle_profile = 'vehicle_profile' in driver_info and driver_info['vehicle_profile']
        vehicle_profile_fallback = (
            'vehicle_profile_fallback' in driver_info and driver_info['vehicle_profile_fallback']
        )
        data_model = self.data_model.create_data_model(
            copy.deepcopy(stops), typ=typ, loc_opts=loc_opts,
            done_plan=prefix_route, capacity_opts=capacity_opts,
            location_id=self.location_id, vehicle_profile=vehicle_profile,
            vehicle_profile_fallback=vehicle_profile_fallback
        )

        # Run TSP algorithm to build new route with request actions
        rt_tsp = utils.runtime_start(
            self.logger, 'tsp_id',
            {'driver_id': str(driver_info['_id']), 'action_count': len(remaining_route)}
        )
        context = {'location': self.location_id, 'logger': self.logger}
        [assignment, new_route, new_route_distances] = utils.tsp_handler(context, data_model, typ)
        utils.runtime_stop(self.logger, rt_tsp)

        # If route building failed, try again
        # without keeping next action even if close (within location's inversionRangeFeet)
        if not assignment:
            if 'close_nodes' in data_model:
                del data_model['close_nodes']
            if 'keep_first_stop' in data_model:
                del data_model['keep_first_stop']
            assignment, new_route, new_route_distances = utils.tsp_handler(context, data_model, typ)

        utils.runtime_stop(self.logger, rt_process_driver)
        return [
            data_model, assignment, old_route, remaining_route,
            new_route, new_route_distances, prefix_route, driver_info
        ]

    def __tsp(self, request_actions, driver_dict, driver_keys, typ="distance", loc_opts=None):

        # Run driver processing concurrently to build route with request actions for each one
        results = []
        rt_pool = utils.runtime_start(
            self.logger, 'thread_pool_id', {'type': typ, 'driver_number': len(driver_keys) }
        )
        with futures.ThreadPoolExecutor(max_workers=10) as ex:
            driver_infos = [driver_dict[key] for key in driver_keys]
            n_drivers = len(driver_infos)
            results = list(
                ex.map(
                    self.__process_driver, driver_infos,
                    [request_actions] * n_drivers,
                    [typ] * n_drivers,
                    [loc_opts] * n_drivers,
                    [rt_pool['thread_pool_id']] * n_drivers
                )
            )
        utils.runtime_stop(self.logger, rt_pool)

        # Evaluate each driver
        route_list = []
        for processed_driver in results:
            [
                data_model, assignment, old_route, remaining_route,
                new_route, new_route_distances, prefix_route, driver_info
            ] = processed_driver

            # If unable to build route for driver, remove driver from candidates
            if not assignment:
                self.logger.info("\t>>> Could not get route for driver " + str(driver_info['_id']))
                continue

            # Get initial route distances between each unfulfilled action
            route_distances = route.get_current_plan_distances(remaining_route, data_model)

            if assignment:
                driver_plan = copy.deepcopy({
                    'id': str(driver_info['_id']),
                    'new': {
                        'plan': new_route,
                        'total_dist': new_route_distances,
                        'full_route': prefix_route + new_route
                    },
                    'old': {
                        'plan': remaining_route,
                        'total_dist': route_distances,
                        'full_route': old_route
                    },
                    'profile': data_model['profile']
                })

                # Filter out drivers based on exclusion limits
                if typ == "time":
                    # Travel time should not exceed 30 min
                    travel_time_check = drivers.apply_filter(
                        "travel_time", driver_plan,
                        location_queue_limit=loc_opts['queueTimeLimit'],
                        logger=self.logger
                    )
                    # Riders already assigned to car should not see ETA increases
                    # longer than location limit
                    eta_increase_limit_check = drivers.apply_filter(
                        "eta_increase_limit", driver_plan,
                        eta_increase_limit=loc_opts['etaIncreaseLimit'],
                        logger=self.logger
                    )
                    # Prevent match for requests with same pickup fixed stop
                    # as the one driver already left
                    fixed_stop_return_check = drivers.apply_filter(
                        "fixed_stop_check", driver_plan,
                        request_actions=request_actions,
                        logger=self.logger
                    )

                    # If driver passes all checks
                    if travel_time_check and eta_increase_limit_check and fixed_stop_return_check:
                        to_add = True
                    else:
                        to_add = False
                else:
                    to_add = True

                if to_add:
                    route_list += [driver_plan]

        if len(route_list) == 0:
            return []
        else:
            if len(route_list) == 1:
                sorted_drivers = route_list
            else:
                sorted_drivers = drivers.sort_drivers(
                    typ, route_list, location_cancel_time=loc_opts['cancelTime']
                )

        if typ == "time":
            return sorted_drivers
        else:
            return [driver['id'] for driver in sorted_drivers]
