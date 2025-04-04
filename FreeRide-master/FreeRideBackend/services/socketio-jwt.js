import xtend from 'xtend';
import jwt from 'jsonwebtoken';

export default function authorize(socket, data, options) {
  options = xtend({ decodedPropertyName: 'decoded_token', encodedPropertyName: 'encoded_token' }, options);

  const token = data ? data.token : undefined;

  if (!token || typeof token !== 'string') {
    socket.emit('unauthorized', 'Token missing or invalid', () => {
      socket.disconnect('unauthorized');
    });
    return false;
  }

  socket[options.encodedPropertyName] = token;

  try {
    const decoded = jwt.verify(token, options.secret, options);
    socket[options.decodedPropertyName] = decoded;
    socket.emit('authenticated');
    return true;
  } catch (err) {
    socket.emit('unauthorized', err, () => {
      socket.disconnect('unauthorized');
    });
    return false;
  }
}
