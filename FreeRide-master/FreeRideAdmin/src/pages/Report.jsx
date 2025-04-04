import * as React from 'react';
import { Card } from 'antd';
import ReportInfo from '../components/ReportInfo';

const Report = props => (
  <Card title="Report Details">
    <ReportInfo id={props.match.params.id} history={props.history} />
  </Card>
);

export default Report;
