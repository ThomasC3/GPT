import React from 'react';
import { Tabs } from 'antd';
import { InspectionQuestions, InspectionForms } from '../components';

const Inspections = ({ permissions }) => (
  <Tabs defaultActiveKey="1">
    <Tabs.TabPane tab="Inspection Forms" key="1">
      <InspectionForms permissions={permissions} />
    </Tabs.TabPane>
    <Tabs.TabPane tab="Questions" key="2">
      <InspectionQuestions permissions={permissions} />
    </Tabs.TabPane>
  </Tabs>
);

export default Inspections;
