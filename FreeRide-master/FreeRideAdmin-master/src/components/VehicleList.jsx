import {
  Row, Col, Table, Form, Button, Tag
} from 'antd';
import Axios from 'axios';
import { Field, Formik } from 'formik';
import React, {
  Component, Fragment
} from 'react';
import { withRouter, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  DeleteModal, InputField,
  ButtonLink, SelectField
} from '.';
import { allowDelete } from '../utils/auth';
import withProfileContext from './hocs/withProfileContext';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const INIT_SEARCH = {
  publicId: '',
  name: '',
  isReady: undefined,
  available: undefined,
  vehicleType: undefined,
  matchingRule: undefined,
  zone: undefined
};

const INIT_SORT = {
  name: 1
};

const initialState = {
  fetching: true,
  refetch: false,
  items: [],
  vehicleTypes: [],
  matchingRules: [],
  zones: [],
  total: 0,
  limit: 15,
  page: 1,
  filters: { ...INIT_SEARCH },
  sort: {
    sort: 'name',
    order: 1
  },
  viewVehicleModalIsOpen: false,
  clickedVehicle: null
};

class VehicleList extends Component {
  state = {
    ...initialState
  }

  componentDidMount() {
    this.fetchZones();
    this.fetchMatchingRules();
    this.fetchVehicles();
  }

  componentDidUpdate(prevProps, prevState) {
    const { refetch } = this.state;
    const { activeLocation } = this.props;
    if (prevProps.activeLocation !== activeLocation) {
      this.fetchZones();
      this.fetchVehicles();
    }
    if (!prevState.refetch && refetch) {
      this.fetchVehicles();
    }
  }

  onChange = (pagination, filters, sort) => {
    const {
      sort: { sort: stateSort, order: stateOrder },
      filters: stateFilters,
      page,
      current,
      limit,
      pageSize
    } = { ...this.state, ...pagination };
    this.setState({
      filters: {
        ...stateFilters, ...filters
      },
      sort: {
        sort: sort && sort.sort ? sort.sort : stateSort,
        order: sort && sort.order ? sort.order : stateOrder
      },
      refetch: true,
      page: current || page,
      limit: limit || pageSize
    });
  }

  onReset = () => {
    this.setState({ ...initialState, refetch: true });
  }

  fetchVehicles = async () => {
    this.setState({ fetching: true });
    const {
      filters, limit, page, sort
    } = this.state;

    const { activeLocation: location } = this.props;
    try {
      const data = await Axios({
        url: '/v1/vehicles',
        params: {
          ...filters,
          ...sort,
          location,
          limit,
          page
        }
      }).then(res => res.data);
      this.setState({
        items: data.items,
        vehicleTypes: data.vehicleTypes,
        fetching: false,
        total: data.total,
        refetch: false
      });
    } catch (error) {
      this.setState({ fetching: false, refetch: false });
    }
  }

  fetchMatchingRules = async () => {
    const response = await Axios({
      method: 'GET',
      url: '/v1/matching-rules'
    }).then(res => res.data);

    const transformedMatchingRules = response.map(item => ({
      name: item.title,
      value: item.key
    }));

    this.setState({ matchingRules: transformedMatchingRules });
  };

  fetchZones = async () => {
    const params = {
      limit: 100
    };
    const { activeLocation } = this.props;

    const response = await Axios({
      url: `/v1/locations/${activeLocation}/zones`,
      params
    }).then(res => res.data);
    const transformedZones = response.map(item => ({
      name: item.name,
      value: item.id
    }));
    this.setState({ zones: transformedZones });
  }

  formatDriverZones = (driverZones) => {
    const { zones } = this.state;
    const zoneComponents = driverZones.map(driverZone => (
      (zones.find(zone => zone.value === driverZone) || { name: '' }).name
    ));
    return zoneComponents.filter(zoneName => zoneName !== '').join(', ');
  }

