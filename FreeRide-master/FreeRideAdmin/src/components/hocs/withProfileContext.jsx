import React, { useContext } from 'react';
import Profile from '../providers/Profile';

const withProfileContext = WrappedComponent => (props) => {
  const context = useContext(Profile.ProfileContext);
  return <WrappedComponent {...props} profileContext={context} />;
};

export default withProfileContext;
