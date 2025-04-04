import axios from 'axios';
import fileDownload from 'js-file-download';
import React, { Component, Fragment } from 'react';
import moment from 'moment';
import Qs from 'qs';
import {
  Col, Form, DatePicker, Button, message, Card
} from 'antd';
import { Formik, Field } from 'formik';
import { Row, FormItem } from '../elements';
import { SelectField } from '.';

const RANGES = {
  'Last Month': [moment().subtract('1', 'month').startOf('month'), moment().subtract('1', 'month').endOf('month')],
  'Last Week': [moment().subtract('1', 'week').startOf('week'), moment().subtract('1', 'week').endOf('week')],
  'This Month': [moment().startOf('month'), moment().endOf('month')],
  'This Week': [moment().startOf('week'), moment().endOf('week')],
  Today: [moment().startOf('day'), moment().endOf('day')]
};

const INIT = props => ({
  filters: {
    createdTimestamp: {
      start: '',
      end: ''
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
  driverStats: [],
  fetching: false
});

const INIT_SEARCH = {
  status: '',
  createdTimestamp: {
    start: RANGES['Last Month'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES['Last Month'][1].format('YYYY-MM-DD HH:mm')
  }
};

class TipListCsv extends Component {
  state = INIT(this.props);

  fetch = async () => {
    const {
      fetching, filters, skip, limit
    } = this.state;
    if (fetching) {
      return;
    }

    const params = {
      locationId: this.props.location ? this.props.location : undefined,
      riderId: this.props.rider ? this.props.rider : undefined,
      driverId: this.props.driver ? this.props.driver : undefined,
      ...filters,
      skip,
      limit
    };

    this.setState({ fetching: true });
    try {
      const { data } = await axios({
        url: '/v1/csvtips',
        params,
        paramsSerializer: params => Qs.stringify(params, { arrayFormat: 'brackets' })
      });
      fileDownload(data, `Tip_data_export_${new Date().toISOString()}.csv`);
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
                  <Card title="Filters">
                    <Row gutter={15} spacing={15}>

                      <Col xs={24} sm={12} md={6}>
                        <Field
                          placeholder="Filter by status"
                          name="status"
                          options={[
                            { value: '', name: 'All' },
                            { value: 'succeeded', name: 'succeeded' },
                            { value: 'canceled', name: 'canceled' },
                            { value: 'requires_confirmation', name: 'requires_confirmation' }
                          ]}
                          component={SelectField}
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
                  </Card>
                </Form>
              )}
            />
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default TipListCsv;
