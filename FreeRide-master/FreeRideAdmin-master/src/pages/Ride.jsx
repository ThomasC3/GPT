import React from 'react';
import { Tabs, Spin, message } from 'antd';
import axios from 'axios';
import { RideInfo, RidePaymentInfo, RideTipInfo } from '../components';

class Ride extends React.Component {
  state = {
    cancelTimestamp: null,
    isOldRecord: '',
    ratingForRider: '',
    feedbackForRider: '',
    ratingForDriver: '',
    feedbackForDriver: '',
    requestMessages: '',
    driver: {},
    request: {},
    location: {},
    rider: {},
    passengers: '',
    isADA: '',
    pickupAddress: '',
    pickupLatitude: '',
    pickupLongitude: '',
    dropoffAddress: '',
    dropoffLatitude: '',
    dropoffLongitude: '',
    status: '',
    createdTimestamp: '',
    dropoffTimestamp: '',
    pickupTimestamp: '',
    eta: '',
    id: '',
    fetching: true
  }

  componentDidMount() {
    if (this.props.match.params.id) {
      this.fetch(this.props.match.params.id);
    } else {
      this.setState({ fetching: false });
    }
  }

  fetch = async (id) => {
    this.setState({ fetching: true });
    try {
      const data = await axios({
        url: `/v1/rides/${id}`
      }).then(res => res.data);
      this.setState({ fetching: false, ...data });
    } catch (e) {
      message.error('An error has occured');
      this.setState({ fetching: false });
    }
  }

  completeRide = async () => {
    try {
      const data = await axios({
        url: `/v1/rides/${this.props.match.params.id}/complete`,
        method: 'PUT'
      }).then(res => res.data);
      this.setState({ ...data });
    } catch (e) {
      message.error('An error has occured');
    }
  }

  cancelRide = async () => {
    try {
      const data = await axios({
        url: `/v1/rides/${this.props.match.params.id}/cancel`,
        method: 'PUT'
      }).then(res => res.data);
      this.setState({ ...data });
    } catch (e) {
      if (e.response.data && e.response.data.message) {
        message.error(e.response.data.message);
      } else {
        message.error('An error has occured');
      }
    }
  }

  render() {
    let paymentTab;
    if (this.state.request && this.state.request.paymentInformation && this.state.request.paymentInformation.totalPrice) {
      paymentTab = (
        <Tabs.TabPane tab="Ride Payment Info" key="2">
          <RidePaymentInfo
            ride={this.state}
            rideIdParam={this.props.match.params.id}
          />
        </Tabs.TabPane>
      );
    }
    let tipTab;
    if (this.state.tips && this.state.tips.length) {
      tipTab = (
        <Tabs.TabPane tab="Ride Tip Info" key="3">
          <RideTipInfo
            ride={this.state}
            rideIdParam={this.props.match.params.id}
          />
        </Tabs.TabPane>
      );
    }
    return (
      <Spin spinning={this.state.fetching}>
        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Ride Details" key="1">
            <RideInfo
              cancelRide={this.cancelRide}
              completeRide={this.completeRide}
              ride={this.state}
              rideIdParam={this.props.match.params.id}
            />
          </Tabs.TabPane>
          { paymentTab }
          { tipTab }
        </Tabs>
      </Spin>
    );
  }
}

export default Ride;
