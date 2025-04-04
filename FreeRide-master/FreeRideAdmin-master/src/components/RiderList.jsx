import React, { Component, Fragment } from 'react';
import {
  Col, Button, Table, Form, Divider, message
} from 'antd';
import { Link } from 'react-router-dom';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { InputField } from '.';
import { Row } from '../elements';

const INIT = {
  filters: {
    firstName: '',
    lastName: '',
    email: ''
  },

  sort: {
    sort: '',
    order: 1
  },
  items: [],
  skip: 0,
  limit: 15,
  total: 0,
  fetching: true
};

class RiderList extends Component {
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
    const {
      filters, sort, skip, limit
    } = this.state;
    try {
      const data = await axios({
        url: '/v1/riders',
        params: {
          ...sort, ...filters, skip, limit
        }
      }).then(res => res.data);
      this.setState({ fetching: false, ...data });
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message : null;
      message.error(errorMessage || 'Error fetching riders');
      this.setState({ fetching: false });
    }
  }

  onChange = (pagination, filters, sort = this.state.sort) => {
    const { current, pageSize } = pagination;
    const skip = (current * pageSize) - pageSize;
    const { filters: stateFilters } = this.state;
    this.setState({
      skip,
      filters: { ...stateFilters, ...filters },
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
        <Row>
          <Col>
            <Formik
              initialValues={{ firstName: '', lastName: '', email: '' }}
              onSubmit={(values) => {
                this.onChange({ current: 1, pageSize: limit }, values);
              }}
              onReset={() => {
                this.onReset();
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

        <Divider />

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
              <Table.Column title="First Name" dataIndex="firstName" />
              <Table.Column title="Last Name" dataIndex="lastName" />
              <Table.Column title="Email" dataIndex="email" />
              <Table.Column title="Gender" dataIndex="gender" />
              <Table.Column title="" dataIndex="action" render={(text, i) => <Link size="small" type="primary" to={`/riders/${i.id}`}>View</Link>} />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default RiderList;
