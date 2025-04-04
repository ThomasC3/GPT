import * as React from 'react';
import PropTypes from 'prop-types';
import { Spin, Select } from 'antd';
import axios from 'axios';
import { ENDPOINTS } from '../utils/constants';

class AdvertisersDropdown extends React.PureComponent {
  state={
    advertisers: [],
    fetching: true
  }

  componentDidMount() {
    this.fetch();
  }

  fetch = async () => {
    this.setState({ fetching: true });
    try {
      const data = await axios({
        url: ENDPOINTS.ADVERTISERS
      }).then(res => res.data);
      this.setState({ fetching: false, advertisers: data.items });
    } catch (e) {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { advertisers, fetching } = this.state;
    const { value, onChange } = this.props;

    return (
      <Spin spinning={fetching}>
        <Select
          showSearch
          menuPlacement="auto"
          menuPosition="fixed"
          size="small"
          onChange={onChange}
          value={value}
          filterOption={(input, option) => (
            ((option && option.props.value && option.props.children) || '')
              .toLowerCase().includes(input.toLowerCase())
          )}
          style={{ width: '250px' }}
        >
          <Select.Option value={null}>Select Advertiser</Select.Option>
          {advertisers.map(i => <Select.Option key={i.id} value={i.id}>{`${i.name} (${i.clientId})`}</Select.Option>)}
        </Select>
      </Spin>
    );
  }
}

AdvertisersDropdown.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func
};

AdvertisersDropdown.defaultProps = {
  value: '',
  onChange: () => {}
};

export default AdvertisersDropdown;
