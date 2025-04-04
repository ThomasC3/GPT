#!/usr/bin/env bash

# Usage: <this_script.sh> <root_dir> <deps_install_dir> <release_dir_path> <release_zip_path>
#
# root_dir: directory of the Makefile/lambda function code
# deps_install_dir: directory where dependencies are installed
# release_dir_path: directory where releases are prepared and archived
# release_zip_path: release zip output path
main() {
	local root_dir="${1}"
	local deps_install_dir="${2}"
	local release_dir_path="${3}"
	local release_zip_path="${4}"

	mkdir -p "${release_dir_path}"

	echo "Copying release files and packages." && \
		cp -r "${deps_install_dir}/." "${release_dir_path}" && \
		cp -r "src/." "${release_dir_path}"
	echo

	echo "Packing files and packages together."
	echo "Requires superuser privileges to fix permissions." && \
		cd "${release_dir_path}" && \
			sudo chown -R "$(id -u):$(id -g)" . && \
			zip -q -r9 "${root_dir}/${release_zip_path}" .
	echo

	echo "New release: ${release_zip_path}"
}

main "$@"
