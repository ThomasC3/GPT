import React from 'react';
import {
  Card, Row, Col, Button
} from 'antd';
import { DriverInfo, DriverList } from '../components';
import { Modal } from '../elements';

const Drivers = ({ location }) => (
  <Row>
    <Col>
      <Card
        title="Drivers"
        extra={(
          <Modal
            title="New Driver"
            button={<Button type="primary" size="small">New Driver</Button>}
            destroyOnClose
            width="50vw"
            footer={[]}
          >
            <DriverInfo />
          </Modal>
)}
      >
        <DriverList location={location} />
      </Card>
    </Col>
  </Row>
);

export default Drivers;
