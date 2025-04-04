import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Tabs } from 'antd';
import { withRouter } from 'react-router-dom';
import {
  Profile, AdvertiserList, CampaignList, MediaList
} from '../components';

const DigitalAds = (props) => {
  const { locations } = useContext(Profile.ProfileContext);
  const { tab, history } = props;

  const handleTabChange = (key) => {
    history.push(`/digital-ads/${key}`);
  };

  return (
    <Tabs defaultActiveKey={tab} onChange={handleTabChange}>
      <Tabs.TabPane tab="Advertisers" key="advertisers">
        <AdvertiserList />
      </Tabs.TabPane>
      <Tabs.TabPane tab="Media" key="media">
        <MediaList />
      </Tabs.TabPane>
      <Tabs.TabPane tab="Campaigns" key="campaigns">
        <CampaignList locations={locations} />
      </Tabs.TabPane>
    </Tabs>
  );
};

DigitalAds.propTypes = {
  tab: PropTypes.string,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired
  }).isRequired
};

DigitalAds.defaultProps = {
  tab: 'advertisers'
};

export default withRouter(DigitalAds);
