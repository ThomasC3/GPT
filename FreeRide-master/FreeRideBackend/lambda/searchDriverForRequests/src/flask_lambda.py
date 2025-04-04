from flask import Flask, request, jsonify
from lambda_function import lambda_handler
import json

app = Flask(__name__)


@app.route('/', methods=['POST'])
def api():
    if request.method == 'POST':
        event = request.get_json()
        result = lambda_handler({'body': json.dumps(event)}, {})
        return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0')
