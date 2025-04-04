import React from 'react';
import { Card, Tabs } from 'antd';
import {
  RideListCsv, RideList,
  RequestListCsv, RideFeedbackListCsv
} from '../components';

const Rides = (props) => {
  const { location } = props;
  return (
    <Tabs defaultActiveKey="1">
      <Tabs.TabPane tab="Ride List" key="1">
        <Card title="Rides">
          <RideList location={location} />
        </Card>
      </Tabs.TabPane>
      <Tabs.TabPane tab="Export CSV" key="2">
        <Card title="Export Rides">
          <RideListCsv location={location} />
        </Card>
        <br />
        <br />
        <Card title="Export Requests">
          <RequestListCsv location={location} />
        </Card>
        <br />
        <br />
        <Card title="Export Ride Feedback">
          <RideFeedbackListCsv location={location} />
        </Card>
      </Tabs.TabPane>
    </Tabs>
  );
};

export default Rides;
