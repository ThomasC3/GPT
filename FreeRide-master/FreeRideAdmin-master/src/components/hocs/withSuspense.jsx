import React, { Suspense } from 'react';
import { Spin } from 'antd';

export default Component => props => (
  <Suspense fallback={<Spin />}>
    <Component {...props} />
  </Suspense>
);
