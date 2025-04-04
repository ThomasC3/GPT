import * as React from 'react';
import PropTypes from 'prop-types';
import { Spin, Transfer } from 'antd';
import axios from 'axios';
import Qs from 'qs';
import { ENDPOINTS } from '../utils/constants';

class CampaignSelector extends React.PureComponent {
  state={
    campaigns: [],
    fetching: true
  }

  componentDidMount() {
    this.fetch();
  }

  fetch = async () => {
    const { availableForAdvertiserId } = this.props;
    this.setState({ fetching: true });
    const params = {};
    if (availableForAdvertiserId) {
      params.filters = {
        availableForAdvertiserId
      };
    }
    try {
      const data = await axios({
        url: ENDPOINTS.CAMPAIGNS,
        params,
        paramsSerializer: p => Qs.stringify(p, { arrayFormat: 'brackets' })
      }).then(res => res.data);
      this.setState({ fetching: false, campaigns: data.items });
    } catch (e) {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { campaigns, fetching } = this.state;
    const { values, onChange } = this.props;
    return (
      <Spin spinning={fetching}>
        <Transfer
          showSearch
          dataSource={campaigns.map(i => ({ key: i.id, title: i.name }))}
          titles={['Campaigns', 'Manages']}
          listStyle={{ width: 200, height: 200 }}
          targetKeys={values}
          onChange={onChange}
          filterOption={(input, option) => (
            ((option && option.title) || '')
              .toLowerCase().includes(input.toLowerCase())
          )}
          render={i => <span>{i.title}</span>}
        />
      </Spin>

    );
  }
}

CampaignSelector.propTypes = {
  values: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func
};

CampaignSelector.defaultProps = {
  values: [],
  onChange: () => {}
};

export default CampaignSelector;
