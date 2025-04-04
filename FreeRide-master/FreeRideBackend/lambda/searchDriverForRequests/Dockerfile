# Builder
FROM lambci/lambda:build-python3.7 AS builder

COPY requirements.txt .
RUN pip install -r requirements.txt


# Runner
FROM lambci/lambda:python3.7

WORKDIR /var/task

COPY --from=builder /var/lang/lib/python3.7/site-packages/. /opt/python/lib/python3.7/site-packages/
COPY src/ /var/task/

EXPOSE 9001

# ENTRYPOINT will be inherited from the last base image (lambci/lambda:python3.7)
# CMD ["lambda_function.lambda_handler"]
