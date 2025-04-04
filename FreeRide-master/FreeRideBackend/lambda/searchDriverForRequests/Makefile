# https://stackoverflow.com/a/23324703
ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

PYTHON_VERSION:=python3.7
DOCKER_BUILD_IMAGE:=lambci/lambda:build-${PYTHON_VERSION}

# Git hash for the lambda's directory (i.e. same as the Makefile),
# which will serve as a revision/version for the lambda function.
# A directory does not have a Git hash per se; this computes the hash of the
# commit that last "affected" this directory.
GIT_HASH_LAMBDA := $(shell git rev-list -1 HEAD -- ${ROOT_DIR})

BUILD_DIR := build
DEPS_CACHE_DIR := ${BUILD_DIR}/deps-cache
DEPS_INSTALL_DIR := ${BUILD_DIR}/deps
RELEASES_DIR := ${BUILD_DIR}/releases

RELEASE_NAME := release_${GIT_HASH_LAMBDA}
RELEASE_DIR_PATH := ${RELEASES_DIR}/${RELEASE_NAME}
RELEASE_ZIP_PATH := ${RELEASES_DIR}/${RELEASE_NAME}.zip

.PHONY: git_hash
git_hash:
	@echo "${GIT_HASH_LAMBDA}"

# Safe mechanism for guaranteeing the release contains the actual commit's code
# (i.e. ensure the Git hash version corresponds to the actual release's contents).
.PHONY: git_clean_wip
git_clean_wip:
	@scripts/git_clean_wip.sh || ( \
		echo "ERROR: You've got uncomitted changes. Please git stash/commit before proceeding."; \
		echo "Aborting."; \
		exit 1 \
	)

.PHONY: release
release: git_clean_wip deps
	@scripts/release.sh "${ROOT_DIR}" "${DEPS_INSTALL_DIR}" "${RELEASE_DIR_PATH}" "${RELEASE_ZIP_PATH}"

.PHONY: deps
deps:
	@mkdir -p "${DEPS_CACHE_DIR}"
	@mkdir -p "${DEPS_INSTALL_DIR}"
	@echo "Installing dependencies (pip install) using Docker." && \
		docker run \
			--rm \
			-it \
			-v "${ROOT_DIR}:/var/task/" \
			"${DOCKER_BUILD_IMAGE}" \
			scripts/install_deps.sh "${DEPS_CACHE_DIR}" "${DEPS_INSTALL_DIR}"
