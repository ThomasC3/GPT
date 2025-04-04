'''
This module implements the Traveling Salesman Problem (TSP) algorithm and serves as a 
subprocess for handling TSP-related computations. It takes input data in JSON format, 
processes the data to compute optimal routes, and outputs the results in JSON format.
'''

import sys
import traceback
import json
from tsp import TSP

def run_tsp(data_model, typ):
    '''
    Executes the Traveling Salesman Problem (TSP) algorithm using the provided data model.

    This function takes a data model representing the TSP problem, processes it, and 
    computes the optimal route. The results are returned in a structured format.

    Parameters:
        - data_model (dict): A dictionary containing the input data for the TSP algorithm, 
        including nodes and capacity, and any other relevant parameters.
        - typ (str): A string indicating the type of matrix to use with TSP ('distance', 
        'time').

        Returns:
        - dict: A dictionary containing the results of the TSP computation, including:
            - 'success' (bool): Indicates whether the computation was successful.
            - 'assignment' (bool): Indicates if an assignment was made.
            - 'new_route' (list): A list of locations representing the computed route.
            - 'new_route_distances' (list): A list of distances corresponding to the computed route.
            - 'error' (str, optional): An error message if the computation failed.
    '''
    try:
        assignment_obj, new_route, new_route_distances = TSP().run(data=data_model, typ=typ)
        assignment = True if assignment_obj else False
        return json.dumps({
            'success': True,
            'assignment': assignment,
            'new_route': new_route,
            'new_route_distances': new_route_distances
        })
    # pylint: disable=broad-exception-caught
    except Exception as error:
    # pylint: enable=broad-exception-caught
        error_message = traceback.format_exception_only(error)
        if isinstance(error_message, list):
            error_message = error_message[0].strip()
        error_traceback =  traceback.format_tb(error.__traceback__)
        if isinstance(error_traceback, list):
            error_traceback = '\n'.join(error_traceback)
        return json.dumps({
            'success': False,
            'error': error_message,
            'traceback': error_traceback
        })

if __name__ == '__main__':
    # Rebuild arguments
    data_model_param = json.loads(sys.argv[1])
    typ_param = sys.argv[2]

    # Run TSP
    result = run_tsp(data_model_param, typ_param)

    # Return result
    sys.stdout.buffer.write(result.encode('utf-8'))
