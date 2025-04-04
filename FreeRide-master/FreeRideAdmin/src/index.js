import React from 'react';
import ReactDOM from 'react-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import * as serviceWorker from './serviceWorker';

import 'antd/dist/antd.css';
import 'normalize.css/normalize.css';
import './index.css';

ReactDOM.render(
  // eslint-disable-next-line react/jsx-filename-extension
  <Auth0Provider
    domain={process.env.REACT_APP_AUTH0_DOMAIN}
    clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
    cacheLocation="localstorage"
    useRefreshTokens
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: process.env.REACT_APP_AUTH0_AUDIENCE
    }}
  >
    <App />
  </Auth0Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
