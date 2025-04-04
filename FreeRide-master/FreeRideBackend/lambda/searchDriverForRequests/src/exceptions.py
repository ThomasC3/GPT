'''
This module defines custom exception classes for handling specific error scenarios
in the application. These exceptions provide more meaningful error handling and 
contextual information compared to standard exceptions.
'''

class GraphHopperLimitError(Exception):
    """Exception for credit or rate limit errors raised by graphopper call"""
    def __init__(self, req_info=None, body=None, time=0):
        super(GraphHopperLimitError, self).__init__(req_info, body, time)
        self.body = body
        self.time = time
        self.req_info = req_info

class GraphHopperServerError(Exception):
    """Exception for server errors raised by graphopper call"""
    def __init__(self, req_info=None, body=None, time=0):
        super(GraphHopperServerError, self).__init__(req_info, body, time)
        self.body = body
        self.time = time
        self.req_info = req_info
class GraphHopperProfileError(Exception):
    """Exception for wrong profile errors raised by graphopper call"""
    def __init__(self, message, additional_info=None, tags=None):
        super().__init__(message)
        self.additional_info = additional_info
        self.tags = tags
class GraphHopperMatrixError(Exception):
    """Exception for inability to calculate matrix errors raised by graphopper call"""
    def __init__(self, message, additional_info=None, tags=None):
        super().__init__(message)
        self.additional_info = additional_info
        self.tags = tags
class GraphHopperDefaultError(Exception):
    """Exception for other errors raised by graphopper call"""
    def __init__(self, message, additional_info=None, tags=None):
        super().__init__(message)
        self.additional_info = additional_info
        self.tags = tags

class TSPTimeoutError(Exception):
    """Exception for timeout raised by tsp runner"""
    def __init__(self, message, additional_info=None, tags=None):
        super().__init__(message)
        self.additional_info = additional_info
        self.tags = tags

class TSPDefaultError(Exception):
    """Exception for other errors raised by tsp runner"""
    def __init__(self, message, additional_info=None, tags=None):
        super().__init__(message)
        self.additional_info = additional_info
        self.tags = tags

class DatabaseLocationError(Exception):
    """Exception for errors raised on location cancel time database access"""
    def __init__(self, location_id=None):
        super(DatabaseLocationError, self).__init__(location_id)
        self.location_id = location_id

class ExceptionWithContext(Exception):
    """Exception for unexpected errors"""
    def __init__(self, original_exception, message, additional_info=None, tags=None):
        super().__init__(message)
        self.original_exception = original_exception
        self.additional_info = additional_info
        self.tags = tags
