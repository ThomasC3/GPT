DC_FLAGS :=

# Override DC_FLAGS if the environment is CI,
# so docker-compose uses the CI overrides.
ifdef MAKE_ENV
ifeq ($(MAKE_ENV),ci)
DC_FLAGS := -f docker-compose.ci.yml
endif
endif

.PHONY: install
install: build pull update

.PHONY: build
build: build.docker build.lambda

.PHONY: build.docker
build.docker:
	docker-compose $(DC_FLAGS) build

.PHONY: build.lambda
build.lambda:
	cd lambda/searchDriverForRequests && make deps

.PHONY: pull
pull:
	docker-compose $(DC_FLAGS) pull

.PHONY: clean
clean:
	docker-compose $(DC_FLAGS) down && \
	docker volume rm circuitbackend_db-data && \
	docker volume rm circuitbackend_redis-data && \
	docker rmi thefreerideinc/aws-api-gateway:latest && \
	docker rmi thefreerideinc/circuit-lambda:latest && \
	docker rmi thefreerideinc/circuit-backend:latest

.PHONY: start
start:
	docker-compose $(DC_FLAGS) up

.PHONY: start-d
start-d:
	docker-compose $(DC_FLAGS) up -d

.PHONY: stop
stop:
	docker-compose $(DC_FLAGS) stop

.PHONY: update
update:
	docker-compose $(DC_FLAGS) run --rm api yarn install

.PHONY: lint
lint:
	docker-compose $(DC_FLAGS) run --rm api yarn lint

.PHONY: wait.all
wait.all: wait.mongo wait.redis wait.lambda

.PHONY: wait.mongo
wait.mongo:
	docker-compose $(DC_FLAGS) run --rm api \
		./scripts/wait-for-it.sh mongo:27017

.PHONY: wait.redis
wait.redis:
	docker-compose $(DC_FLAGS) run --rm api \
		./scripts/wait-for-it.sh redis:6379

.PHONY: wait.lambda
wait.lambda:
	docker-compose $(DC_FLAGS) run --rm api \
		./scripts/wait-for-it.sh lambda:9001

.PHONY: test
test: test.all

.PHONY: test.all
test.all: wait.all test.api_and_integration test.lambda

.PHONY: test.api_and_integration
test.api_and_integration:
	docker-compose $(DC_FLAGS) run --rm api \
		npm run test_docker

.PHONY: test.lambda
test.lambda:
	docker-compose $(DC_FLAGS) run \
		--rm \
		-w "/var/task/tests" \
		--entrypoint "python" \
		-e PYTHONPATH="/opt/python/lib/python3.7/site-packages:/var/task" \
		lambda \
		-m unittest

.PHONY: compile
compile:
	docker-compose $(DC_FLAGS) run --rm api \
		npm run build

# CI aliases
.PHONY: ci.install
ci.install: ci.build ci.pull

## ci.build is different from build, since it does not install lambda deps;
# they are installed as part of the lambda's Docker image.
.PHONY: ci.build
ci.build: ci.build.docker

.PHONY: ci.build.docker
ci.build.docker:
	MAKE_ENV=ci make build.docker

.PHONY: ci.pull
ci.pull:
	echo "Skipping for now, because reasons (see build #330)."
	#MAKE_ENV=ci make pull

.PHONY: ci.clean
ci.clean:
	MAKE_ENV=ci make clean

.PHONY: ci.start-d
ci.start-d:
	MAKE_ENV=ci make start-d

.PHONY: ci.test
ci.test:
	MAKE_ENV=ci make test

# Only used for debugging purposes,
# since make ci.test calls make test, which calls make test.lambda
.PHONY: ci.test.lambda
ci.test.lambda:
	MAKE_ENV=ci make test.lambda

# Deployment
.PHONY: deploy-to-dev
deploy-to-dev:
	cap cron:development deploy --backtrace && \
	cap backend:development deploy --backtrace

.PHONY: deploy-stage
deploy-stage:
	cap cron:stage deploy --backtrace && \
	cap backend:stage deploy --backtrace
