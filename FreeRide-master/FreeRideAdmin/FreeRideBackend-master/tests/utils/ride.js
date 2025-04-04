export const useEndpoint = async (
  url, requestType, token, app, request, domain, payload = {}, additionalHeaders = {}, statusCode
) => {
  const headers = {
    host: domain,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...additionalHeaders
  };

  let req;
  switch (requestType) {
  case 'post':
    req = request(app).post(url);
    break;
  case 'put':
    req = request(app).put(url);
    break;
  case 'delete':
    req = request(app).delete(url);
    break;
  case 'patch':
    req = request(app).patch(url);
    break;
  default:
    req = request(app).get(url);
  }

  if (statusCode) {
    return req.set(headers)
      .send(payload)
      .expect(statusCode)
      .end()
      .then(response => ({
        body: response.body,
        status: response.statusCode
      }));
  }
  return req.set(headers)
    .send(payload)
    .end()
    .then(response => ({
      body: response.body,
      status: response.statusCode
    }));
};

export const login = async (email, password, app, request, specifiedDomain) => request(app)
  .post('/v1/login')
  .set('host', specifiedDomain)
  .set('Accept', 'application/json')
  .set('Content-Type', 'application/json')
  .send({ email, password })
  .end()
  .then(response => response.body);

export const signUp = async (bodyParams, app, request, specifiedDomain) => request(app)
  .post('/v1/register')
  .set('host', specifiedDomain)
  .set('Accept', 'application/json')
  .set('Content-Type', 'application/json')
  .send(bodyParams)
  .end();

export const emitEvent = async (
  senderSocket, broadcastEvent, listenerSocket, subscribeEvent, data = {}
) => new Promise((res, rej) => {
  senderSocket
    .emit(broadcastEvent, data);

  listenerSocket
    .on(subscribeEvent, (receivedData) => {
      listenerSocket.off(subscribeEvent);
      return res(receivedData);
    })
    .on('wserror', msg => rej(msg));
});

export default {
  login,
  emitEvent
};
