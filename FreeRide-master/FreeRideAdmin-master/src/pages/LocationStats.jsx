import React from 'react';
import { Tabs } from 'antd';
import {
  RideStats, DriverStats, VehicleStats
} from '../components';

const LocationStats = () => (
  <Tabs defaultActiveKey="1">
    <Tabs.TabPane tab="Ride Stats" key="1">
      <RideStats />
    </Tabs.TabPane>
    <Tabs.TabPane tab="Driver Stats" key="2">
      <DriverStats />
    </Tabs.TabPane>
    <Tabs.TabPane tab="Vehicle Stats" key="3">
      <VehicleStats />
    </Tabs.TabPane>
  </Tabs>
);

export default LocationStats;
