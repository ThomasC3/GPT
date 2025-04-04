import React from 'react';
import { Card } from 'antd';

const SmallCard = props => (
  <Card size="small" headStyle={{ background: 'rgb(190, 200, 200)' }} {...props} />
);

export default SmallCard;
