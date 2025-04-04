import React, { Component, Fragment } from 'react';
import {
  Card, Col, Button, Form, message, Table, DatePicker
} from 'antd';
import { Formik } from 'formik';
import axios from 'axios';
import moment from 'moment';
import Qs from 'qs';
import { FormItem, Row } from '../elements';
import { PageSpinner } from '.';

const RANGES = {
  'Last Month': [moment().subtract('1', 'month').startOf('month'), moment().subtract('1', 'month').endOf('month')],
  'Last Week': [moment().subtract('1', 'week').startOf('week'), moment().subtract('1', 'week').endOf('week')],
  'This Month': [moment().startOf('month'), moment().endOf('month')],
  'This Week': [moment().startOf('week'), moment().endOf('week')],
  Today: [moment().startOf('day'), moment().endOf('day')]
};

const INIT_SEARCH = {
  filters: {
    start: RANGES['Last Month'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES['Last Month'][1].format('YYYY-MM-DD HH:mm')
  }
};

class RideStats extends Component {
  state = {
    ...INIT_SEARCH,

    waitTimes: [],

    rideStats: [],

    riderStats: [],
    volumeStats: [],

    fetchingWaitTimes: false,
    fetchingRideStats: false,
    fetchingRiderStats: false,
    fetchingRatingStats: false,
    fetchingExperienceStats: false
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      fetchingWaitTimes: currentlyFetching
    } = this.state;
    const {
      fetchingWaitTimes: previouslyFetching
    } = prevState;
    if (currentlyFetching && !previouslyFetching) {
      this.fetchWaitTimes();
      this.fetchRideStats();
      this.fetchRiderStats();
      this.fetchRatingStats();
      this.fetchExperienceStats();
      this.fetchPoolingStats();
    }
  }

  onReset = () => {
    this.setState({ ...INIT_SEARCH });
  }

  fetchWaitTimes = async () => {
    this.setState({ fetchingWaitTimes: true });
    try {
      const { filters } = this.state;
      const { data } = await axios({
        url: '/v1/stats/wait-times',
        params: filters,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingWaitTimes: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  fetchRideStats = async () => {
    this.setState({ fetchingRideStats: true });
    try {
      const { filters } = this.state;
      const { data } = await axios({
        url: '/v1/stats/rides',
        params: filters,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingRideStats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  fetchRiderStats = async () => {
    this.setState({ fetchingRiderStats: true });
    try {
      const { filters } = this.state;
      const { data } = await axios({
        url: '/v1/stats/riders',
        params: filters,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingRiderStats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  fetchRatingStats = async () => {
    this.setState({ fetchingRatingStats: true });
    try {
      const { filters } = this.state;
      const { data } = await axios({
        url: '/v1/stats/rating',
        params: filters,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingRatingStats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  fetchExperienceStats = async () => {
    this.setState({ fetchingExperienceStats: true });
    try {
      const { filters } = this.state;
      const { data } = await axios({
        url: '/v1/stats/experience',
        params: filters,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingExperienceStats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  fetchPoolingStats = async () => {
    this.setState({ fetchingPoolingStats: true });
    try {
      const { filters } = this.state;
      const { data } = await axios({
        url: '/v1/stats/pooling',
        params: filters,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingPoolingStats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  onChange = (filters) => {
    this.setState({
      filters,
      fetchingWaitTimes: true,
      fetchingRideStats: true,
      fetchingRiderStats: true,
      fetchingRatingStats: true,
      fetchingExperienceStats: true,
      fetchingPoolingStats: true
    });
  }

  render() {
    // Fetching state
    const {
      fetchingWaitTimes,
      fetchingRideStats,
      fetchingRiderStats,
      fetchingRatingStats,
      fetchingExperienceStats,
      fetchingPoolingStats
    } = this.state;

    const {
      // Wait times
      waitTimes,
      // Ride stats
      rideStats,
      volumeStats,
      // Rider stats
      riderStats,
      // Rating stats
      ratingStats,
      // Experience stats
      experienceStats,
      // Pooling stats
      poolingStats
    } = this.state;

    return (
      <Fragment>
        <Card title="Filters">
          <Row spacing={15}>
            <Col>
              <Formik
                initialValues={{ ...INIT_SEARCH }}
                onSubmit={(values) => {
                  this.onChange(values);
                }}
                onReset={() => {
                  this.onChange({ ...INIT_SEARCH });
                }}
                render={formProps => (
                  <Form onSubmit={formProps.handleSubmit}>
                    <Row gutter={15} spacing={15}>
                      <Col xs={24} sm={12} md={6}>
                        <FormItem>
                          <DatePicker.RangePicker
                            showTime={{
                              format: 'HH:mm',
                              defaultValue: [moment('00:00:00', 'HH:mm:ss'), moment('23:59:59', 'HH:mm:ss')]
                            }}
                            size="small"
                            allowClear={false}
                            format="YYYY-MM-DD HH:mm"
                            placeholder={['Request From', 'Request To']}
                            ranges={RANGES}
                            value={[
                              formProps.values.filters.start ? moment(formProps.values.filters.start) : '',
                              formProps.values.filters.end ? moment(formProps.values.filters.end) : ''
                            ]}
                            onChange={(_dates, strings) => {
                              formProps.setFieldValue('filters.start', strings[0]);
                              formProps.setFieldValue('filters.end', strings[1]);
                            }}
                          />
                        </FormItem>
                      </Col>
                    </Row>
                    <Row gutter={15}>
                      <Col>
                        <Button size="small" onClick={formProps.handleReset}>Reset</Button>
                        &nbsp;
                        <Button type="primary" size="small" htmlType="submit">Filter</Button>
                      </Col>
                    </Row>
                    &nbsp;
                    <Row gutter={15}>
                      {(
                        fetchingWaitTimes
                        || fetchingRideStats
                        || fetchingRiderStats
                        || fetchingRatingStats
                        || fetchingExperienceStats
                        || fetchingPoolingStats
                      )
                        && (<center><PageSpinner size="large" /></center>)
                      }
                    </Row>

                  </Form>
                )}
              />
            </Col>
          </Row>
        </Card>
        &nbsp;
        <Card title="Ride stats">
          {!fetchingRideStats
            && (
            <Row gutter={15}>
              <p><strong>Ride success</strong></p>
              <Col>
                <Table
                  dataSource={rideStats}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetchingRideStats}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Completed" render={val => val.completedRides} />
                  <Table.Column
                    title="Cancelled (Requests/Rides)"
                    render={val => `${val.ongoingRides + val.noShowRides + val.notAbleRides + val.riderCancelRides + val.riderCancelOnRequestRides + val.cancelledRequests}
                       (${val.cancelledRequests}/${val.ongoingRides + val.noShowRides + val.notAbleRides + val.riderCancelRides + val.riderCancelOnRequestRides})`
                    }
                  />
                  <Table.Column title="Missed" render={val => val.missedRides} />
                  <Table.Column title="Total requests" render={val => val.requestCount} />
                </Table>
              </Col>
            </Row>
            )
          }
          &nbsp;
          {!fetchingRideStats
            && (
            <Row gutter={15}>
              <p><strong>Rides status</strong></p>
              <Col>
                <Table
                  dataSource={rideStats}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetchingRideStats}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Completed" render={val => `${val.completedRides} (${val.completedRidesPerc}%)`} />
                  <Table.Column title="Completed (hailed)" render={val => `${val.hailedRides} (${val.hailedRidesPerc}%)`} />
                  <Table.Column title="Ongoing" render={val => `${val.ongoingRides} (${val.ongoingRidesPerc}%)`} />
                  <Table.Column title="No-show" render={val => `${val.noShowRides} (${val.noShowRidesPerc}%)`} />
                  <Table.Column title="Not able" render={val => `${val.notAbleRides} (${val.notAbleRidesPerc}%)`} />
                  <Table.Column title="Cancelled by rider" render={val => `${val.riderCancelRides} (${val.riderCancelRidesPerc}%)`} />
                  <Table.Column title="Cancelled on request" render={val => `${val.riderCancelOnRequestRides} (${val.riderCancelOnRequestRidesPerc}%)`} />
                  <Table.Column title="Total rides" render={val => val.rideCount} />
                </Table>
              </Col>
            </Row>
            )
          }
        </Card>
        &nbsp;
        <Card title="Passenger stats">
          {!fetchingRiderStats
            && (
            <Row gutter={15}>
              <p><strong>Passenger per ride</strong></p>
              <Col>
                <Table
                  dataSource={riderStats}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetchingRiderStats}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Passenger number per ride" render={val => val.average} />
                  <Table.Column title="Ride count" render={val => val.rideCount} />
                  <Table.Column title="Total passengers" render={val => val.passengers} />
                  <Table.Column title="Using service hours" render={val => `${val.enforceServiceHours} (${val.serviceHours})`} />
                  <Table.Column title="Passenger per service hour" render={val => val.perServiceHour} />
                </Table>
              </Col>
            </Row>
            )
          }
          &nbsp;
          {!fetchingRiderStats
            && (
            <Row gutter={15}>
              <p><strong>Ride volume</strong></p>
              <Col>
                <Table
                  dataSource={volumeStats}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetchingRiderStats}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Number of rides" render={val => val.rideCount} />
                  <Table.Column title="Number of passengers" render={val => val.passengerCount} />
                  <Table.Column title="From" render={val => val.startDay} />
                  <Table.Column title="To" render={val => val.endDay} />
                  <Table.Column title="Days" render={val => val.days} />
                  <Table.Column title="Rides per day" render={val => val.perDay} />
                  <Table.Column title="Rides per Week" render={val => val.perWeek} />
                  <Table.Column title="Rides per Month" render={val => val.perMonth} />
                  <Table.Column title="Passengers per day" render={val => val.passengersPerDay} />
                  <Table.Column title="Passengers per Week" render={val => val.passengersPerWeek} />
                  <Table.Column title="Passengers per Month" render={val => val.passengersPerMonth} />
                </Table>
              </Col>
            </Row>
            )
          }
        </Card>
        &nbsp;
        <Card title="Rating stats">
          {!fetchingRatingStats
            && (
            <Row gutter={15}>
              <p><strong>Driver ratings</strong></p>
              <Col>
                <Table
                  dataSource={ratingStats}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetchingRatingStats}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Rating count" render={val => val.ratings} />
                  <Table.Column title="Rating average" render={val => val.average} />
                  <Table.Column title="5*" render={val => val.five_star} />
                  <Table.Column title="4*" render={val => val.four_star} />
                  <Table.Column title="3*" render={val => val.three_star} />
                  <Table.Column title="2*" render={val => val.two_star} />
                  <Table.Column title="1*" render={val => val.one_star} />
                </Table>
              </Col>
            </Row>
            )
          }
        </Card>
        &nbsp;
        <Card title="Experience stats">
          {!fetchingExperienceStats
            && (
            <Row gutter={15}>
              <p><strong>One timers vs repeat experience</strong></p>
              <Col>
                <Table
                  dataSource={experienceStats}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetchingExperienceStats}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Rider count (1 / *)" render={val => `${val.rideCountOne} / ${val.rideCountMult}`} />
                  <Table.Column title="Ratings AVG (1 / *)" render={val => `${val.ratingsOne} / ${val.ratingsMult}`} />
                  <Table.Column title="Pickup wait AVG (1 / *)" render={val => `${val.pickupTimesOneAvg} / ${val.pickupTimesMultAvg}`} />
                  <Table.Column title="Pickup wait P75 (1 / *)" render={val => `${val.pickupTimesOne} / ${val.pickupTimesMult}`} />
                  <Table.Column title="Pooling (1 / *)" render={val => `${val.poolingOne} (${val.poolingOnePerc}%) / ${val.poolingMult} (${val.poolingMultPerc}%)`} />
                  <Table.Column title="AVG Stops before dropoff (1 / *)" render={val => `${val.stopsBeforeDropoffOne} / ${val.stopsBeforeDropoffMult}`} />
                </Table>
              </Col>
            </Row>
            )
          }
        </Card>
        &nbsp;
        <Card title="Wait times">
          {!fetchingWaitTimes
            && (
            <Row gutter={15}>
              <p><strong>Pickup wait</strong></p>
              <Col>
                <Table
                  dataSource={waitTimes}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetchingWaitTimes}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Pickup time (P75)" render={val => val.pickupTime} />
                  <Table.Column title="Ride time (P75)" render={val => val.rideTime} />
                  <Table.Column title="Total time (P75)" render={val => val.totalTime} />
                  <Table.Column title="Pickup time (AVG)" render={val => val.pickupTimeAvg} />
                  <Table.Column title="Ride time (AVG)" render={val => val.rideTimeAvg} />
                  <Table.Column title="Total time (AVG)" render={val => val.totalTimeAvg} />
                  <Table.Column title="Ride count" render={val => val.rideCount} />
                </Table>
              </Col>
            </Row>
            )
          }
        </Card>
        &nbsp;
        <Card title="Pooling stats">
          {!fetchingPoolingStats
             && (
             <Row gutter={15}>
               <p><strong>Pooled rides</strong></p>
               <Col>
                 <Table
                   dataSource={poolingStats}
                   rowKey={i => i.city}
                   size="small"
                   loading={fetchingPoolingStats}
                 >
                   <Table.Column title="City" render={val => val.city} />
                   <Table.Column title="Ride count" render={val => val.rideCount} />
                   <Table.Column title="Pooled rides" render={val => `${val.pooledRide} (${val.pooledRidePerc}%)`} />
                   <Table.Column title="AVG ETA Difference (min:sec)" render={val => val.avgETADifference} />
                   <Table.Column title="AVG ETA (min:sec)" render={val => val.avgETA} />
                 </Table>
               </Col>
             </Row>
             )
           }
        </Card>
      </Fragment>
    );
  }
}

export default RideStats;
