import React, { Component, Fragment } from 'react';

import moment from 'moment';
import Qs from 'qs';
import axios from 'axios';

import { Link } from 'react-router-dom';
import {
  Card, Col, Form, DatePicker, Table, Button, message
} from 'antd';
import { Formik } from 'formik';
import { Row, FormItem } from '../elements';
import { ButtonLink, ReportStatusTag } from '../components';

const Reports = ({ location, rider }) => (
  <Row>
    <Col>
      <Card title="Reports">
        <ReportList location={location} rider={rider} />
      </Card>
    </Col>
  </Row>
);

export default Reports;

const RANGES = {
  'Last Hour': [moment().startOf('hour'), moment().endOf('hour')],
  Today: [moment().startOf('day'), moment().endOf('day')],
  'Last 12 Hours': [moment().subtract('12', 'hour'), moment()],
  'This Week': [moment().startOf('week'), moment().endOf('week')],
  'This Month': [moment().startOf('month'), moment().endOf('month')]
};

const INIT = {
  filters: {},

  sort: {
    sort: 'createdTimestamp',
    order: -1
  },

  items: [],
  skip: 0,
  limit: 20,
  total: 0,
  fetching: false
};

const INIT_SEARCH = {
  createdTimestamp: {
    start: '',
    end: ''
  }
};

class ReportList extends Component {
  state = {
    ...INIT
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.location !== prevProps.location) {
      this.fetch();
    }
  }

  fetch = async () => {
    const {
      fetching, filters, sort, skip, limit
    } = this.state;
    if (fetching) {
      return;
    }

    const { location, rider } = this.props;
    const params = {
      ...filters,
      ...sort,
      location: location || undefined,
      skip,
      limit
    };

    if (rider) {
      params.reportee = rider;
    }

    this.setState({ fetching: true });
    try {
      const { data } = await axios({
        url: '/v1/reports',
        params,
        paramsSerializer: params => Qs.stringify(params, { arrayFormat: 'brackets' })
      });
      this.setState({ ...data });
    } catch (e) {
      message.error('A error occured');
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
      items, skip, limit, total, fetching
    } = this.state;

    return (
      <Fragment>
        <Row spacing={15}>
          <Col>
            <Formik
              initialValues={{ ...INIT_SEARCH }}
              onSubmit={(values, actions) => {
                this.onChange({ current: 1, pageSize: limit }, values);
              }}
              onReset={(values, actions) => {
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
                title="Reported At"
                dataIndex="createdTimestamp"
                render={
                  val => moment(val).format('MM/DD/YYYY HH:mm')
                }
              />
              <Table.Column
                title="Reporter"
                dataIndex="reporter"
                render={
                (val, i) => (
                  <Link to={`/${val.userType === 'Rider' ? 'riders' : 'drivers'}/${val.id}`}>
                    {val.firstName}
                    {' '}
                    {val.lastName}
                    {' '}
(
                    {val.userType}
)
                  </Link>
                )
                }
              />
              <Table.Column
                title="Reportee"
                dataIndex="reportee"
                render={
                (val, i) => (
                  <Link to={`/${val.userType === 'Rider' ? 'riders' : 'drivers'}/${val.id}`}>
                    {val.firstName}
                    {' '}
                    {val.lastName}
                    {' '}
(
                    {val.userType}
)
                  </Link>
                )
                }
              />
              <Table.Column
                title="Status"
                dataIndex="status"
                render={
                  (val, i) => <ReportStatusTag status={val} />
                }
              />
              <Table.Column
                title="Ride"
                dataIndex="ride"
                render={
                  (val, i) => <Link to={`/rides/${val.id}`}>View Ride</Link>
                }
              />
              <Table.Column
                dataIndex="id"
                render={
                (val, i) => <ButtonLink type="primary" size="small" to={`/reports/${val}`}>View Report</ButtonLink>
                }
              />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}
