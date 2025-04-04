'''
The DBAccess module contains the logic for database connection setup and usage
'''
import os
import traceback
import urllib.parse
import sentry_sdk
from pymongo import MongoClient
from bson.objectid import ObjectId
from exceptions import DatabaseLocationError
from validator import valid_boolean, valid_sort_option
from utils import runtime_start, runtime_stop

LOCATION_SCHEMA_DEFAULTS = [
    ['cancelTime', 10, int],
    ['queueTimeLimit', 30, int],
    ['inversionRangeFeet', 2300, int],
    ['etaIncreaseLimit', 15, int],
    ['concurrentRideLimit', 3, int],
    ['fleetEnabled', False, bool]
]

SETTINGS_SCHEMA_DEFAULTS = [
    ['driverLimitSort', 'closest', valid_sort_option],
    ['initialDriverLimit', 10, int],
    ['skipDistanceTSP', False, valid_boolean],
    ['finalDriverLimit', 10, int]
]
class DBAccess:
    '''
    DBAccess provides client connection to the database
    and functions to help in database querying
    '''
    def __init__(self, logger):
        self.logger = logger
        self.logger.info("Creating database connection")
        conn = None
        typ = ""

        if os.environ.get('DEV_DB_CLUSTER_HOST') is not None:
            typ = "Cluster"
            user = os.environ['DEV_DB_USER']
            password = urllib.parse.quote_plus(os.environ['DEV_DB_PWD'])
            cluster_url = os.environ['DEV_DB_CLUSTER_HOST']
            database = os.environ['DEV_DB']
            url = f'mongodb://{user}:{password}@{cluster_url}/{database}'

            replica_set = os.environ['DEV_REPLICA_SET']
            auth_src = os.environ['DEV_AUTH_SRC']
            url += f'?ssl=true&replicaSet={replica_set}&authSource={auth_src}'

            conn = MongoClient(url)
        else:
            typ = "Standalone EC2"
            conn = MongoClient(
                host=os.environ['DEV_DB_HOST'],
                port=int(os.environ['DEV_DB_PORT']),
                username=os.environ['DEV_DB_USER'],
                password=os.environ['DEV_DB_PWD'],
                authSource=os.environ['DEV_DB'])

        self.client = conn[os.environ['DEV_DB']]
        self.logger.info(f'''
            {typ} database connection created for {os.environ['DEV_DB']} with user {os.environ['DEV_DB_USER']}.
        ''')

    def get_request(self, request_id):
        '''
        Receives a request id and fetches request with matching id from database
        '''
        rt_request = runtime_start(self.logger, 'db_call_id', {'collection': 'Requests'})
        request = self.client.Requests.find_one({"_id": ObjectId(request_id)})
        runtime_stop(self.logger, rt_request)
        return request

    def get_driver_ride_list(self, request):
        '''
        Receives request information and fetches avaliable drivers for request
        with current route information
        '''
        rt_drivers = runtime_start(self.logger, 'db_call_id', {'collection': 'Drivers'})

        req_passenger_n = request['passengers']
        req_ada_passengers_n = 0
        location = self.get_location(request["location"])
        max_ride_n = 5

        # Prevent ADA request in non-ADA location
        if not location:
            return []
        if ("isADA" in request.keys() and request["isADA"]):
            if ("isADA" not in location.keys() or location["isADA"] is not True):
                return []

        # If request isADA filter drivers that accept ADA
        if request["isADA"]:
            services = ['mixed_service', 'ada_only']
            req_passenger_n -= 1
            req_ada_passengers_n = 1
        else:
            services = ['mixed_service', 'passenger_only']


        # Filter by available drivers with same active location as request
        # and with vehicle capacity that can fulfil request
        active_drivers = {
            'isAvailable': True,
            'activeLocation': request['location']
        }

        if ("fleetEnabled" in location.keys() and location["fleetEnabled"]):
            active_drivers['vehicle.service.key'] = { '$in': services }
            pax_capacity = '$vehicle.passengerCapacity'
            pax_ada_capacity = '$vehicle.adaCapacity'
        else:
            active_drivers['isADA'] = "isADA" in request.keys() and request["isADA"]
            pax_capacity = 3 if active_drivers['isADA'] else 5
            pax_ada_capacity = 1 if active_drivers['isADA'] else 0

        drivers = self.client.Drivers.aggregate([
            {
                '$geoNear': {
                    'query': active_drivers,
                    'near': {
                        'type': 'Point',
                        'coordinates': [request['pickupLongitude'], request['pickupLatitude']]
                    },
                    'distanceField': 'dist.calculated'
                }
            },
            {
                '$sort': { 'dist.calculated': 1 }
            },
            {
                '$addFields': {
                    'pax_capacity': pax_capacity,
                    'pax_ada_capacity': pax_ada_capacity,
                    'activeRidesCount': { '$size': { '$ifNull': ['$driverRideList', []] } },
                    'hailedRideInfo': {
                        '$reduce': {
                            'input': {'$ifNull': ['$driverRideList', []]},
                            'initialValue': {
                                'passengerCount': 0,
                                'ADApassengerCount': 0
                            },
                            'in': {
                                'passengerCount': {
                                    '$add': [
                                        '$$value.passengerCount',
                                        {
                                            '$cond': {
                                                'if': { '$eq': [ '$$this.dropoffLatitude', None ] },
                                                'then': {
                                                    '$cond': {
                                                        'if': { '$eq': [ '$$this.isADA', True ] },
                                                        'then': {
                                                            '$subtract': ['$$this.passengers', 1]
                                                        },
                                                        'else': '$$this.passengers'
                                                    }
                                                },
                                                'else': 0
                                            }
                                        }
                                    ]
                                },
                                'ADApassengerCount': {
                                    '$add': [
                                        '$$value.ADApassengerCount',
                                        {
                                            '$cond': {
                                                'if': {
                                                    '$and': [
                                                        {
                                                            '$eq': [
                                                                '$$this.dropoffLatitude', None
                                                            ]
                                                        },
                                                        { '$eq': [ '$$this.isADA', True ] }
                                                    ]
                                                },
                                                'then': 1,
                                                'else': 0
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                '$match': {
                    '$and': [
                        { 'activeRidesCount': { '$lt': max_ride_n } },
                        {
                            '$expr': {
                                '$cond': [
                                    { '$lte': [req_passenger_n, pax_capacity] },
                                    True, False
                                ]
                            }
                        },
                        {
                            '$expr': {
                                '$cond': [
                                    { '$lte': [req_ada_passengers_n, pax_ada_capacity] },
                                    True, False
                                ]
                            }
                        }
                    ]
                }
            },
            {
                '$lookup': {
                    'from': 'Routes',
                    'as': 'activeRoutes',
                    'let': {'driver': '$_id'},
                    'pipeline': [
                        {
                            '$match': {
                                '$expr': {
                                    '$and': [
                                        {'$eq': ['$driver', '$$driver']},
                                        {'$eq': ['$active', True]}
                                    ]
                                }
                            }
                        }
                    ]
                }
            },
            {
                '$addFields': {
                    'activeRoute': {
                        '$first': '$activeRoutes'
                    }
                }
            },
            {
                '$addFields': {
                    'activeRoute': {
                        '$first': '$activeRoutes'
                    },
                    'vehicle_profile': '$vehicle.vehicleType.profile',
                    'vehicle_profile_fallback': '$vehicle.vehicleType.fallbackProfile'
                }
            }
        ])

        driver_rides = list(drivers)
        runtime_stop(self.logger, rt_drivers)
        return driver_rides

    def get_ride(self, ride_id):
        '''
        Receives a ride id and fetches ride with matching id from database
        '''
        return self.client.Rides.find_one({'_id': ObjectId(ride_id)})

    def get_driver(self, driver_id):
        '''
        Receives a driver id and fetches driver with matching id from database
        '''
        return self.client.Drivers.find_one({'_id': ObjectId(driver_id)})

    def get_driver_vehicle(self, driver_id):
        '''
        Receives a driver id and fetches driver information with
        assigned ride passengers and vehicle capacity from database
        '''
        rt_driver = runtime_start(self.logger, 'db_call_id', {'collection': 'Drivers'})

        driver = self.client.Drivers.aggregate([
            {
                '$match': { '_id': ObjectId(driver_id) },
            },
            {
                '$addFields': {
                    'vehicle_profile': '$vehicle.vehicleType.profile',
                    'vehicle_profile_fallback': '$vehicle.vehicleType.fallbackProfile',
                    'hailedRideInfo': {
                        '$reduce': {
                            'input': {'$ifNull': ['$driverRideList', []]},
                            'initialValue': {
                                'passengerCount': 0,
                                'ADApassengerCount': 0
                            },
                            'in': {
                                'passengerCount': {
                                    '$add': [
                                        '$$value.passengerCount',
                                        {
                                            '$cond': {
                                                'if': { '$eq': [ '$$this.dropoffLatitude', None ] },
                                                'then': {
                                                    '$cond': {
                                                        'if': {
                                                            '$eq': [ '$$this.isADA', True ]
                                                        },
                                                        'then': {
                                                            '$subtract': ['$$this.passengers', 1]
                                                        },
                                                        'else': '$$this.passengers'
                                                    }
                                                },
                                                'else': 0
                                            }
                                        }
                                    ]
                                },
                                'ADApassengerCount': {
                                    '$add': [
                                        '$$value.ADApassengerCount',
                                        {
                                            '$cond': {
                                                'if': {
                                                    '$and': [
                                                        {
                                                            '$eq': [
                                                                '$$this.dropoffLatitude', None
                                                            ]
                                                        },
                                                        { '$eq': [ '$$this.isADA', True ] }
                                                    ]
                                                },
                                                'then': 1,
                                                'else': 0
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ])
        driver_info = list(driver)[0]
        if ("vehicle" in driver_info.keys() and driver_info["vehicle"]):
            driver_info['pax_capacity'] = driver_info['vehicle']['passengerCapacity']
            driver_info['pax_ada_capacity'] = driver_info['vehicle']['adaCapacity']
        else:
            driver_info['pax_capacity'] = 2 if driver_info["isADA"] else 5
            driver_info['pax_ada_capacity'] = 1 if driver_info["isADA"] else 0

        runtime_stop(self.logger, rt_driver)
        return driver_info

    def get_route(self, route_id):
        '''
        Receives a route id and fetches route with matching id from database
        '''
        return self.client.Routes.find_one({'_id': ObjectId(route_id)})

    def get_route_by_driver_id(self, route_id):
        '''
        Receives a driver id and fetches active route with matching driver id from database
        '''
        return self.client.Routes.find_one({'driver_id': ObjectId(route_id), 'active': True})

    def get_location(self, location_id):
        '''
        Receives a location id and fetches location with matching id from database
        '''
        try:
            rt_location = runtime_start(self.logger, 'db_call_id', {'collection': 'Locations'})
            location = self.client.Locations.find_one({'_id': ObjectId(location_id)})
            runtime_stop(self.logger, rt_location)
            return location
        except Exception as error:
            runtime_stop(self.logger, rt_location)
            raise DatabaseLocationError(location_id=location_id) from error

    def get_settings(self):
        '''
        Fetches global settings from database
        '''
        return self.client.Settings.find_one({})

    def get_nearest_location(self, latitude, longitude):
        '''
        Receives a set of coordinates and returns closest location from database
        '''
        pipeline = [
            {
                '$geoNear': {
                    'near': {'type': 'Point', 'coordinates': [longitude, latitude]},
                    'spherical': True,
                    'distanceMultiplier': 1 / 1000,
                    'distanceField': "distanceFromCurrentLocation"
                }
            },
            {
                '$match': {
                    'isActive': True
                }
            }
        ]

        locations = list(self.client.Locations.aggregate(pipeline))
        if len(locations) > 0:
            return locations[0]
        return None

    def get_location_info(self, location_info, location_id=None):
        '''
        Receives location_info and applies defaults for missing attributes
        or fetches location by provided location id and applies defaults for missing attributes
        '''
        try:
            if location_id is not None:
                location_info = self.get_location(location_id)
        # pylint: disable=broad-exception-caught
        except Exception as error:
        # pylint: enable=broad-exception-caught
            self.logger.debug(traceback.format_exc())
            sentry_sdk.capture_exception(error)
            location_info = {}

        fetch_variables = {}
        for var_name, default_value, validate in LOCATION_SCHEMA_DEFAULTS:
            try:
                if var_name in location_info and validate(location_info[var_name]):
                    fetch_variables[var_name] = location_info[var_name]
                else:
                    fetch_variables[var_name] = default_value
            # pylint: disable=broad-exception-caught
            except Exception:
            # pylint: enable=broad-exception-caught
                fetch_variables[var_name] = default_value
                self.logger.debug(traceback.format_exc())
        return fetch_variables

    def get_settings_info(self):
        '''
        Fetches global settings and applies defaults for missing attributes
        '''
        try:
            rt_settings = runtime_start(self.logger, 'db_call_id', {'collection': 'Settings'})
            settings_info = self.get_settings()
            runtime_stop(self.logger, rt_settings)
        # pylint: disable=broad-exception-caught
        except Exception as error:
        # pylint: enable=broad-exception-caught
            self.logger.error(traceback.format_exc())
            sentry_sdk.capture_exception(error)
            settings_info = {}

        fetch_variables = {}
        for var_name, default_value, validate in SETTINGS_SCHEMA_DEFAULTS:
            try:
                if var_name in settings_info and validate(settings_info[var_name]):
                    fetch_variables[var_name] = settings_info[var_name]
                else:
                    fetch_variables[var_name] = default_value
            # pylint: disable=broad-exception-caught
            except Exception as error:
            # pylint: enable=broad-exception-caught
                fetch_variables[var_name] = default_value
                self.logger.error(traceback.format_exc())
                sentry_sdk.capture_exception(error)
        return fetch_variables
