import React from 'react';
import { Card, Tabs } from 'antd';
import {
  RiderList, RiderListCsv
} from '../components';

const Riders = (props) => {
  const { location } = props;
  return (
    <Tabs defaultActiveKey="1">
      <Tabs.TabPane tab="Rider List" key="1">
        <Card title="Riders">
          <RiderList location={location} />
        </Card>
      </Tabs.TabPane>
      <Tabs.TabPane tab="Export CSV" key="2">
        <Card title="Export Riders">
          <RiderListCsv location={location} />
        </Card>
      </Tabs.TabPane>
    </Tabs>
  );
};

export default Riders;
