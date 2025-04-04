import React from 'react';
import { Card } from 'antd';
import { AdminInfo } from '../components';

const Admin = (props) => {
  const { match: { params: { id } } } = props;
  return (
    <Card title="Admin Details">
      <AdminInfo id={id} />
    </Card>
  );
};

export default Admin;
