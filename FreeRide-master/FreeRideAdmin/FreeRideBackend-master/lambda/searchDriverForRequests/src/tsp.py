'''
The TSP module contains the logic for the TSP (Travelling Salesman Problem) algorithm
and node distance and cost functions as well as the processing of the result
'''
from datetime import timezone, timedelta, datetime
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


class TSP:
    '''
    TSP class provides the tools for running the TSP algorithm,
    including distance and cost functions, target route cost
    and solution processing
    '''
    def __process_solution(self, data, manager, routing, assignment, typ):
        plan, route_distance = self.__get_plan_distance(data, routing, manager, assignment, typ)
        return [plan, route_distance]

    def __get_plan_distance(self, data, routing, manager, assignment, typ):
        tsp_vehicle_id = 0
        index = routing.Start(tsp_vehicle_id)
        start_time = datetime.utcnow().replace(tzinfo=timezone.utc)
        route_distance = [0]
        route_cost = [0]
        plan = []
        current_time_span = 0
        while not routing.IsEnd(index):
            plan += [data['nodes'][manager.IndexToNode(index)]]
            previous_index = index
            index = assignment.Value(routing.NextVar(index))
            from_node = manager.IndexToNode(previous_index)
            to_node = manager.IndexToNode(index)
            if typ == "distance":
                plan[-1]['cost'] = route_distance[-1]
            else:
                plan[-1]['distance'] = route_distance[-1]
                current_time_span += route_cost[-1]
                plan[-1]['cost'] = (start_time + timedelta(seconds=current_time_span)).timestamp()
                route_cost += [data['time_matrix'][from_node][to_node]]
            route_distance += [data['distance_matrix'][from_node][to_node]]
        return [plan, route_distance[:-1]]

    def run(self, data, typ="distance"):
        '''
        Runs the TSP algorithm on data with the following format:
        {
            nodes: [
                stopType: < currentLocation | pickup | dropoff >,
                status: < done | waiting | cancelled >,
                coordinates: [latitude, longitude],
                passengers: <Number>
                ADApassengers: <Number>,
                request_id: <ObjectId>
            ],
            distance_matrix: [[<Number>]],
            pickups_deliveries: [[from_node_idx, to_node_idx]],
            dropoff_stop_limit: {ride_id: [dropoff_idx, additional_pickup_ride_limit_for_ride]}
            lone_dropoffs: [<node_index>],
            picked_up_passengers: <Number>
            picked_up_ada_passengers: <Number>,
            close_nodes: [<Number>]                   # pickup indexes close to a dropoff index
            ride_capacity: <Number>,                  # concurrent ride capacity
            passenger_capacity: <Number>,             # vehicle ada capacity
            ada_passenger_capacity: <Number>,         # vehicle non-ada capacity
            keep_first_stop: True,
            # Default values for algorithm
            num_vehicles: <n_vehicles>                # always 1
            depot: <index_to_depot>                   # always 0
        }
        '''
        manager = pywrapcp.RoutingIndexManager(
            len(data['distance_matrix']), data['num_vehicles'], data['depot'])

        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            '''
            Distance between from and to node is the corresponding cell in the distance matrix.
            '''
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(data['distance_matrix'][from_node][to_node])

        def order_callback(_from_index, _to_index):
            '''
            Distance between any two nodes is 1 (order distance).
            '''
            return 1

        def fs_order_callback(from_index, to_index):
            '''
            Number of different fixed-stops between from and to node.
            It is 0 if from and to node have the same fixed-stop if, else 1.
            '''
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            if (
                'fixedStopId' in data['nodes'][from_node].keys()
            ) and 'fixedStopId' in data['nodes'][to_node].keys():
                if data['nodes'][from_node]['fixedStopId'] == data['nodes'][to_node]['fixedStopId']:
                    return 0
            return 1

        def ride_capacity_callback(from_index):
            '''
            Difference in number of rides inside vehicle.
            Increases if it is a pickup and decreases if it is a dropoff.
            '''
            from_node = manager.IndexToNode(from_index)
            if from_node == 0:
                return len(data['lone_dropoffs'])
            if data['nodes'][from_node]['stopType'] == 'pickup':
                return 1
            if data['nodes'][from_node]['stopType'] == 'dropoff':
                return -1

        def passenger_capacity_callback(from_index):
            '''
            Difference in number of passengers inside vehicles.
            Increases passengers if it is a pickup and decreases if it is a dropoff.
            '''
            from_node = manager.IndexToNode(from_index)
            if from_node == 0:
                return data['picked_up_passengers']
            if data['nodes'][from_node]['stopType'] == 'pickup':
                return data['nodes'][from_node]['passengers']
            if data['nodes'][from_node]['stopType'] == 'dropoff':
                return - data['nodes'][from_node]['passengers']

        def ada_passenger_capacity_callback(from_index):
            '''
            Difference in number of ada passengers inside vehicles.
            Increases passengers if it is a pickup and decreases if it is a dropoff.
            '''
            from_node = manager.IndexToNode(from_index)
            if from_node == 0:
                return data['picked_up_ada_passengers']
            if data['nodes'][from_node]['stopType'] == 'pickup':
                return data['nodes'][from_node]['ADApassengers']
            if data['nodes'][from_node]['stopType'] == 'dropoff':
                return - data['nodes'][from_node]['ADApassengers']

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Main dimension for distance constraints
        dimension_name = 'Distance'
        routing.AddDimension(
            transit_callback_index,
            0,  # no slack
            30000,  # vehicle maximum travel distance
            True,  # start cumul to zero
            dimension_name)
        distance_dimension = routing.GetDimensionOrDie(dimension_name)
        distance_dimension.SetGlobalSpanCostCoefficient(100)

        # Dimension for order constraints
        order_callback_index = routing.RegisterTransitCallback(order_callback)
        dimension_name = 'Order'
        routing.AddDimension(
            order_callback_index,
            0,  # no slack
            100,  # vehicle max stops
            True,  # start cumul to zero
            dimension_name)
        order_dimension = routing.GetDimensionOrDie(dimension_name)

        # Dimension for fixed-stop constraints
        fs_order_callback_index = routing.RegisterTransitCallback(fs_order_callback)
        dimension_name = 'FsOrder'
        routing.AddDimension(
            fs_order_callback_index,
            0,  # no slack
            100,  # vehicle max stops
            True,  # start cumul to zero
            dimension_name)
        fs_order_dimension = routing.GetDimensionOrDie(dimension_name)

        # Dimension for ride capacity constraints
        ride_capacity_callback_index = routing.RegisterUnaryTransitCallback(ride_capacity_callback)
        routing.AddDimensionWithVehicleCapacity(
            ride_capacity_callback_index,
            0,  # null capacity slack
            [data['ride_capacity']],  # vehicle maximum capacities
            True,  # start cumul to zero
            'RideCapacity')

        # Dimension for passenger capacity constraints
        passenger_capacity_callback_index = routing.RegisterUnaryTransitCallback(
            passenger_capacity_callback
        )
        routing.AddDimensionWithVehicleCapacity(
            passenger_capacity_callback_index,
            0,  # null capacity slack
            [data['passenger_capacity']],  # vehicle maximum capacities
            True,  # start cumul to zero
            'PassengerCapacity')

        # Dimension for ada passenger capacity constraints
        ada_passenger_capacity_callback_index = routing.RegisterUnaryTransitCallback(
            ada_passenger_capacity_callback
        )
        routing.AddDimensionWithVehicleCapacity(
            ada_passenger_capacity_callback_index,
            0,  # null capacity slack
            [data['ada_passenger_capacity']],  # vehicle maximum capacities
            True,  # start cumul to zero
            'ADAPassengerCapacity')

        # Constraint #1 - Pickups are required to happen before the corresponding ride's dropoff
        for request in data['pickups_deliveries']:
            pickup_index = manager.NodeToIndex(request[0])
            delivery_index = manager.NodeToIndex(request[1])
            routing.AddPickupAndDelivery(pickup_index, delivery_index)
            routing.solver().Add(
                routing.VehicleVar(pickup_index) == routing.VehicleVar(
                    delivery_index))
            routing.solver().Add(
                (
                    distance_dimension.CumulVar(pickup_index)
                ) <= distance_dimension.CumulVar(delivery_index))

        # Constraint #2.1 - Prevent more than 2 fixed-stop stops within a ride
        # Full rides
        for request in data['pickups_deliveries']:
            pickup_index = manager.NodeToIndex(request[0])
            delivery_index = manager.NodeToIndex(request[1])
            routing.solver().Add(
                fs_order_dimension.CumulVar(delivery_index) -
                fs_order_dimension.CumulVar(pickup_index) <= 3
            )

        # Constraint #2.2 - Prevent more than 2 fixed-stop stops within a ride
        # Only dropoffs
        if 'dropoff_stop_limit' in data.keys():
            last_dropoff_added_to_start_idx = False
            # Sorted by increasing margin
            sorted_dropoff_stop_limit = sorted(
                data['dropoff_stop_limit'].items(), key=lambda x: x[1][1]
            )
            for _, (dropoff_node, limit) in sorted_dropoff_stop_limit:
                dropoff_idx = manager.NodeToIndex(dropoff_node)
                # Exceeded number (< 1) of stops or should be next (== 1)
                if limit <= 1:
                    data['keep_first_stop'] = False
                    if last_dropoff_added_to_start_idx:
                        routing.solver().Add(
                            fs_order_dimension.CumulVar(dropoff_idx) -
                            fs_order_dimension.CumulVar(last_dropoff_added_to_start_idx) <= 1
                        )
                    else:
                        routing.solver().Add(order_dimension.CumulVar(dropoff_idx) == 1)
                    last_dropoff_added_to_start_idx = dropoff_idx
                else:
                    routing.solver().Add(
                        fs_order_dimension.CumulVar(dropoff_idx) <= limit
                    )

        # Constraint #3 - Keep first stop
        if 'keep_first_stop' in data.keys() and data['keep_first_stop']:
            first_stop_index = manager.NodeToIndex(1)
            routing.solver().Add(order_dimension.CumulVar(first_stop_index) == 1)

        # Constraint #4 - Prioritize dropoffs over pickups,
        # if dropoffs and pickups in same place
        if 'close_nodes' in data.keys():
            for nodes in data['close_nodes']:
                pickup_index = manager.NodeToIndex(nodes['pickup'])
                dropoff_index = manager.NodeToIndex(nodes['dropoff'])
                for close_node in nodes['close_nodes']:
                    close_node_index = manager.NodeToIndex(close_node)
                    if nodes['pickup'] != -1:
                        # pylint: disable=line-too-long
                        routing.solver().Add(
                            abs(
                                (
                                    order_dimension.CumulVar(close_node_index) - order_dimension.CumulVar(pickup_index)
                                ) - (
                                    order_dimension.CumulVar(dropoff_index) - order_dimension.CumulVar(close_node_index)
                                )
                            ) > (order_dimension.CumulVar(dropoff_index) - order_dimension.CumulVar(pickup_index))
                        )
                    else:
                        routing.solver().Add(order_dimension.CumulVar(dropoff_index) <= order_dimension.CumulVar(close_node_index))
                        # pylint: enable=line-too-long

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        # pylint: disable=no-member
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.GLOBAL_CHEAPEST_ARC
        )
        # pylint: enable=no-member

        assignment = routing.SolveWithParameters(search_parameters)

        plan, total_distance = [[], []]
        if assignment:
            plan, total_distance = self.__process_solution(data, manager, routing, assignment, typ)
        return [assignment, plan, total_distance]
