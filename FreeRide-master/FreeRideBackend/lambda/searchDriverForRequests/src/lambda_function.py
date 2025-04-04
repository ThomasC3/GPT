import os
import traceback
import logging
import json
from dotenv import load_dotenv, find_dotenv
from driverfinder import DriverFinder
from dbaccess import DBAccess
import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
from utils import runtime_start, runtime_stop

load_dotenv(find_dotenv())

sentry_sdk.init(
    os.getenv('SENTRY_DSN', None),
    integrations=[AwsLambdaIntegration()]
)


def set_log():
    log_level = logging.INFO
    if 'LOG_LEVEL' in os.environ:
        if os.environ['LOG_LEVEL'].lower() == "debug":
            log_level = logging.DEBUG
        elif os.environ['LOG_LEVEL'].lower() == "info":
            log_level = logging.INFO
        elif os.environ['LOG_LEVEL'].lower() == "warning":
            log_level = logging.WARNING
        elif os.environ['LOG_LEVEL'].lower() == "error":
            log_level = logging.ERROR

    logging.basicConfig(level=log_level, format='%(asctime)s.%(msecs)03d %(levelname)-8s %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    logging.getLogger().setLevel(log_level)
    logger = logging.getLogger()
    logger.warning("Using log level {}".format(logging.getLevelName(logger.getEffectiveLevel())))
    return logger


LOGGER = set_log()
DB = DBAccess(LOGGER)


def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])

        input_json = "-- DATA RECEIVED: {}, {} --".format(body, context)
        LOGGER.info(input_json)

        if 'request_id' in body.keys():
            rt_total = runtime_start(LOGGER, 'driver_finder_total')
            result = DriverFinder(DB, LOGGER).find_drivers(request_id=body['request_id'])
            runtime_stop(LOGGER, rt_total, {})
        elif 'driver_id' in body.keys() and 'route_stops' in body.keys():
            rt_total = runtime_start(LOGGER, 'route_update_total')
            result = DriverFinder(DB, LOGGER).update_route(body['driver_id'], body['route_stops'])
            runtime_stop(LOGGER, rt_total, {})
        else:
            result = None

        output_json = "-- DATA SENT: {} --".format(result)
        LOGGER.info(output_json)

        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }
    except Exception as e:
        LOGGER.error(e)
        LOGGER.debug(traceback.format_exc())
        sentry_sdk.capture_exception(e)
        return 'Something went wrong: ' + str(e), 500
