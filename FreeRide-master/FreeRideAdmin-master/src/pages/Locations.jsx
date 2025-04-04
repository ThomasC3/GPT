import React, { Component, Fragment } from 'react';

import {
  Card, Col, Input, Button, Form, message, Tag, Table
} from 'antd';
import { Formik } from 'formik';
import axios from 'axios';
import { Row } from '../elements';
import { ButtonLink } from '../components';

const Locations = () => (
  <Card
    title="Locations"
    extra={<ButtonLink size="small" type="primary" to="/location/">New Location</ButtonLink>}
  >
    <LocationList />
  </Card>
);

const INIT = {
  filters: {
    name: ''
  },
  sort: {
    sort: 'name',
    order: 1
  },
  items: [],
  skip: 0,
  limit: 15,
  total: 0,
  fetching: true
};

class LocationList extends Component {
  state = {
    ...INIT
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps, prevState) {
    const { fetching } = this.state;
    if (fetching && !prevState.fetching) {
      this.fetch();
    }
  }

  fetch = async () => {
    this.setState({ fetching: true });
    const {
      filters, sort, skip, limit
    } = this.state;
    try {
      const data = await axios({
        url: '/v1/locations',
        params: {
          ...filters,
          ...sort,
          skip,
          limit
        }
      }).then(res => res.data);
      this.setState({ fetching: false, ...data });
    } catch (e) {
      message.error('A error occured');
      this.setState({ fetching: false });
    }
  }

  onChange = (pagination, filters, _sort) => {
    const { current, pageSize } = pagination;
    const skip = (current * pageSize) - pageSize;
    const { filters: currentFilters, sort: currentSort } = this.state;
    const sort = _sort || currentSort;
    this.setState({
      skip,
      filters: { ...currentFilters, ...filters },
      sort: { field: sort.field, order: sort.order },
      fetching: true
    });
  }

  onReset = () => {
    this.setState({ ...INIT });
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
              initialValues={{ name: '' }}
              onSubmit={(values) => {
                this.onChange({ current: 1, pageSize: limit }, values);
              }}
              onReset={() => {
                this.onChange({ current: 1, pageSize: limit }, { name: '' }, {});
              }}
              render={formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Row gutter={15} spacing={15}>
                    <Col sm={6}>
                      <Input size="small" placeholder="Filter by name" name="name" value={formProps.values.name} onChange={formProps.handleChange} />
                    </Col>

                    <Col sm={12}>
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
              <Table.Column title="Name" dataIndex="name" />
              <Table.Column title="State" dataIndex="stateCode" />
              <Table.Column title="Code" dataIndex="locationCode" />
              <Table.Column title="Active" dataIndex="isActive" render={(text, i) => <Tag color={i.isActive ? 'green' : 'Red'}>{i.isActive ? 'Active' : 'Inactive'}</Tag>} />
              <Table.Column title="" dataIndex="action" render={(text, i) => <ButtonLink size="small" type="primary" to={`/location/${i.id}`}>View</ButtonLink>} />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default Locations;
