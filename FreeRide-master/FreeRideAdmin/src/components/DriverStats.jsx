import React, { Component, Fragment } from 'react';
import { Link } from  'react-router-dom';
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
  createdTimestamp: {
    start: RANGES['Last Month'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES['Last Month'][1].format('YYYY-MM-DD HH:mm')
  }
};

class DriverStats extends Component {
  state = {
    ...INIT_SEARCH,

    fetchingDriverHours: false
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      fetchingDriverHours: currentlyFetching
    } = this.state;
    const {
      fetchingDriverHours: previouslyFetching
    } = prevState;
    if (currentlyFetching && !previouslyFetching) {
      this.fetchDriverHours();
    }
  }

  onReset = () => {
    this.setState({ ...INIT_SEARCH });
  }

  fetchDriverHours = async () => {
    this.setState({ fetchingDriverHours: true });
    try {
      const { filters } = this.state;
      const hourParams = {
        ...filters,
        targetType: 'Driver'
      };
      const { data: { driverHours } } = await axios({
        url: '/v1/stats/driver-hours',
        params: hourParams,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingDriverHours: false, driverHours });
    } catch (e) {
      message.error(e.message);
    }
  }

  onChange = (filters) => {
    this.setState({
      filters,
      fetchingDriverHours: true
    });
  }

  render() {
    const {
      fetchingDriverHours,
      driverHours
    } = this.state;

    return (
      <Fragment>
        <Card title="Filters">
          <Row spacing={15}>
            <Col>
              <Formik
                initialValues={{ ...INIT_SEARCH }}
                onSubmit={values => this.onChange(values)}
                onReset={() => this.onChange({ ...INIT_SEARCH })}
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
                    <Row gutter={15}>
                      {(
                        fetchingDriverHours
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
        <Card title="Driver Hours">
          {!fetchingDriverHours
            && (
            <Row gutter={15}>
              <Col>
                <Table
                  dataSource={driverHours}
                  rowKey={i => i.cityId}
                  size="small"
                  loading={fetchingDriverHours}
                  expandedRowRender={record => (
                    <Table
                      dataSource={record.individualHours}
                      rowKey={i => i.id}
                      size="small"
                      loading={fetchingDriverHours}
                    >
                      <Table.Column title="Name" render={val => (val.id ? <Link to={`/drivers/${val.id}`}>{val.name}</Link> : '')} />
                      <Table.Column title="Login Hours" render={val => `${val.loginHours}h`} />
                      <Table.Column title="Available Hours" render={val => `${val.availableHours}h`} />
                    </Table>
                  )}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Login Hours (Driver #)" render={val => `${val.loginHours.totalHours}h (${val.loginHours.individualCount})`} />
                  <Table.Column title="Available Hours (Driver #)" render={val => `${val.availableHours.totalHours}h (${val.availableHours.individualCount})`} />
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

export default DriverStats;
