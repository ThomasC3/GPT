import * as React from 'react';
import { Route } from 'react-router-dom';

const ProtectedRoute = ({ isAllowed, ...props }) => (isAllowed ? <Route {...props} /> : <div>Unauthorized</div>);

export default ProtectedRoute;
