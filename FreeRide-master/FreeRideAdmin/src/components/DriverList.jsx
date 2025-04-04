import React, { Component, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Row, Col, Button, Form, Table, message, Select, Tag
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { ButtonLink, InputField } from '.';

const INIT = () => ({
  filters: {
    firstName: '',
    lastName: '',
    email: '',
    isOnline: '',
    isAvailable: ''
  },

  sort: {
    sort: 'firstName',
    order: 1
  },

  items: [],
  skip: 0,
  limit: 15,
  total: 0,
  fetching: true
});

const INIT_SEARCH = {
  isOnline: '',
  isAvailable: '',
  firstName: '',
  lastName: '',
  email: ''
};

const INIT_SORT = {
  firstName: 1
};

class DriverList extends Component {
  state = {
    ...INIT(this.props)
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps, prevState) {
    const { location: propsLocation } = this.props;
    const { fetching: currFetching } = this.state;
    let toFetch = false;
    if (prevProps.location !== propsLocation) {
      toFetch = true;
    }
    if (currFetching && !prevState.fetching) {
      toFetch = true;
    }
    if (toFetch) { this.fetch(); }
  }

  fetch = async () => {
    this.setState({ fetching: true });
    const { location } = this.props;
    const {
      filters, sort, skip, limit
    } = this.state;
    const params = {
      ...filters,
      ...sort,
      locations: location ? [location] : undefined,
      skip,
      limit
    };

    try {
      const data = await axios({
        url: '/v1/drivers',
        params
      }).then(res => res.data);
      this.setState({ fetching: false, ...data });
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message : null;
      message.error(errorMessage || 'Error fetching drivers');
      this.setState({ fetching: false });
    }
  }

  onChange = (pagination, filters, sort) => {
    const {
      skip: stateSkip,
      filters: stateFilters,
      sort: stateSort
    } = this.state;
    const { current, pageSize } = pagination;
    const skip = (current * pageSize) - pageSize;

    this.setState({
      skip: Number.isInteger(skip) ? skip : stateSkip || 0,
      filters: {
        ...stateFilters, ...filters
      },
      sort: {
        sort: sort && sort.sort ? sort.sort : stateSort.sort,
        order: sort && sort.order ? sort.order : stateSort.order
      },
      fetching: true
    });
  }

  fixRoute = async (id) => {
    try {
      await axios({
        url: `/v1/drivers/${id}/fixroute`
      }).then(res => res.data);

      message.success('Route fixed!');
    } catch (e) {
      message.error('A error occured');
    }
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
              onSubmit={(values) => {
                this.onChange({ current: 1, pageSize: limit }, values);
              }}
              onReset={() => {
                this.onChange({ current: 1, pageSize: limit }, { ...INIT_SEARCH });
              }}
              render={formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Row gutter={15} spacing={15}>
                    <Col xs={24} sm={12} md={6}>
                      <Field placeholder="Filter by First Name" name="firstName" component={InputField} />
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Field placeholder="Filter by Last Name" name="lastName" component={InputField} />
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Field placeholder="Filter by email" name="email" component={InputField} />
                    </Col>
                  </Row>
                  <Row gutter={15} spacing={15}>
                    <Col xs={24} sm={12} md={6}>
                      <Select
                        size="small"
                        name="isOnline"
                        onChange={value => formProps.setFieldValue('isOnline', value)}
                        value={formProps.values.isOnline}
                      >
                        <Select.Option value="">Logged In/Logged Out</Select.Option>
                        <Select.Option value="true">Logged In</Select.Option>
                        <Select.Option value="false">Logged Out</Select.Option>
                      </Select>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Select
                        size="small"
                        name="isAvailable"
                        onChange={value => formProps.setFieldValue('isAvailable', value)}
                        value={formProps.values.isAvailable}
                      >
                        <Select.Option value="">Available/Unavailable</Select.Option>
                        <Select.Option value="true">Available</Select.Option>
                        <Select.Option value="false">Unavailable</Select.Option>
                      </Select>
                    </Col>
                  </Row>

                  <br />

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
        <br />
        <br />
        <Row spacing={15}>
          <Formik
            initialValues={{ ...INIT_SORT }}
            render={formProps => (
              <Form>
                <Row gutter={15} spacing={15}>
                  <Col xs={24} sm={12} md={6}>
                    <Button
                      size="small"
                      type={formProps.values.firstName ? 'primary' : ''}
                      htmlType="submit"
                      onClick={() => {
                        const newValue = formProps.values.firstName
                          ? -formProps.values.firstName : 1;
                        formProps.resetForm({
                          values: {
                            firstName: newValue
                          }
                        });
                        this.onChange({}, {}, { sort: 'firstName', order: newValue });
                      }}
                    >
                      {
                        // eslint-disable-next-line no-nested-ternary
                        `${!formProps.values.firstName ? '' : formProps.values.firstName === 1 ? '↓' : '↑'} First name`
                      }
                    </Button>
                    &nbsp;
                    <Button
                      size="small"
                      type={formProps.values.loggedOutTimestamp ? 'primary' : ''}
                      htmlType="submit"
                      onClick={() => {
                        const newValue = formProps.values.loggedOutTimestamp
                          ? -formProps.values.loggedOutTimestamp : 1;
                        formProps.resetForm({
                          values: {
                            loggedOutTimestamp: newValue
                          }
                        });
                        this.onChange({}, {}, { sort: 'loggedOutTimestamp', order: newValue });
                      }}
                    >
                      {
                        // eslint-disable-next-line no-nested-ternary
                        `${!formProps.values.loggedOutTimestamp ? '' : formProps.values.loggedOutTimestamp === 1 ? '↓' : '↑'} Logout time`
                      }
                    </Button>
                  </Col>
                </Row>
              </Form>
            )}
          />
        </Row>
        <br />
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
                title="Logged In"
                dataIndex="isOnline"
                render={(text, i) => (
                  <Tag color={i.isOnline ? 'green' : 'red'}>
                    {i.isOnline ? 'Yes' : 'No'}
                  </Tag>
                )}
              />
              <Table.Column
                title="Available"
                dataIndex="isAvailable"
                render={(text, i) => (
                  <Tag color={i.isAvailable ? 'green' : 'red'}>
                    {i.isAvailable ? 'Yes' : 'No'}
                  </Tag>
                )}
              />
              <Table.Column title="Name (Display name)" render={val => `${val.firstName} ${val.lastName} (${val.displayName})`} />
              <Table.Column title="Employee ID" dataIndex="employeeId" />
              <Table.Column title="Email" dataIndex="email" />
              <Table.Column title="Logout" dataIndex="loggedOutTimestamp" />
              <Table.Column title="Status" dataIndex="status" />
              <Table.Column title="Vehicle" dataIndex="vehicle" render={val => (val ? <Link to={`/vehicles/${val.vehicleId}`}>{val.publicId}</Link> : '')} />
              <Table.Column title="Driver Details" dataIndex="action" render={(_text, i) => <ButtonLink size="small" type="primary" to={`/drivers/${i.id}`}>View</ButtonLink>} />
              <Table.Column
                title=""
                dataIndex="action"
                render={
                (_text, i) => {
                  if (i.activeRidesCount * 2 < i.waitingStopsCount) {
                    return <Button size="small" type="primary" onClick={() => this.fixRoute(i.id)}>Fix route</Button>;
                  }
                  return '';
                }
              }
              />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default DriverList;
