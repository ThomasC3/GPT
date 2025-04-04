import React, { Fragment } from 'react';
import { Card, Row, Col } from 'antd';
import { DriverInfo, RideList, EventList } from '../components';

const Driver = (props) => {
  const {
    match: { params: { id: driverId } },
    location
  } = props;
  return (
    <Fragment>
      <Row gutter={15}>
        <Col xs={24} sm={24} md={12}>
          <Card title="Driver Details">
            <DriverInfo id={driverId} />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12}>
          <Card title="Location Ride History">
            <RideList driver={driverId} location={location} />
          </Card>
        </Col>
      </Row>
      <Row style={{ marginTop: 16 }}>
        <Col>
          <Card title="Event Timeline">
            <EventList
              driver={driverId}
              location={location}
              hours={['LOGIN', 'AVAILABLE']}
            />
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default Driver;
