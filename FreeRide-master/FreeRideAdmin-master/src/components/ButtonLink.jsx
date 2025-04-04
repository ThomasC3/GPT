import React from 'react';
import { Button } from 'antd';
import { withRouter } from 'react-router-dom';

const ButtonLink = ({
  match, history, location, to, staticContext, ...props
}) => (
  <Button {...props} onClick={() => history.push(to)}>{props.children}</Button>
);

export default withRouter(ButtonLink);
