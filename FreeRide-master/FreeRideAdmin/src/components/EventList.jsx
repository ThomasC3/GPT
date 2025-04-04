import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Qs from 'qs';
import { Link } from 'react-router-dom';
import {
  Col, Form, DatePicker, Table, Button, message
} from 'antd';
import { Formik } from 'formik';
import axios from 'axios';
import { Row, FormItem } from '../elements';
import { formatEventData } from '../utils/format';

const RANGES = {
  'Last Hour': [moment().startOf('hour'), moment().endOf('hour')],
  Today: [moment().startOf('day'), moment().endOf('day')],
  'Last 12 Hours': [moment().subtract('12', 'hour'), moment()],
  'Last 2 days': [moment().subtract('1', 'day').startOf('day'), moment().endOf('day')],
  'This Week': [moment().startOf('week'), moment().endOf('week')],
  'This Month': [moment().startOf('month'), moment().endOf('month')]
};

const INIT = ({ limit }) => ({
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
  limit: limit || 15,
  fetching: false
});

const INIT_SEARCH = {
  createdTimestamp: {
    start: RANGES['Last 2 days'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES['Last 2 days'][1].format('YYYY-MM-DD HH:mm')
  }
};

class EventList extends Component {
  state = {
    ...INIT(this.props)
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps) {
    const {
      rider, driver, vehicle, job
    } = this.props;
    if (
      rider !== prevProps.rider || driver !== prevProps.driver
      || vehicle !== prevProps.vehicle || job !== prevProps.job
    ) {
      this.fetch();
    }
  }

  fetch = async () => {
    const {
      fetching, filters, skip, limit
    } = this.state;
    const {
      driver, rider, vehicle, location, job, hours
    } = this.props;
    if (fetching) {
      return;
    }

    const targetId = driver || rider || vehicle || job;
    let targetType = 'Driver';
    if (rider) {
      targetType = 'Rider';
    } else if (vehicle) {
      targetType = 'Vehicle';
    } else if (job) {
      targetType = 'Job';
    }

    const params = {
      ...filters,
      targetId,
      targetType,
      or: true,
      location,
      skip,
      limit
    };

    const hourParams = {
      ...filters,
      targetId,
      targetType,
      location
    };

    const vehicleParams = {
      ...filters,
      location
    };

    try {
      const { data } = await axios({
        url: '/v1/events',
        params,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      if (hours && hours.includes('VEHICLE') && location) {
        const { data: { vehicleStats } } = await axios({
          url: `/v1/vehicles/${vehicle}/stats`,
          params: vehicleParams,
          paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
        });
        this.setState({ vehicleStats });
      }
      if (hours && hours.includes('LOGIN') && location) {
        const { data: { locationHours: loginHours } } = await axios({
          url: '/v1/events/login-hours',
          params: hourParams,
          paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
        });
        this.setState({ loginHours: loginHours.totalHours });
      }
      if (hours && hours.includes('AVAILABLE') && location) {
        const { data: { locationHours: availableHours } } = await axios({
          url: '/v1/events/available-hours',
          params: hourParams,
          paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
        });
        this.setState({ availableHours: availableHours.totalHours });
      }
      if (!location && hours && (hours.includes('LOGIN') || hours.includes('AVAILABLE'))) {
        message.info('To calculate hours select location and filter events again');
      }
      if (!location && hours && hours.includes('VEHICLE')) {
        message.info('To calculate metrics select location and filter events again');
      }
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

  onChange = (pagination, filters, sort) => {
    const { filters: stateFilters, sort: stateSort } = this.state;
    const { current, pageSize } = pagination;
    const skip = (current * pageSize) - pageSize;

    this.setState({
      skip,
      filters: { ...stateFilters, ...filters },
      sort: { ...stateSort, ...sort }
    }, this.fetch);
  }

  render() {
    const {
      items, skip, limit, total, fetching, loginHours, availableHours, vehicleStats
    } = this.state;
    const {
      hours
    } = this.props;

    return (
      <Fragment>
        <Row spacing={15}>
          <Col>
            <Formik
              initialValues={{ ...INIT_SEARCH }}
              onSubmit={(values) => {
                this.onChange({ current: 1, pageSize: limit }, values);
              }}
              onReset={() => {
                this.onChange({ current: 1, pageSize: limit }, { ...INIT_SEARCH }, {});
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
                          placeholder={['Event From', 'Event To']}
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
                  &nbsp;
                </Form>
              )}
            />
          </Col>
        </Row>
        <Row>
          {
            (hours && hours.includes('VEHICLE')) && vehicleStats && (
              <div>
                <Row gutter={15} key="1">
                  <Col xs={24} sm={12} md={6}>
                    <b>Checkout Hours: </b>
                    {vehicleStats.checkOutHours.totalHours.toFixed(2)}
                    h
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <b>Total Battery: </b>
                    {vehicleStats.battery.totalBattery.toFixed(2)}
                    %
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <b>Total Milage: </b>
                    {vehicleStats.mileage.totalMileage.toFixed(2)}
                    {' mi'}
                  </Col>
                </Row>
                <Row gutter={15} key="2">
                  <Col xs={24} sm={12} md={6}>
                    <b>Miles / 50% Battery: </b>
                    {((vehicleStats.batteryMileage.totalMileage
                      / vehicleStats.batteryMileage.totalBattery * 50) || 0).toFixed(2)}
                    {' mi/50%'}
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <b>Hour / 50% Battery: </b>
                    {((vehicleStats.battery.totalHours
                      / vehicleStats.battery.totalBattery * 50) || 0).toFixed(2) }
                    {' h/50%'}
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <b>Miles / Hour: </b>
                    {((vehicleStats.mileage.totalMileage
                      / vehicleStats.mileage.totalHours) || 0).toFixed(2)}
                    {' mi/h'}
                  </Col>
                </Row>
              </div>
            )
          }
        </Row>
        <Row>
          {
            (hours && hours.includes('LOGIN')) && (
              <div>
                <b>Login Hours: </b>
                {loginHours}
              </div>
            )
          }
        </Row>
        <Row>
          {
            (hours && hours.includes('AVAILABLE')) && (
              <div>
                <b>Available Hours: </b>
                {availableHours}
              </div>
            )
          }
        </Row>
        {
          hours && (
            <div> &nbsp; </div>
          )
        }
        <Row>
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
            <Table.Column title="Created" dataIndex="createdTimestamp" render={val => moment(val).format('MM/DD/YYYY hh:mm:ss A')} />
            <Table.Column title="Source" dataIndex="source" render={val => <Link to={`/${val.type.toLowerCase()}s/${val.id}`}>{val.name}</Link>} />
            <Table.Column title="Event" dataIndex="eventType" />
            <Table.Column title="Target" dataIndex="target" render={val => (val.id ? <Link to={`/${val.type.toLowerCase()}s/${val.id}`}>{val.name}</Link> : '')} />
            <Table.Column title="More Details" render={val => formatEventData(val)} />
          </Table>
        </Row>
      </Fragment>
    );
  }
}

EventList.propTypes = {
  rider: PropTypes.string,
  driver: PropTypes.string,
  vehicle: PropTypes.string,
  job: PropTypes.string,
  hours: PropTypes.arrayOf(PropTypes.string)
};
EventList.defaultProps = {
  rider: null,
  driver: null,
  vehicle: null,
  job: null,
  hours: []
};

export default EventList;
