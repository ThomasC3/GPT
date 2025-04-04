import React from 'react';
import { Col, Card } from 'antd';
import { Row } from '../elements';
import { RideList, RiderInfo } from '../components';
import Reports from './Reports';

const Rider = props => (
  <Row gutter={15}>
    <Col xs={24} sm={24} md={12}>
      <Card title="Rider Info">
        <RiderInfo id={props.match.params.id} history={props.history} />
      </Card>
        &nbsp;
      <Reports rider={props.match.params.id} location={props.location} />
    </Col>
    <Col xs={24} sm={24} md={12}>
      <Card title="Rider History">
        <RideList rider={props.match.params.id} location={props.location} />
      </Card>
    </Col>
  </Row>
);

export default Rider;
