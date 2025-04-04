#!/usr/bin/env bash

# Usage: <this_script.sh>
# Check exit status.
main() {
	[[ -z $(git status -s -uall) ]]
}

main
