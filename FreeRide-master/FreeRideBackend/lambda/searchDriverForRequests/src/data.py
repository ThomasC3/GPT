'''
The Data module provides the tools to build necessary matrices and additional data
in order to run TSP with the proper constraint information
'''
import os
import traceback
import json
import requests
import sentry_sdk

from conversion import feetToMeters
from exceptions import (
    GraphHopperServerError, GraphHopperLimitError, GraphHopperDefaultError,
    GraphHopperProfileError, GraphHopperMatrixError
)
import route
import utils


class DataModel:
    '''
    DataModel provides tools to create model and keeps track of excessive use of graphopper,
    limiting any further use in the current run
    '''
    def __init__(self, logger):
        self.logger = logger
        self.gh_limited = False

        try:
            self.default_vehicle_profile = os.environ['GH_VEHICLE_PROFILE']
            self.default_vehicle_profile_fallback = os.environ['GH_VEHICLE_PROFILE_FALLBACK']
        # pylint: disable=broad-exception-caught
        except Exception as error:
        # pylint: enable=broad-exception-caught
            logger.error(error)
            logger.debug(traceback.format_exc())
            sentry_sdk.capture_exception(error)
            self.default_vehicle_profile = 'scooter'
            self.default_vehicle_profile_fallback = 'scooter'

    def create_data_model(
        self, stops, typ="distance", done_plan=None, loc_opts=None,
        capacity_opts=None, location_id=None, vehicle_profile=None,
        vehicle_profile_fallback=None
    ):
        '''
        Receives stops, matrix type, fulfilled stops, location settings,
        passenger information (vehicle capacity, picked up passengers), 
        location id (for error reporting) and vehicle profile and fallback strings
        and creates matrices (n_stop x n_stop) of cost between all nodes
        (distance_matrix and time_matrix) and additional calculated data for TSP constraints:
        - pickups_deliveries: array with pickup and dropoff indexes for each ride
        - pickup_dict: dictionary that matches dropoff indexes with pickup indexes
        - lone_dropoffs: array with ride id and dropoff index for those rides already picked-up
        - picked_up_passengers: used seat count for non-ada passengers
        - picked_up_ada_passengers: used seat count for ada passengers
        - close_nodes: 
        - ride_capacity: maximum number of rides that can be picked up without a dropoff
        - passenger_capacity: vehicle capacity for non-ada passengers
        - ada_passenger_capacity: vehicle capacity count for ada passengers
        - keep_first_stop: if first unfulfilled stop is close enough to keep as first action
        And default data for TSP algorithm:
        - num_vehicles: 1 vehicle per driver
        - depot: index of starting point
        '''

        if not vehicle_profile:
            vehicle_profile = vehicle_profile = self.default_vehicle_profile
        if not vehicle_profile_fallback:
            vehicle_profile_fallback = self.default_vehicle_profile_fallback

        data = {}
        data['nodes'] = stops
        if typ == "distance":
            data['distance_matrix'] = self.__build_distance_matrix(stops)
            data['profile'] = 'euclidean_dist'
        else:
            [
                data['distance_matrix'],
                data['time_matrix'],
                data['profile']
             ] = self.__build_time_matrix(
                 stops, location_id, vehicle_profile, vehicle_profile_fallback
            )

        # Make return to depot instantaneous (prevent TSP cycle)
        for idx in range(len(data['distance_matrix'])):
            data['distance_matrix'][idx][0] = 0

        # Build data relevant for TSP constraints
        [
            data['pickups_deliveries'],
            data['pickup_dict'],
            data['lone_dropoffs'],
            data['picked_up_passengers'],
            data['picked_up_ada_passengers'],
        ] = route.group_pickup_deliveries(stops)
        if done_plan and len(done_plan) > 0:
            data['dropoff_stop_limit'] = route.get_stop_limit_for_picked_up(
                done_plan, data['lone_dropoffs']
            )
        data['close_nodes'] = route.group_close_nodes(data)
        data['num_vehicles'] = 1
        data['depot'] = 0
        data['ride_capacity'] = loc_opts['concurrentRideLimit']
        [
            data['passenger_capacity'], data['ada_passenger_capacity']
        ] = utils.build_capacity(capacity_opts)

        max_first_stop_distance_m = feetToMeters(loc_opts['inversionRangeFeet'])
        data['keep_first_stop'] = False
        if data['distance_matrix'][0][1] <= max_first_stop_distance_m:
            data['keep_first_stop'] = True

        return data

    def __build_distance_matrix(self, stops):
        distance_matrix = list(
            [
                [utils.calc_dist(node_a['coordinates'], node_b['coordinates']) for node_b in stops]
                for node_a in stops
            ]
        )
        return distance_matrix

    def __build_time_matrix(
            self, stops, location_id, vehicle_profile, vehicle_profile_fallback, try_number=0
        ):
        if try_number == 0:
            vehicle = vehicle_profile
        else:
            vehicle = vehicle_profile_fallback

        points = {
            "from_points": [stop['coordinates'][::-1] for stop in stops],
            "to_points": [stop['coordinates'][::-1] for stop in stops],
            "out_arrays": ["times", "distances"],
            "vehicle": vehicle
        }

        params = {"key": os.environ['GH_API_KEY']}
        headers = {'Content-type': 'application/json'}

        rt_matrix = utils.runtime_start(self.logger, 'matrix_id')

        has_graphhoper_key = os.environ['GH_API_KEY'] != ""
        if has_graphhoper_key and not self.gh_limited:
            try:
                req = requests.post(
                    'https://graphhopper.com/api/1/matrix',
                    headers=headers, json=points, params=params, timeout=30
                )
                rt_matrix_stop = utils.runtime_stop(
                    self.logger, rt_matrix,
                    {'mode': "gh", 'vehicle_profile': vehicle}
                )
                gh_time = rt_matrix_stop['runtime']

                # GRAPHHOPPER REQUEST CREDITS
                rate_headers = {}
                if 'X-RateLimit-Limit' in req.headers:
                    rate_headers['GH_X_RateLimit_Limit'] = req.headers['X-RateLimit-Limit']
                if 'X-RateLimit-Remaining' in req.headers:
                    rate_headers['GH_X_RateLimit_Remaining'] = req.headers['X-RateLimit-Remaining']
                if 'X-RateLimit-Reset' in req.headers:
                    rate_headers['GH_X_RateLimit_Reset'] = req.headers['X-RateLimit-Reset']
                if 'X-RateLimit-Credits' in req.headers:
                    rate_headers['GH_X_RateLimit_Credits'] = req.headers['X-RateLimit-Credits']
                self.logger.info('GRAPHHOPPER REQUEST CREDITS')
                self.logger.info(json.dumps(rate_headers))

                if req.status_code >= 500:
                    raise GraphHopperServerError(
                        req_info="[" + str(req.status_code) + "] " + req.text,
                        body=points, time=gh_time
                    )
                elif req.status_code == 429:
                    self.gh_limited = True
                    raise GraphHopperLimitError(
                        req_info="[" + str(req.status_code) + "] " + req.text,
                        body=points, time=gh_time
                    )

                json_response = req.json()

                if req.status_code == 200:
                    dist_matrix = json_response['distances']
                    time_matrix = json_response['times']
                    return dist_matrix, time_matrix, vehicle
                elif (
                    (
                        req.status_code == 400
                    ) and (
                        try_number == 0
                    ) and (
                        "message" in json_response.keys()
                    ) and (
                        "profile" in json_response['message']
                    )
                ):
                    additional_info = {
                        'status_code': req.status_code,
                        'message': json_response['message'],
                        'vehicle': vehicle,
                        'location': location_id
                    }
                    tags = {
                        'location': location_id,
                        'vehicle': vehicle
                    }
                    message = f"Profile {vehicle} cannot be used with this account"
                    error = GraphHopperProfileError(message, additional_info, tags)
                    self.logger.info(error)
                    utils.handle_exception(error)
                    return self.__build_time_matrix(
                        stops, location_id, vehicle_profile, vehicle_profile_fallback, 1
                    )
                elif (
                    (
                        req.status_code == 400
                    ) and (
                        try_number == 0
                    ) and (
                        "hints" in json_response.keys()
                    )
                ):
                    location_error_info = {
                        'status_code': req.status_code,
                        'message': json_response['message'],
                        'location': location_id,
                        'matrix': [stop['coordinates'][::-1] for stop in stops]
                    }
                    tags = {
                        'location': location_id,
                        'vehicle': vehicle
                    }
                    self.logger.info(json.dumps(location_error_info))
                    message = "Could not calculate matrix"
                    error = GraphHopperMatrixError(message, location_error_info, tags)
                    self.logger.info(error)
                    utils.handle_exception(error)
                    return self.__build_time_matrix(
                        stops, location_id, vehicle_profile, vehicle_profile_fallback, 1
                    )
                else:
                    additional_info = {
                        'status_code': req.status_code,
                        'text': req.text,
                        'points': points,
                        'time': gh_time
                    }
                    tags = {
                        'location': location_id,
                        'vehicle': vehicle
                    }
                    raise GraphHopperDefaultError("Default error", additional_info, tags)
            # pylint: disable=broad-exception-caught
            except Exception as error:
            # pylint: enable=broad-exception-caught
                self.logger.info(error)
                utils.runtime_stop(
                    self.logger, rt_matrix, {'mode': "exception", 'exception': type(error).__name__}
                )
                self.logger.debug(traceback.format_exc())
                utils.handle_exception(error)

        dist_matrix = self.__build_distance_matrix(stops)
        m_per_second = 40000 / (60 * 60)
        estimated_time_matrix = [[cell / m_per_second for cell in line] for line in dist_matrix]

        if not has_graphhoper_key or self.gh_limited:
            utils.runtime_stop(
                self.logger, rt_matrix, {'mode': "euclidean", 'limited': self.gh_limited}
            )
        return dist_matrix, estimated_time_matrix, 'euclidean'