  render() {
    const {
      items, vehicleTypes, matchingRules, zones,
      fetching, limit, total, filters, sort, page
    } = this.state;
    const { history, profileContext: { permissions } } = this.props;
    return (
      <Fragment>
        <Row>
          <Col>
            <Formik
              initialValues={{ ...INIT_SEARCH }}
              onSubmit={(values) => {
                this.onChange({ current: 1, limit }, values, {});
              }}
              onReset={() => {
                this.onChange({ current: 1, limit }, { ...INIT_SEARCH }, {});
              }}
            >
              {formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Row gutter={15} spacing={15}>
                    <Col xs={24} sm={12} md={4}>
                      <Field label="Name" placeholder="Filter by Name" name="name" component={InputField} />
                    </Col>

                    <Col xs={24} sm={12} md={4}>
                      <Field label="Public ID" placeholder="Filter by Public ID" name="publicId" component={InputField} />
                    </Col>

                    <Col xs={24} sm={12} md={4}>
                      <Field
                        label="Vehicle type"
                        placeholder="Filter by vehicle type"
                        name="vehicleType"
                        options={[
                          { name: 'Any type', value: '' },
                          ...vehicleTypes
                        ]}
                        component={SelectField}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                      <Field
                        label="Routing policy"
                        placeholder="Filter by routing policy"
                        name="matchingRule"
                        options={[
                          { value: '', name: 'Any policy' },
                          ...matchingRules,
                          { value: 'unset', name: 'Unset' }
                        ]}
                        component={SelectField}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                      <Field
                        label="Zones"
                        placeholder="Filter by zone"
                        name="zone"
                        options={[
                          { value: '', name: 'Any zone' },
                          ...zones
                        ]}
                        component={SelectField}
                      />
                    </Col>
                  </Row>
                  <Row gutter={15} spacing={15}>

                    <Col xs={24} sm={12} md={4}>
                      <Field
                        label="Availability"
                        name="available"
                        placeholder="Filter by availability"
                        options={[
                          { name: 'Any availability', value: '' },
                          { name: 'Available', value: 'true' },
                          { name: 'Unvailable', value: 'false' }
                        ]}
                        component={SelectField}
                      />
                    </Col>

                    <Col xs={24} sm={12} md={4}>
                      <Field
                        label="Ready"
                        name="isReady"
                        placeholder="Filter by readiness"
                        options={[
                          { name: 'Any readiness', value: '' },
                          { name: 'Ready', value: 'true' },
                          { name: 'UnReady', value: 'false' }
                        ]}
                        component={SelectField}
                      />
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
            </Formik>
          </Col>
        </Row>
        <br />
        <br />
        <Formik
          initialValues={{ ...INIT_SORT }}
        >
          {formProps => (
            <Form>
              <Row gutter={15} spacing={15}>
                <Col xs={24} sm={12} md={6}>
                  <Button
                    size="small"
                    type={formProps.values.name ? 'primary' : ''}
                    htmlType="submit"
                    onClick={() => {
                      const newValue = formProps.values.name ? -formProps.values.name : 1;
                      formProps.resetForm({
                        values: {
                          name: newValue
                        }
                      });
                      this.onChange({}, {}, { sort: 'name', order: newValue });
                    }}
                  >
                    {
                      (() => {
                        if (formProps.values.name === 1) return '↓';
                        if (formProps.values.name === -1) return '↑';
                        return '';
                      })()
                    }
                    Name
                  </Button>
                  &nbsp;
                  <Button
                    size="small"
                    type={formProps.values.publicId ? 'primary' : ''}
                    htmlType="submit"
                    onClick={() => {
                      const newValue = formProps.values.publicId ? -formProps.values.publicId : 1;
                      formProps.resetForm({
                        values: {
                          publicId: newValue
                        }
                      });
                      this.onChange({}, {}, { sort: 'publicId', order: newValue });
                    }}
                  >
                    {
                      (() => {
                        if (formProps.values.publicId === 1) return '↓';
                        if (formProps.values.publicId === -1) return '↑';
                        return '';
                      })()
                    }
                    Public ID
                  </Button>
                </Col>
              </Row>
            </Form>
          )}
        </Formik>
        <br />
        <Row>
          <Col>
            <Table
              dataSource={items}
              rowKey={i => i.id}
              size="small"
              loading={fetching}
              pagination={{
                pageSize: limit, size: 'small', total, current: page
              }}
              onChange={pagination => this.onChange(pagination, filters, sort)}
            >
              <Table.Column title="Name" dataIndex="name" />
              <Table.Column title="Type" dataIndex="type" />
              <Table.Column title="Public ID" dataIndex="publicId" />
              <Table.Column title="Passenger Capacity" dataIndex="passengerCapacity" />
              <Table.Column title="ADA Capacity" dataIndex="adaCapacity" />
              <Table.Column
                title="Driver"
                dataIndex="driver"
                render={
                  val => (val ? (
                    <Link to={`/drivers/${val.id}`}>
                      {val.firstName}
                      {' '}
                      {val.lastName}
                    </Link>) : '')
                }
              />
              <Table.Column
                title="Routing policy"
                dataIndex="matchingRule"
                render={val => (![undefined, null, ''].includes(val) ? val : <Tag color="orange">Unset</Tag>)}
              />
              <Table.Column
                title="Zones"
                dataIndex="zones"
                render={val => this.formatDriverZones(val)}
              />
              <Table.Column
                title="Ready"
                dataIndex="isReady"
                render={(text, i) => (
                  <Tag color={i.isReady ? 'green' : 'red'}>
                    {i.isReady ? 'Yes' : 'No'}
                  </Tag>
                )}
              />
              <Table.Column
                title="Custom Capacity"
                dataIndex="isCustomized"
                render={(text, i) => (
                  <Tag color={i.isCustomized ? 'green' : 'red'}>
                    {i.isCustomized ? 'Yes' : 'No'}
                  </Tag>
                )}
              />
              <Table.Column title="" dataIndex="action" render={(text, i) => <ButtonLink size="small" type="primary" to={`/vehicles/${i.id}`}>View</ButtonLink>} />
              {
                allowDelete(AUTH0_RESOURCE_TYPES.FLEET, permissions)
                && (
                <Table.Column
                  title=""
                  dataIndex="deleteAction"
                  render={(text, i) => <DeleteModal url={`/v1/vehicles/${i.id}`} onSuccess={() => history.go(0)} resourceType={AUTH0_RESOURCE_TYPES.FLEET} />
                  }
                />
                )
              }
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

VehicleList.propTypes = {
  activeLocation: PropTypes.string.isRequired,
  history: PropTypes.shape().isRequired
};

export default withProfileContext(withRouter(VehicleList));
