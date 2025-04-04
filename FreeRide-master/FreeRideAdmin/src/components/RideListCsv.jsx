import React, { Component, Fragment } from 'react';
import moment from 'moment';
import Qs from 'qs';
import {
  Col, Form, DatePicker, Button, message
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import fileDownload from 'js-file-download';

import { Row, FormItem } from '../elements';
import { MultiSelectField } from '.';
import { RANGES_EXTENDED } from '../utils/constants';

const INIT = _props => ({
  filters: {
    createdTimestamp: {
      start: RANGES_EXTENDED['Last Month'][0].format('YYYY-MM-DD HH:mm'),
      end: RANGES_EXTENDED['Last Month'][1].format('YYYY-MM-DD HH:mm')
    }
  },
  sort: { field: '', order: 1 },
  items: [],
  skip: 0,
  limit: null,
  total: 0,
  fetching: false
});

const INIT_SEARCH = {
  ratingForRider: '',
  ratingForDriver: '',
  status: [],
  isADA: '',
  createdTimestamp: {
    start: RANGES_EXTENDED['Last Month'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES_EXTENDED['Last Month'][1].format('YYYY-MM-DD HH:mm')
  }
};

class RideListCsv extends Component {
  state = INIT(this.props);

  fetch = async () => {
    const {
      fetching, filters, skip, limit
    } = this.state;
    if (fetching) {
      return;
    }

    const { location } = this.props;
    const params = {
      location, ...filters, skip, limit
    };

    this.setState({ fetching: true });
    try {
      const { data } = await axios({
        url: '/v1/csvrides',
        params,
        paramsSerializer: params => Qs.stringify(params, { arrayFormat: 'brackets' })
      });
      fileDownload(data, `Ride_data_export_${new Date().toISOString()}.csv`);
    } catch (e) {
      const errorMessage = e.response && e.response.data
        ? e.response.data.message
        : null;
      if (e.response.status === 404) {
        message.success('No rides found!');
      } else {
        message.error(errorMessage || 'An Error Occurred');
      }
    } finally {
      this.setState({ fetching: false });
    }
  }

  onReset = () => {
    this.setState({ ...INIT(this.props) });
  }

  onSubmit = (filters) => {
    this.setState({ filters }, this.fetch);
  }

  render() {
    return (
      <Fragment>
        <Row spacing={15}>
          <Col>
            <Formik
              initialValues={{ ...INIT_SEARCH }}
              onSubmit={this.onSubmit}
              onReset={this.onReset}
              render={formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Row gutter={15} spacing={15}>
                    <Col xs={24} sm={12} md={6}>
                      <Field
                        placeholder="Filter by status"
                        name="status"
                        options={[
                          { value: 101, name: '(101) Request Cancelled' },
                          { value: 200, name: '(200) Rider in Queue' },
                          { value: 201, name: '(201) Next in Queue' },
                          { value: 202, name: '(202) Driver en Route' },
                          { value: 203, name: '(203) Driver Arrived' },
                          { value: 204, name: '(204) Cancelled in Queue' },
                          { value: 205, name: '(205) Cancelled en Route' },
                          { value: 206, name: '(206) Cancelled No Show' },
                          { value: 207, name: '(207) Cancelled Not Able' },
                          { value: 300, name: '(300) Ride in Progress' },
                          { value: 700, name: '(700) Ride Complete' }
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
                          ranges={RANGES_EXTENDED}
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
                      <Button type="primary" size="small" htmlType="submit">Download CSV</Button>
                    </Col>
                  </Row>

                </Form>
              )}
            />
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default RideListCsv;
