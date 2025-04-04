import React, { Component } from 'react';
import {
  Card, Col, Button, Table, Form, Divider, Select, message
} from 'antd';
import { Formik, Field } from 'formik';

import axios from 'axios';
import { Row, Modal } from '../../elements';
import { InputField, InspectionFormInfo, DeleteModal } from '..';
import { allowUpdate } from '../../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../../utils/constants';

const INIT = {
  filters: {
    inspectionType: '',
    name: ''
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

class InspectionForms extends Component {
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
        url: '/v1/inspection-forms',
        params: {
          ...sort, ...filters, skip, limit
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
    const {
      items, skip, limit, total, fetching
    } = this.state;
    const { permissions } = this.props;

    return (
      <Row gutter={15} spacing={15}>
        <Col xs={24} sm={24} md={24} lg={24}>
          <Card
            title=""
            extra={allowUpdate(AUTH0_RESOURCE_TYPES.INSPECTIONS, permissions) && (
              <span>
                <Modal
                  title="New Inspection Form"
                  button={
                    <Button type="primary" size="small">New Inpection Form</Button>
                  }
                  destroyOnClose
                  width="50vw"
                  footer={[]}
                >
                  <InspectionFormInfo
                    updateListCallback={this.updateListCallback}
                  />
                </Modal>
              </span>
            )}
          >
            <Row>
              <Col>
                <Formik
                  initialValues={{ inspectionType: '', name: '' }}
                  onSubmit={(values, _actions) => {
                    this.onChange({ current: 1, pageSize: limit }, values);
                  }}
                  onReset={(_values, _actions) => {
                    this.onReset();
                  }}
                >
                  {
                    formProps => (
                      <Form onSubmit={formProps.handleSubmit}>
                        <Row gutter={15} spacing={15}>
                          <Col xs={24} sm={12} md={6}>
                            <Select
                              size="small"
                              name="inspectionType"
                              onChange={value => formProps.setFieldValue('inspectionType', value)}
                              value={formProps.values.inspectionType}
                            >
                              <Select.Option value="">Filter by inspection type</Select.Option>
                              <Select.Option value="check-out">Check-out</Select.Option>
                              <Select.Option value="check-in">Check-in</Select.Option>
                            </Select>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Field placeholder="Filter by name" name="name" component={InputField} />
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
                  <Table.Column title="Inspection Type" dataIndex="inspectionType" />
                  <Table.Column title="Question count" dataIndex="questionList" render={(val, _i) => val.length} />
                  {
                   allowUpdate(AUTH0_RESOURCE_TYPES.INSPECTIONS, permissions) && (
                   <Table.Column
                     title="Actions"
                     dataIndex="action"
                     render={
                        (text, i) => <>
                          <Modal
                            title="Update Inspection Form"
                            button={
                              <Button type="link" size="small">Edit</Button>
                              }
                            destroyOnClose
                            width="75vw"
                            footer={[]}
                          >
                            <InspectionFormInfo
                              id={i.id}
                              updateListCallback={this.updateListCallback}
                            />
                          </Modal>

                          {(i.id && !i.isDeleted) && <DeleteModal url={`/v1/inspection-forms/${i.id}`} onSuccess={this.updateListCallback} resourceType={AUTH0_RESOURCE_TYPES.INSPECTIONS} /> }
                          </>
                      }
                   />
                   )
                  }
                </Table>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    );
  }
}

export default InspectionForms;
