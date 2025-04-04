import * as React from 'react';
import { Route, Redirect } from 'react-router-dom';

const ConditionalRoute = ({
  condition, isAllowed, routeComponent: Component = Route, ...props
}) => (condition && isAllowed
  ? <Component {...props} />
  : <Redirect to="/" />);

export default ConditionalRoute;
