import React from 'react';
import { Card, Tabs } from 'antd';
import { TipList, TipListCsv } from '../components';

const Tips = props => (
  <Tabs defaultActiveKey="1">
    <Tabs.TabPane tab="Tip List" key="1">
      <Card title="Tips">
        <TipList location={props.location} />
      </Card>
    </Tabs.TabPane>
    <Tabs.TabPane tab="Tip CSV" key="2">
      <Card title="Export Tips">
        <TipListCsv location={props.location} />
      </Card>
    </Tabs.TabPane>
  </Tabs>
);

export default Tips;
