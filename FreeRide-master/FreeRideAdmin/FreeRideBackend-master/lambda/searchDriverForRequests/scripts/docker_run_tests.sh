#!/usr/bin/env bash

export PYTHONPATH="/opt/python/lib/python3.7/site-packages:/var/task"
cd tests && python -m unittest
