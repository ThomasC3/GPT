import React, { Component, Fragment } from 'react';
import { Link } from 'react-router-dom';
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

class VehicleStats extends Component {
  state = {
    ...INIT_SEARCH,

    fetchingVehicleStats: false
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      fetchingVehicleStats: currentlyFetching
    } = this.state;
    const {
      fetchingVehicleStats: previouslyFetching
    } = prevState;
    if (currentlyFetching && !previouslyFetching) {
      this.fetchVehicleStats();
    }
  }

  onReset = () => {
    this.setState({ ...INIT_SEARCH });
  }

  fetchVehicleStats = async () => {
    this.setState({ fetchingVehicleStats: true });
    try {
      const { filters } = this.state;
      const hourParams = {
        ...filters,
        targetType: 'Vehicle'
      };
      const { data: { vehicleStats } } = await axios({
        url: '/v1/stats/vehicles',
        params: hourParams,
        paramsSerializer: ps => Qs.stringify(ps, { arrayFormat: 'brackets' })
      });
      this.setState({ fetchingVehicleStats: false, vehicleStats });
    } catch (e) {
      message.error(e.message);
    }
  }

  onChange = (filters) => {
    this.setState({
      filters,
      fetchingVehicleStats: true
    });
  }

  render() {
    const {
      fetchingVehicleStats,
      vehicleStats
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
                        fetchingVehicleStats
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
        <Card title="Vehicle Stats">
          {!fetchingVehicleStats
            && (
            <Row gutter={15}>
              <Col>
                <Table
                  dataSource={vehicleStats}
                  rowKey={i => i.cityId}
                  size="small"
                  loading={fetchingVehicleStats}
                  expandedRowRender={record => (
                    <Table
                      dataSource={record.individual}
                      rowKey={i => i.id}
                      size="small"
                      loading={fetchingVehicleStats}
                    >
                      <Table.Column title="Name" render={val => (val.id ? <Link to={`/vehicles/${val.id}`}>{val.name}</Link> : '')} />
                      <Table.Column title="Checkout Hours" render={val => `${val.checkOutHours}h`} />
                      <Table.Column title="Milage" render={val => `${val.mileage.totalMileage} mi`} />
                      <Table.Column title="Battery" render={val => `${val.battery.totalBattery}%`} />
                    </Table>
                  )}
                >
                  <Table.Column title="City" render={val => val.city} />
                  <Table.Column title="Checkout Hours (Vehicle #)" render={val => `${val.checkOutHours.totalHours}h (${val.checkOutHours.individualCount})`} />
                  <Table.Column title="Milage" render={val => `${val.mileage.totalMileage} mi`} />
                  <Table.Column title="Battery" render={val => `${val.battery.totalBattery}%`} />
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

export default VehicleStats;
