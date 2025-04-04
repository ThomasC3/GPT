import React, { Component, Fragment } from 'react';
import {
  Card, Col, Button, Form, message, Table, DatePicker
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import moment from 'moment';
import Qs from 'qs';
import { FormItem, Row } from '../elements';
import { PageSpinner, MultiSelectField } from '../components';

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
    end: RANGES['Last Month'][1].format('YYYY-MM-DD HH:mm'),
    locations: []
  }
};

class Stats extends Component {
  state = {
    ...INIT_SEARCH,
    paymentStats: [],
    paymentStatsTotal: [],
    fetching_payment_stats: false,
    fetching_promocode_stats: false,
    fetching_tip_stats: false
  }

  onReset = () => {
    this.setState({ ...INIT_SEARCH });
  }

  componentDidMount() {
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.fetching_payment_stats && !prevState.fetching_payment_stats) {
      this.fetch_payment_stats();
    }
    if (this.state.fetching_promocode_stats && !prevState.fetching_promocode_stats) {
      this.fetch_promocode_stats();
    }
    if (this.state.fetching_tip_stats && !prevState.fetching_tip_stats) {
      this.fetch_tip_stats();
    }
  }

  fetch_payment_stats = async () => {
    this.setState({ fetching_payment_stats: true });
    try {
      const { filters } = this.state;
      const data = await axios({
        url: '/v1/stats/payment',
        params: filters,
        paramsSerializer: filters => Qs.stringify(filters, { arrayFormat: 'brackets' })
      }).then(({ data }) => data);
      this.setState({ fetching_payment_stats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  fetch_promocode_stats = async () => {
    this.setState({ fetching_promocode_stats: true });
    try {
      const { filters } = this.state;
      const data = await axios({
        url: '/v1/stats/promocode',
        params: filters,
        paramsSerializer: filters => Qs.stringify(filters, { arrayFormat: 'brackets' })
      }).then(({ data }) => data);
      this.setState({ fetching_promocode_stats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  fetch_tip_stats = async () => {
    this.setState({ fetching_tip_stats: true });
    try {
      const { filters } = this.state;
      const data = await axios({
        url: '/v1/stats/tips',
        params: filters,
        paramsSerializer: filters => Qs.stringify(filters, { arrayFormat: 'brackets' })
      }).then(({ data }) => data);
      this.setState({ fetching_tip_stats: false, ...data });
    } catch (e) {
      message.error(e.message);
    }
  }

  onChange = (filters) => {
    this.setState({
      filters,
      fetching_payment_stats: true,
      fetching_promocode_stats: true,
      fetching_tip_stats: true
    });
  }

  render() {
    const { locations } = this.props;
    const locationSelector = locations.map(item => ({ value: String(item.id), name: item.name }));
    // Fetching state
    const {
      fetching_payment_stats,
      fetching_promocode_stats,
      fetching_tip_stats
    } = this.state;

    const {
      // Payment stats
      paymentStats,
      paymentStatsTotal,
      // Promocode stats
      promocodeStats,
      promocodeStatsTotal,
      // Tips
      tipStats
    } = this.state;

    return (
      <Fragment>
        <Card title="Filters">
          <Row spacing={15}>
            <Col>
              <Formik
                initialValues={{ ...INIT_SEARCH }}
                onSubmit={(values, actions) => {
                  this.onChange(values);
                }}
                onReset={(values, actions) => {
                  this.onChange({ ...INIT_SEARCH });
                }}
                render={formProps => (
                  <Form onSubmit={formProps.handleSubmit}>
                    <Row gutter={15} spacing={15}>
                      <Col xs={24} sm={12} md={6}>
                        <Field
                          placeholder="Filter by location"
                          name="filters.locations"
                          options={locationSelector}
                          component={MultiSelectField}
                        />
                      </Col>

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
                        fetching_payment_stats
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
        <Card title="Payment statistics">
          {!fetching_payment_stats
            && (
            <Row gutter={15}>
              <p><strong>Payment per city</strong></p>
              <Col>
                <Table
                  dataSource={paymentStats}
                  rowKey={i => i.city}
                  size="small"
                  loading={fetching_payment_stats}
                >
                  <Table.Column title="City" render={(val, i) => val.city} />
                  <Table.Column title="Request Count" render={(val, i) => val.requestCount} />
                  <Table.Column title="Cancelled" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.cancelledValue || 0.0) / 100.0)} (${val.cancelledCount})`} />
                  <Table.Column title="Pending" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.pendingValue || 0.0) / 100.0)} (${val.pendingCount})`} />
                  <Table.Column title="Refunded" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.refundedValue || 0.0) / 100.0)} (${val.refundedCount})`} />
                  <Table.Column title="Partial Charge" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.partialChargeValue || 0.0) / 100.0)} (${val.partialChargeCount})`} />
                  <Table.Column title="Succeeded" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.succeededValue || 0.0) / 100.0)} (${val.succeededCount})`} />
                  <Table.Column title="Total" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.succeededValue || 0.0) / 100.0 + (val.partialChargeValue || 0.0) / 100.0)} (${val.succeededCount + val.partialChargeCount})`} />
                  <Table.Column title="Per driver" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.perDriver || 0.0) / 100.0)} (${val.driverCount})`} />
                  <Table.Column title="Per rider" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.perRider || 0.0) / 100.0)} (${val.riderCount})`} />
                  <Table.Column title="Per ride" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.perRide || 0.0) / 100.0)} (${val.succeededCount + val.partialChargeCount})`} />
                  <Table.Column title="Per service hour" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.perServiceHour || 0.0) / 100.0)} (${val.serviceHourCount})`} />
                </Table>
              </Col>
            </Row>
            )
          }
          &nbsp;
          {!fetching_payment_stats
            && (
            <Row gutter={15}>
              <p><strong>Payment totals</strong></p>
              <Col>
                <Table
                  dataSource={paymentStatsTotal}
                  size="small"
                  loading={fetching_payment_stats}
                  pagination={false}
                >
                  <Table.Column title="Request Count" render={(val, i) => val.requestCount} />
                  <Table.Column title="Cancelled" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.cancelledValue || 0.0) / 100.0)} (${val.cancelledCount})`} />
                  <Table.Column title="Pending" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.pendingValue || 0.0) / 100.0)} (${val.pendingCount})`} />
                  <Table.Column title="Refunded" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.refundedValue || 0.0) / 100.0)} (${val.refundedCount})`} />
                  <Table.Column title="Partial Charge" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.partialChargeValue || 0.0) / 100.0)} (${val.partialChargeCount})`} />
                  <Table.Column title="Succeeded" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.succeededValue || 0.0) / 100.0)} (${val.succeededCount})`} />
                  <Table.Column title="Total" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format(((val.succeededValue || 0.0) + (val.partialChargeValue || 0.0)) / 100.0)} (${val.succeededCount + val.partialChargeCount})`} />
                </Table>
              </Col>
            </Row>
            )
          }
        </Card>
        &nbsp;
        <Card title="Promocode statistics">
          {!fetching_promocode_stats
            && (
            <Row gutter={15}>
              <p><strong>Promocodes per city</strong></p>
              <Col>
                <Table
                  dataSource={promocodeStats}
                  size="small"
                  loading={fetching_promocode_stats}
                >
                  <Table.Column title="City" render={(val, i) => val.city} />
                  <Table.Column title="Code" render={(val, i) => val.promocodeCode} />
                  <Table.Column title="Saved" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.totalSaved || 0.0) / 100.0)}`} />
                  <Table.Column title="Rider Count" render={(val, i) => val.riderCount} />
                  <Table.Column title="Use Count" render={(val, i) => val.promocodeUseCount} />
                  <Table.Column title="Uses per day" render={(val, i) => val.perDay.toFixed(3)} />
                  <Table.Column title="Uses per week" render={(val, i) => val.perWeek.toFixed(3)} />
                  <Table.Column title="Uses per month" render={(val, i) => val.perMonth.toFixed(3)} />
                </Table>
              </Col>
            </Row>
            )
          }
          &nbsp;
          {!fetching_promocode_stats
            && (
            <Row gutter={15}>
              <p><strong>Promocode totals</strong></p>
              <Col>
                <Table
                  dataSource={promocodeStatsTotal}
                  size="small"
                  loading={fetching_promocode_stats}
                >
                  <Table.Column title="City" render={(val, i) => val.city} />
                  <Table.Column title="Saved" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.totalSaved || 0.0) / 100.0)}`} />
                  <Table.Column title="Rider Count" render={(val, i) => val.riderCount} />
                  <Table.Column title="Use Count" render={(val, i) => val.promocodeUseCount} />
                  <Table.Column title="Uses per day" render={(val, i) => val.perDay.toFixed(3)} />
                  <Table.Column title="Uses per week" render={(val, i) => val.perWeek.toFixed(3)} />
                  <Table.Column title="Uses per month" render={(val, i) => val.perMonth.toFixed(3)} />
                </Table>
              </Col>
            </Row>
            )
          }
        </Card>
        &nbsp;
        <Card title="Tip statistics">
          {!fetching_tip_stats
            && (
            <Row gutter={15}>
              <p><strong>Gross tips per city</strong></p>
              <Col>
                <Table
                  dataSource={tipStats}
                  size="small"
                  loading={fetching_promocode_stats}
                >
                  <Table.Column title="City" render={(val, i) => val.city} />
                  <Table.Column title="Gross" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.tipTotal || 0.0) / 100.0)}`} />
                  <Table.Column title="Ride Tip %" render={(val, i) => `${val.tipPerc}%`} />
                  <Table.Column title="Tip Count" dataIndex="tipCount" />
                  <Table.Column title="Ride Count" dataIndex="rideCount" />
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

export default Stats;
