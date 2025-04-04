import * as React from 'react';
import { Spin } from 'antd';

const PageSpinner = () => (
  <Spin style={{
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    position: 'absolute !important'
  }}
  />
);


export default PageSpinner;
