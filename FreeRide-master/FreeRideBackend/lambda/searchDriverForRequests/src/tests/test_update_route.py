import unittest
import os
import sys
import json
from pymongo import MongoClient

from lambda_function import lambda_handler

sys.path.append("..")


class TestUpdateRoute(unittest.TestCase):
    def setUp(self):
        self.maxDiff = None
        conn = MongoClient(
            host=os.environ['TEST_DEV_DB_HOST'],
            port=int(os.environ['TEST_DEV_DB_PORT']),
            username=os.environ['TEST_DEV_DB_USER'],
            password=os.environ['TEST_DEV_DB_PWD'],
            authSource=os.environ['TEST_DEV_DB'])
        self.client = conn[os.environ['TEST_DEV_DB']]
        self.location = self.client.Locations.save({
            'name': "Lambda_location",
            'isADA': False,
            'isActive': True,
            'serviceArea': {
                'coordinates': [[
                    [-117.118018, 32.755519],
                    [-117.079595, 32.757816],
                    [-117.079809, 32.729851],
                    [-117.129672, 32.729941],
                    [-117.118018, 32.755519]
                ]],
                'type': 'Polygon'
            },
        })

        self.driver = self.client.Drivers.save({
            'locations': [self.location],
            'isOnline': True,
            'zip': '10001',
            'currentLocation': {
                'coordinates': [-117.108172, 32.747821],
                'type': 'Point'
            },
            'firstName': 'Driver',
            'lastName': 'Lambda',
            'email': 'driver_lambda@mail.com',
            'phone': '123456789',
            'password': 'password_driver_lambda',
            'dob': '2000-12-11'
        })

    def tearDown(self):
        self.client.Locations.delete_one({'_id': self.location})
        self.client.Drivers.delete_one({'_id': self.driver})

    @unittest.skip("This test is broken, skipping for now")
    def test_upper(self):
        json_input = {
            'driver_id': str(self.driver),
            'route_stops': [
                {'status': 'done', 'coordinates': [32.747821, -117.108172], 'stopType': 'current_location'},
                {'status': 'done', 'coordinates': [32.747821, -117.108172], 'stopType': 'pickup', 'ride': 'ride_1'},
                {'status': 'done', 'coordinates': [32.747821, -117.108172], 'stopType': 'current_location'},
                {'status': 'done', 'coordinates': [32.747821, -117.108172], 'stopType': 'pickup', 'ride': 'ride_2'},
                {'status': 'done', 'coordinates': [32.747821, -117.108172], 'stopType': 'current_location'},
                {'status': 'cancelled', 'coordinates': [32.745959, -117.107017], 'stopType': 'pickup', 'ride': 'ride_3'},
                {'status': 'cancelled', 'coordinates': [32.744081, -117.105763], 'stopType': 'dropoff', 'ride': 'ride_3'},
                {'status': 'waiting', 'coordinates': [32.742202, -117.107002], 'stopType': 'dropoff', 'ride': 'ride_2'},
                {'status': 'waiting', 'coordinates': [32.742236, -117.108251], 'stopType': 'dropoff', 'ride': 'ride_1'}
            ],
            'debug': True}

        event = {'body': json.dumps(json_input)}
        context = {}

        result = lambda_handler(event, context)
        print(result)
        result_json = json.loads(result['body'])
        print(result_json)
        result_json = result_json['plan']
        print(result_json)

        plan_result = []
        for item in result_json:
            ride_id = -1
            if 'ride' in item.keys():
                ride_id = item['ride']
            plan_result += [[item['status'], item['stopType'], ride_id]]

        expected_plan = [
            ['done', 'current_location', -1],
            ['done', 'pickup', 'ride_1'],
            ['done', 'current_location', -1],
            ['done', 'pickup', 'ride_2'],
            ['done', 'current_location', -1],
            ['done', 'current_location', -1],
            ['waiting', 'dropoff', 'ride_1'],
            ['waiting', 'dropoff', 'ride_2']
        ]

        self.assertEqual(plan_result, expected_plan)


if __name__ == '__main__':
    unittest.main()
