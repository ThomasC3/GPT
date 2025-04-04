import React, { Component } from 'react';
import {
  Card, Col, Button, Table, Form, Divider, Select, message
} from 'antd';
import { Formik, Field } from 'formik';

import axios from 'axios';
import { Row, Modal } from '../../elements';
import { InputField, QuestionInfo, DeleteModal } from '..';
import { allowUpdate } from '../../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../../utils/constants';

const INIT = {
  filters: {
    questionKey: '',
    questionString: '',
    responseType: '',
    optional: ''
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

class InspectionQuestions extends Component {
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
        url: '/v1/questions',
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

    const {
      permissions
    } = this.props;

    return (
      <Row gutter={15} spacing={15}>
        <Col xs={24} sm={24} md={24} lg={24}>
          <Card
            title=""
            extra={allowUpdate(AUTH0_RESOURCE_TYPES.INSPECTIONS, permissions) && (
              <span>
                <Modal
                  title="New Question"
                  button={
                    <Button type="primary" size="small">New Question</Button>
                  }
                  destroyOnClose
                  width="50vw"
                  footer={[]}
                >
                  <QuestionInfo
                    updateListCallback={this.updateListCallback}
                  />
                </Modal>
              </span>
            )}
          >
            <Row>
              <Col>
                <Formik
                  initialValues={{
                    questionString: '', questionKey: '', responseType: '', optional: ''
                  }}
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
                              name="responseType"
                              onChange={value => formProps.setFieldValue('responseType', value)}
                              value={formProps.values.responseType}
                            >
                              <Select.Option value="">Filter by response type</Select.Option>
                              <Select.Option value="number">Number</Select.Option>
                              <Select.Option value="string">String</Select.Option>
                              <Select.Option value="boolean">Boolean</Select.Option>
                            </Select>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Select
                              size="small"
                              name="optional"
                              onChange={value => formProps.setFieldValue('optional', value || false)}
                              value={formProps.values.optional}
                            >
                              <Select.Option value="">Filter by optional</Select.Option>
                              <Select.Option value={false}>False</Select.Option>
                              <Select.Option value>True</Select.Option>
                            </Select>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Field placeholder="Filter by key" name="questionKey" component={InputField} />
                          </Col>

                          <Col xs={24} sm={12} md={6}>
                            <Field placeholder="Filter by question" name="questionString" component={InputField} />
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
                  <Table.Column title="Question" dataIndex="questionString" />
                  <Table.Column title="Key" dataIndex="questionKey" />
                  <Table.Column title="Response Type" dataIndex="responseType" />
                  <Table.Column title="Optional" dataIndex="optional" render={(val, _i) => `${val}`} />
                  {
                    allowUpdate(AUTH0_RESOURCE_TYPES.INSPECTIONS, permissions) && (
                      <Table.Column
                        title="Actions"
                        dataIndex="action"
                        render={
                          (text, i) => <>
                            <Modal
                              title="Update Question"
                              button={
                                <Button type="link" size="small">Edit</Button>
                                }
                              destroyOnClose
                              width="50vw"
                              footer={[]}
                            >
                              <QuestionInfo
                                id={i.id}
                                updateListCallback={this.updateListCallback}
                              />
                            </Modal>

                            {(i.id && !i.isDeleted) && <DeleteModal url={`/v1/questions/${i.id}`} onSuccess={this.updateListCallback} resourceType={AUTH0_RESOURCE_TYPES.INSPECTIONS} /> }
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

export default InspectionQuestions;
