import * as React from 'react';
import { Route } from 'react-router-dom';
import { Row, Col } from 'antd';

const Grid = ({ col, component: Component = Route, ...props }) => (
  <Row>
    <Col {...col}>
      <Component {...props} />
    </Col>
  </Row>
);

export default Grid;
