"""
Validator functions to assertain if value is within expected parameters
"""

def valid_boolean(value):
    """
    Validates if value is a boolean true or false
    """
    if str(value).lower() in ['true']:
        return True
    if str(value).lower() in ['false']:
        return True
    raise Exception(f'Value {value} is not a boolean')

def valid_sort_option(value):
    """
    Validates if value is 'closest' or 'idle'
    """
    if str(value) in ['closest', 'idle']:
        return value
    raise Exception(f'Value {value} not in [\'closest\', \'idle\']')
