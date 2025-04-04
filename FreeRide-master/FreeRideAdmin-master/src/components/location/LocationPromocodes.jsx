import React, { Component } from 'react';
import {
  Card, Col, Button, Table, Form, Divider, Select, Tag, message
} from 'antd';
import { Formik, Field } from 'formik';

import axios from 'axios';
import moment from 'moment-timezone';
import { Row, Modal } from '../../elements';
import { InputField, PromocodeInfo, DeleteModal } from '..';

const INIT = {
  filters: {
    name: '',
    code: ''
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

class LocationPromocodes extends Component {
  state = {
    ...INIT
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.fetching && !prevState.fetching) {
      this.fetch();
    }
  }

  fetch = async () => {
    const {
      filters, sort, skip, limit
    } = this.state;
    try {
      const data = await axios({
        url: '/v1/promocodes',
        params: {
          ...sort, ...filters, skip, limit, location: this.props.locationIdParam
        }
      }).then(res => res.data);
      this.setState({ fetching: false, ...data });
    } catch (e) {
      console.log(e.response);

      message.error('A error occured');
      this.setState({ fetching: false });
    }
  }

  onChange = (pagination, filters, sort = this.state.sort) => {
    const { current, pageSize } = pagination;
    const skip = (current * pageSize) - pageSize;

    this.setState({
      skip,
      filters: { ...this.state.filters, ...filters },
      sort: { field: sort.field, order: sort.order },
      fetching: true
    });
  }

  onReset = () => {
    this.setState({ ...INIT });
  }

  updateListCallback = () => {
    this.fetch();
  };

  render() {
    const locationId = this.props.locationIdParam;
    const {
      items, skip, limit, total, fetching
    } = this.state;
    const { timezone } = this.props.location;

    return (
      <Row gutter={15} spacing={15}>
        <Col xs={24} sm={24} md={24} lg={24}>
          <Card
            title="Promocodes"
            extra={(
              <span>
                <Modal
                  title="New Promocode"
                  button={
                    <Button type="primary" size="small">New Promocode</Button>
                  }
                  destroyOnClose
                  width="50vw"
                  footer={[]}
                >
                  <PromocodeInfo
                    updateListCallback={this.updateListCallback}
                    locationId={locationId}
                  />
                </Modal>
              </span>
)}
          >
            <Row>
              <Col>
                <Formik
                  initialValues={{ name: '', code: '', isEnabled: '' }}
                  onSubmit={(values, actions) => {
                    this.onChange({ current: 1, pageSize: limit }, values);
                  }}
                  onReset={(values, actions) => {
                    this.onReset();
                  }}
                >
                  {
                    formProps => (
                      <Form onSubmit={formProps.handleSubmit}>
                        <Row gutter={15} spacing={15}>
                          <Col xs={24} sm={12} md={6}>
                            <Field placeholder="Filter by name" name="name" component={InputField} />
                          </Col>

                          <Col xs={24} sm={12} md={6}>
                            <Field placeholder="Filter by code" name="code" component={InputField} />
                          </Col>
                        </Row>
                        <Row gutter={15} spacing={15}>
                          <Col xs={24} sm={12} md={6}>
                            <Select
                              size="small"
                              name="isEnabled"
                              onChange={value => formProps.setFieldValue('isEnabled', value)}
                              value={formProps.values.isEnabled}
                            >
                              <Select.Option value="">Select is Enabled?</Select.Option>
                              <Select.Option value="true">Yes</Select.Option>
                              <Select.Option value="false">No</Select.Option>
                            </Select>
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
                  <Table.Column title="Name" dataIndex="name" />
                  <Table.Column title="Code" dataIndex="code" />
                  <Table.Column title="Type" dataIndex="type" />
                  <Table.Column title="Value" dataIndex="value" />
                  <Table.Column title="Usage Limit" dataIndex="usageLimit" />
                  <Table.Column
                    title="Expiry Date"
                    dataIndex="expiryDate"
                    render={
                    (text, i) => (i.expiryDate ? moment(i.expiryDate).tz(timezone).format('MM/DD/YYYY') : null)
                  }
                  />
                  <Table.Column
                    title="Is Enabled?"
                    dataIndex="isEnabled"
                    render={
                    (text, i) => (
                      <Tag color={i.isEnabled ? 'blue' : 'grey'}>
                        {i.isEnabled ? 'Yes' : 'No'}
                      </Tag>
                    )}
                  />
                  <Table.Column
                    title="Created At"
                    dataIndex="createdTimestamp"
                    render={
                    (text, i) => (i.createdTimestamp ? moment(i.createdTimestamp).tz(timezone).format('MM/DD/YYYY HH:mm') : null)
                  }
                  />
                  <Table.Column
                    title="Actions"
                    dataIndex="action"
                    render={
                    (text, i) => <>
                      <Modal
                        title="New Promocode"
                        button={
                          <Button type="link" size="small">Edit Promocode</Button>
                          }
                        destroyOnClose
                        width="50vw"
                        footer={[]}
                      >
                        <PromocodeInfo
                          id={i.id}
                          updateListCallback={this.updateListCallback}
                          locationId={i.location}
                          timezone={timezone}
                        />
                      </Modal>

                      {(i.id && !i.isDeleted) && <DeleteModal url={`/v1/promocodes/${i.id}`} onSuccess={this.updateListCallback} deleteMethod="PUT" /> }
                      </>
                  }
                  />
                </Table>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    );
  }
}

export default LocationPromocodes;
