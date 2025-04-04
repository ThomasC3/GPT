import React, { Component } from 'react';
import { Descriptions, message } from 'antd';
import axios from 'axios';
import moment from 'moment';
import { formatPromocodeValue } from '../utils/format';

const INIT = {
  id: null,
  value: null,
  name: '',
  code: '',
  type: '',
  usageLimit: '',
  expiryDate: '',
  isEnabled: '',
  isDeleted: '',
  createdTimestamp: '',
  fetching: true
};

class PromocodeInfo extends Component {
  state = {
    ...INIT
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.fetching && !prevState.fetching) {
      this.fetch();
    }
  }

  fetch = async () => {
    const id = this.state.id || this.props.id;
    if (!id) {
      this.setState({ fetching: false });
      return;
    }

    await axios({
      url: `/v1/promocodes/${id}`
    })
      .then((res) => {
        this.setState({ fetching: false, ...res.data });
      }).catch((err) => {
        console.log(err.response);
        message.error('A error occured');
        this.setState({ fetching: false });
      });
  }

  render() {
    const {
      name, code, type, usageLimit,
      expiryDate, isEnabled, value
    } = this.state;

    return (
      <Descriptions
        title="Promocode"
        bordered
        column={{
          xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1
        }}
      >
        <Descriptions.Item label="Name">{ name }</Descriptions.Item>
        <Descriptions.Item label="Code">{ code }</Descriptions.Item>
        <Descriptions.Item label="Type">{ type }</Descriptions.Item>
        <Descriptions.Item label="Amount">{ formatPromocodeValue(type, value) }</Descriptions.Item>
        <Descriptions.Item label="Enabled">{ isEnabled ? 'Yes' : 'No' }</Descriptions.Item>
        <Descriptions.Item label="Usage Limit">{ usageLimit || '-'}</Descriptions.Item>
        <Descriptions.Item label="Expiry Date">
          { expiryDate ? moment(expiryDate).format('MM/DD/YYYY') : '-' }
        </Descriptions.Item>
      </Descriptions>
    );
  }
}

export default PromocodeInfo;
