import React, { Component, Fragment } from 'react';
import moment from 'moment';
import Qs from 'qs';
import { Link } from 'react-router-dom';
import {
  Col, Form, DatePicker, Table, Button, message, Card
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { Row, FormItem } from '../elements';
import { SelectField } from '.';
import { paymentStatusLesserFilter } from '../utils/constants';
import { PaymentStatusTag } from '.';

const RANGES = {
  'Last Hour': [moment().startOf('hour'), moment().endOf('hour')],
  Today: [moment().startOf('day'), moment().endOf('day')],
  'Last 12 Hours': [moment().subtract('12', 'hour'), moment()],
  'Last 2 days': [moment().subtract('1', 'day').startOf('day'), moment().endOf('day')],
  'This Week': [moment().startOf('week'), moment().endOf('week')],
  'This Month': [moment().startOf('month'), moment().endOf('month')]
};

const INIT = props => ({
  filters: {
    createdTimestamp: {
      start: RANGES['Last 2 days'][0].format('YYYY-MM-DD HH:mm'),
      end: RANGES['Last 2 days'][1].format('YYYY-MM-DD HH:mm')
    }
  },

  sort: {
    field: '',
    order: 1
  },

  items: [],
  skip: 0,
  limit: 15,
  total: 0,
  totals: [],
  fetching: false
});

const INIT_SEARCH = {
  status: '',
  createdTimestamp: {
    start: RANGES['Last 2 days'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES['Last 2 days'][1].format('YYYY-MM-DD HH:mm')
  },
  driverId: ''
};

class TipList extends Component {
  state = {
    ...INIT(this.props)
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps) {
    if (this.props.location !== prevProps.location) {
      this.fetch();
    }
  }

  fetch = async () => {
    const {
      fetching, filters, skip, limit
    } = this.state;
    if (fetching) {
      return;
    }

    const params = {
      locationId: this.props.location, ...filters, skip, limit
    };

    this.setState({ fetching: true });
    try {
      const { data } = await axios({
        url: '/v1/tips',
        params,
        paramsSerializer: params => Qs.stringify(params, { arrayFormat: 'brackets' })
      });
      this.setState({ ...data });
    } catch (err) {
      const errorMessage = err.response && err.response.data
        ? err.response.data.message
        : null;
      message.error(errorMessage || 'An Error Occurred');
    } finally {
      this.setState({ fetching: false });
    }
  }

  onChange = (pagination, filters, sort = this.state.sort) => {
    const { current, pageSize } = pagination;
    const skip = (current * pageSize) - pageSize;

    this.setState({
      skip,
      filters: { ...this.state.filters, ...filters },
      sort: { ...sort }
    }, this.fetch);
  }

  render() {
    const {
      items, skip, limit, total, fetching, totals, driverFilterList = []
    } = this.state;
    const tipStatusFilter = paymentStatusLesserFilter();
    const driverFilter = driverFilterList.map(item => ({
      value: item.driverId,
      name: `${item.driverFirstName} ${item.driverLastName}`
    }));

    return (
      <Fragment>
        <Row spacing={15}>
          <Col>
            <Formik
              initialValues={{ ...INIT_SEARCH }}
              onSubmit={(values, _actions) => {
                this.onChange({ current: 1, pageSize: limit }, values);
              }}
              onReset={(_values, _actions) => {
                this.onChange({ current: 1, pageSize: limit }, { ...INIT_SEARCH }, {});
              }}
              render={formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Card title="Filters">
                    <Row gutter={15} spacing={15}>

                      <Col xs={24} sm={12} md={6}>
                        Status
                        {' '}
                        <Field
                          placeholder="Filter by status"
                          name="status"
                          options={tipStatusFilter}
                          component={SelectField}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        Driver
                        {' '}
                        <Field
                          placeholder="Filter by driver"
                          name="driverId"
                          options={driverFilter}
                          component={SelectField}
                        />
                      </Col>

                      <Col xs={24} sm={12} md={6}>
                        Date
                        {' '}
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
                              formProps.values.createdTimestamp.start ? moment(formProps.values.createdTimestamp.start) : '',
                              formProps.values.createdTimestamp.end ? moment(formProps.values.createdTimestamp.end) : ''
                            ]}
                            onChange={(_dates, strings) => {
                              formProps.setFieldValue('createdTimestamp.start', strings[0]);
                              formProps.setFieldValue('createdTimestamp.end', strings[1]);
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
                  </Card>
                  &nbsp;
                  <Card title="Driver Tip Totals">
                  <Table
                      dataSource={totals}
                      size="small"
                      loading={fetching}
                      onChange={this.onChange}
                      pagination={false}
                      header="Tip Totals"
                    >
                      <Table.Column
                        title="Name"
                        render={(val, i) => (
                          <Link to={`/drivers/${val.driverId}`}>
                            {val.driverFirstName}
                            {' '}
                            {val.driverLastName}
                          </Link>
                        )}
                      />
                      <Table.Column title="Total" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.total || 0.0) / 100.0)} (${val.totalCount})`} />
                      <Table.Column title="Net" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.net || 0.0) / 100.0)} (${val.netCount})`} />
                      <Table.Column title="Fee" render={(val, i) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val.fee || 0.0) / 100.0)} (${val.feeCount})`} />
                    </Table>
                  </Card>
                  &nbsp;
                </Form>
              )}
            />
          </Col>
        </Row>

        <Card title="Driver Tip List">
          <Row>
            <Col>
              <Table
                dataSource={items}
                rowKey={i => i.id}
                size="small"
                loading={fetching}
                pagination={{
                  pageSize: limit, size: 'small', current: (skip + limit) / limit, total
                }}
                onChange={this.onChange}
              >
                <Table.Column
                  title="Driver"
                  render={(val, i) => (
                    <Link to={`/drivers/${val.driverId}`}>
                      {val.driverFirstName}
                      {' '}
                      {val.driverLastName}
                    </Link>
                  )}
                />
                <Table.Column
                  title="Rider"
                  render={(val, i) => (
                    <Link to={`/riders/${val.riderId}`}>
                      {val.riderFirstName}
                      {' '}
                      {val.riderLastName}
                    </Link>
                  )}
                />
                <Table.Column title="Ride" dataIndex="rideId" render={(val, i) => <Link to={`/rides/${val}`}>Ride</Link>} />
                <Table.Column title="Total" dataIndex="total" render={val => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val || 0.0) / 100.0)} />
                <Table.Column title="Net" dataIndex="net" render={val => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val || 0.0) / 100.0)} />
                <Table.Column title="Fee" dataIndex="fee" render={val => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((val || 0.0) / 100.0)} />
                <Table.Column title="Status" dataIndex="status" render={(val, i) => <PaymentStatusTag status={val} />} />
                <Table.Column title="Created" dataIndex="createdTimestamp" />
              </Table>
            </Col>
          </Row>
        </Card>
      </Fragment>
    );
  }
}

export default TipList;
