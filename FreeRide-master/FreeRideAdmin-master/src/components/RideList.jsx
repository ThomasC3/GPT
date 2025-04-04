import React, { Component, Fragment } from 'react';
import moment from 'moment';
import Qs from 'qs';
import { Link } from 'react-router-dom';
import {
  Col, Form, DatePicker, Table, Button, message, Popover, Tag
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { Row, FormItem } from '../elements';
import { MultiSelectField, RideStatusTag, ButtonLink } from '.';
import { RANGES_SIMPLE } from '../utils/constants';

const INIT = props => ({
  filters: {
    createdTimestamp: {
      start: RANGES_SIMPLE['Last 2 days'][0].format('YYYY-MM-DD HH:mm'),
      end: RANGES_SIMPLE['Last 2 days'][1].format('YYYY-MM-DD HH:mm')
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
  paymentTotal: {
    succeeded: 0,
    pending: 0,
    cancelled: 0
  },
  tipTotal: {},
  fetching: false
});

const INIT_SEARCH = {
  ratingForRider: '',
  ratingForDriver: '',
  status: [],
  isADA: '',
  createdTimestamp: {
    start: RANGES_SIMPLE['Last 2 days'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES_SIMPLE['Last 2 days'][1].format('YYYY-MM-DD HH:mm')
  }
};

class RideList extends Component {
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

    const { location, rider, driver } = this.props;
    const params = {
      location, rider, driver, ...filters, skip, limit
    };

    this.setState({ fetching: true });
    try {
      const { data } = await axios({
        url: '/v1/rides',
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
      items, skip, limit, total, fetching, paymentTotal, tipTotal
    } = this.state;
    const paymentTotalShow = [
      {
        title: 'Current view',
        succeeded: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.succeededView || 0.0) / 100.0),
        refunded: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.refundedView || 0.0) / 100.0),
        pending: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.pendingView || 0.0) / 100.0),
        cancelled: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.cancelledView || 0.0) / 100.0)
      },
      {
        title: 'Total',
        succeeded: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.succeeded || 0.0) / 100.0),
        refunded: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.refunded || 0.0) / 100.0),
        pending: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.pending || 0.0) / 100.0),
        cancelled: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((paymentTotal.cancelled || 0.0) / 100.0)
      }
    ];

    const tipTotalShow = [
      {
        title: 'Current view',
        total: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((tipTotal.totalView || 0.0) / 100.0),
        net: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((tipTotal.netView || 0.0) / 100.0),
        fee: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((tipTotal.feeView || 0.0) / 100.0)
      },
      {
        title: 'Total',
        total: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((tipTotal.total || 0.0) / 100.0),
        net: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((tipTotal.net || 0.0) / 100.0),
        fee: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((tipTotal.fee || 0.0) / 100.0)
      }
    ];

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
                  <Row gutter={15} spacing={15}>

                    <Col xs={24} sm={12} md={6}>
                      <Field
                        placeholder="Filter by status"
                        name="status"
                        options={[
                          { value: 100, name: '(100) Ride Requested' },
                          { value: 101, name: '(101) Request Cancelled' },
                          { value: 102, name: '(102) Request Accepted' },
                          { value: 200, name: '(200) Rider in Queue' },
                          { value: 201, name: '(201) Next in Queue' },
                          { value: 202, name: '(202) Driver en Route' },
                          { value: 203, name: '(203) Driver Arrived' },
                          { value: 204, name: '(204) Cancelled in Queue' },
                          { value: 205, name: '(205) Cancelled en Route' },
                          { value: 206, name: '(206) Cancelled No Show' },
                          { value: 207, name: '(207) Cancelled Not Able' },
                          { value: 300, name: '(300) Ride in Progress' },
                          { value: 700, name: '(700) Ride Complete' },
                          { value: 701, name: '(701) Random Ride Complete' }
                        ]}
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
                          ranges={RANGES_SIMPLE}
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
                  &nbsp;
                  <Table
                    dataSource={paymentTotalShow}
                    size="small"
                    loading={fetching}
                    onChange={this.onChange}
                    pagination={false}
                    header="Payment Totals"
                  >
                    <Table.Header title="Payment Totals" dataIndex="title" />
                    <Table.Column title="Succeeded" dataIndex="succeeded" />
                    <Table.Column title="Refunded" dataIndex="refunded" />
                    <Table.Column title="Pending" dataIndex="pending" />
                    <Table.Column title="Cancelled" dataIndex="cancelled" />
                  </Table>
                  &nbsp;
                  <Table
                    dataSource={tipTotalShow}
                    size="small"
                    loading={fetching}
                    onChange={this.onChange}
                    pagination={false}
                    header="Tip Totals"
                  >
                    <Table.Header title="Tip Totals" dataIndex="title" />
                    <Table.Column title="Total" dataIndex="total" />
                    <Table.Column title="Net" dataIndex="net" />
                    <Table.Column title="Fee" dataIndex="fee" />
                  </Table>
                  &nbsp;
                </Form>
              )}
            />
          </Col>
        </Row>

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
                title="Rider"
                dataIndex="rider"
                render={(val, i) => (
                  <Link to={`/riders/${val.id}`}>
                    {val.firstName}
                    {' '}
                    {val.lastName}
                  </Link>
                )}
              />
              <Table.Column
                title="Driver"
                dataIndex="driver"
                render={(val, i) => (
                  <Link to={`/drivers/${val.id}`}>
                    {val.firstName}
                    {' '}
                    {val.lastName}
                  </Link>
                )}
              />
              <Table.Column
                title="Vehicle"
                dataIndex="vehicle"
                render={(val, i) => (
                  val && (
                    <Link to={`/vehicles/${val.vehicleId}`}>
                      {`${val.vehicleName} (${val.publicId})`}
                    </Link>
                  )
                )}
              />
              <Table.Column
                title="Route"
                render={(val, i) => (
                  (val.pickupZone && val.dropoffZone) ? `${val.pickupZone.name} to ${val.dropoffZone.name}` : '')
                }
              />
              <Table.Column title="Routing Policy" dataIndex="vehicle.matchingRule.title" />
              <Table.Column
                title="Status"
                dataIndex="status"
                render={(val, i) => (
                <>
                  <RideStatusTag status={val} />
                  {
                    [204, 205, 206, 207].includes(val)
                    && (
                    <Tag>
                      { i.cancelledBy }
                    </Tag>
                    )
                  }
                </>
                )}
              />
              <Table.Column title="Created" dataIndex="createdTimestamp" />
              <Table.Column
                title="Details"
                dataIndex="action"
                render={(val, i) => (
                  <React.Fragment>
                    <Link size="small" type="primary" to={`/rides/${i.id}`}>View</Link>
                    &nbsp;
                    &nbsp;
                    <Popover
                      content={(
                        <React.Fragment>
                          <div>
                            <strong>Pickup: </strong>
                            <span>{i.pickupAddress}</span>
                            <span>{i.pickupZone && ` (${i.pickupZone.name})`}</span>
                          </div>
                          <div>
                            <strong>Destination: </strong>
                            <span>{i.dropoffAddress}</span>
                            <span>{i.dropoffZone && ` (${i.dropoffZone.name})`}</span>
                          </div>
                        </React.Fragment>
)}
                      title={i.location.name}
                    >
                      <ButtonLink size="small" type="secondary">Destination</ButtonLink>
                    </Popover>
                  </React.Fragment>
                )}
              />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default RideList;
