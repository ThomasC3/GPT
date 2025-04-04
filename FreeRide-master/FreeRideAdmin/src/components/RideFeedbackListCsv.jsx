import React, { Component, Fragment } from 'react';
import moment from 'moment';
import Qs from 'qs';
import {
  Col, Form, DatePicker, Button, message
} from 'antd';
import { Formik } from 'formik';
import axios from 'axios';
import fileDownload from 'js-file-download';

import { Row, FormItem } from '../elements';
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

class RideFeedbackListCsv extends Component {
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
        url: '/v1/csvfeedback',
        params,
        paramsSerializer: params => Qs.stringify(params, { arrayFormat: 'brackets' })
      });
      fileDownload(data, `Feedback_data_export_${new Date().toISOString()}.csv`);
    } catch (e) {
      const errorMessage = e.response && e.response.data
        ? e.response.data.message
        : null;
      if (e.response.status === 404) {
        message.success('No rides with feedback found!');
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

export default RideFeedbackListCsv;
