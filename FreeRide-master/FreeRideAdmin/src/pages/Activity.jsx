import React, { Fragment, useEffect, useState } from 'react';
import moment from 'moment';
import axios from 'axios';
import Qs from 'qs';
import {
  Col, Form, DatePicker, Button, message, Spin, Tabs
} from 'antd';
import { Formik } from 'formik';
import { Row, FormItem } from '../elements';
import {
  HeatMap, LiveMap, ClearZombiesModal, LiveMetrics
} from '../components';
import { common } from '../utils';
import { allowUpdate } from '../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const { MAP_AREA_FOR_GOOGLE } = common;

const RANGES = {
  'Last Hour': [moment().startOf('hour'), moment().endOf('hour')],
  Today: [moment().startOf('day'), moment().endOf('day')],
  'This Week': [moment().startOf('week'), moment().endOf('week')],
  'This Month': [moment().startOf('month'), moment().endOf('month')],
  'Last Month': [moment().subtract('1', 'month').startOf('month'), moment().subtract('1', 'month').endOf('month')]
};

const INIT = {
  filters: {},

  sort: {
    field: '',
    order: 1
  },

  items: [],
  skip: 0,
  limit: 1000,
  total: 0,
  fetching: false
};

const INIT_SEARCH = {
  ratingForRider: '',
  ratingForDriver: '',
  status: [700, 701],
  isADA: '',
  createdTimestamp: {
    start: RANGES['Last Month'][0].format('YYYY-MM-DD HH:mm'),
    end: RANGES['Last Month'][1].format('YYYY-MM-DD HH:mm')
  }
};

const Activity = (props) => {
  const [fetching, setFetching] = useState(false);
  const [location, setLocation] = useState();
  const [pendingRequests, setPendingRequests] = useState();
  const { location: propsLocation, permissions } = props;

  useEffect(() => {
    const fetch = async () => {
      setFetching(true);
      try {
        const [resLocations, resZombies] = await Promise.all([
          axios.get(`/v1/locations/${propsLocation}`),
          axios.get(`/v1/zombies?location=${propsLocation}`)
        ]);
        setLocation({
          ...resLocations.data,
          serviceArea: resLocations.data.serviceArea.map(MAP_AREA_FOR_GOOGLE),
          routingArea:
            resLocations.data.routingArea && resLocations.data.routingArea.length
              ? resLocations.data.routingArea.map(MAP_AREA_FOR_GOOGLE)
              : [],
          zones: resLocations.data.zones.filter(zone => !zone.isDefault).map(zone => ({
            ...zone,
            serviceArea: zone.serviceArea.map(MAP_AREA_FOR_GOOGLE)
          }))
        });
        setPendingRequests(resZombies.data.length || 0);
      } catch {
        message.error('An error occured');
      } finally {
        setFetching(false);
      }
    };

    if (!fetching) {
      fetch();
    }
  }, [propsLocation]);

  return (
    <Spin spinning={fetching}>
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Live Map" key="1">
          <LiveMetrics {...location} location={propsLocation} />
          <LiveActivity {...location} location={propsLocation} />
          {allowUpdate(AUTH0_RESOURCE_TYPES.RIDES, permissions)
          && <ClearZombiesModal location={propsLocation} pendingRequests={pendingRequests} />
}
        </Tabs.TabPane>

        <Tabs.TabPane tab="Heat Map" key="2">
          <HeatMapPage {...location} location={propsLocation} />
        </Tabs.TabPane>
      </Tabs>
    </Spin>
  );
};

class HeatMapPage extends React.Component {
  state = {
    ...INIT
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps) {
    const { location: propsLocation } = this.props;
    if (propsLocation !== prevProps.location) {
      this.fetch();
    }
  }

  fetch = async () => {
    const {
      fetching, filters, skip, limit
    } = this.state;
    const { location: propsLocation } = this.props;
    if (fetching) {
      return;
    }

    const params = {
      location: propsLocation || undefined,
      ...filters,
      skip,
      limit
    };

    this.setState({ fetching: true });
    try {
      const { data } = await axios({
        url: '/v1/analytics',
        params,
        paramsSerializer: params => Qs.stringify(params, { arrayFormat: 'brackets' })
      });
      this.setState({ ...data });
    } catch (e) {
      const errorMessage = e.response && e.response.data
        ? e.response.data.message
        : null;
      message.error(errorMessage || 'An Error Occurred');
    } finally {
      this.setState({ fetching: false });
    }
  }

  onChange = (pagination, filters, sort_) => {
    const { sort: stateSort } = this.state;
    const sort = sort_ || stateSort;
    const { current, pageSize } = pagination;
    const skip = (current * pageSize) - pageSize;
    this.setState({ skip, filters, sort: { ...sort } }, this.fetch);
  }

  render() {
    const { items, limit } = this.state;
    const { serviceArea, routingArea } = this.props;
    return (
      <Fragment>
        <Row spacing={15} gutter={15}>
          <Col xs={24} sm={16} md={12}>
            <HeatMap
              region={serviceArea}
              routingArea={routingArea}
              pickup={items.map(
                i => new window.google.maps.LatLng(i.pickupLatitude, i.pickupLongitude)
              )}
              dropoff={items.map(
                i => new window.google.maps.LatLng(i.dropoffLatitude, i.dropoffLongitude)
              )}
            />
          </Col>

          <Col xs={24} sm={8} md={12}>
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
                    <Col>
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
                          onChange={(dates, strings) => {
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
      </Fragment>
    );
  }
}

const LiveActivity = ({
  serviceArea, location, routingArea, zones
}) => (
  <LiveMap
    region={serviceArea}
    routingArea={routingArea}
    location={location}
    zones={zones}
  />
);

export default Activity;
