#!/usr/bin/env bash

# Usage: <this_script.sh> <deps_cache_dir> <deps_install_dir>
main() {
	local deps_cache_dir="${1}"
	local deps_install_dir="${2}"

	# Fix cache permissions
	chown "$(id -u):$(id -g)" -R "${deps_cache_dir}"

	# Install dependencies
	pip install \
		-r requirements.txt \
		--cache-dir "./${deps_cache_dir}" \
		--target "./${deps_install_dir}" \
		--upgrade
}

main "$@"
