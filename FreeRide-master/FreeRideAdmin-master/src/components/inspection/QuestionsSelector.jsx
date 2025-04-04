import * as React from 'react';
import {
  Formik, Form, Field
} from 'formik';
import {
  Spin, Table, Checkbox,
  Row, Col, Select, Button,
  Collapse, Divider, Icon
} from 'antd';
import axios from 'axios';
import { InputField } from '..';

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
  fetching: true
};

class QuestionsSelector extends React.PureComponent {
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
    this.setState({ fetching: true });

    try {
      const data = await axios({
        url: '/v1/questions',
        params: {
          ...sort, ...filters, skip, limit
        }
      }).then(res => res.data);
      this.setState({ fetching: false, ...data });
    } catch (e) {
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

  moveUp = (index, arrayHelpers) => {
    arrayHelpers.move(index, index - 1);
  }

  moveDown = (index, arrayHelpers) => {
    arrayHelpers.move(index, index + 1);
  }

  remove = (index, arrayHelpers) => {
    arrayHelpers.pop(index);
  }

  onReset = () => {
    this.setState(INIT);
    this.fetch();
  }

  render() {
    const { items, limit, fetching } = this.state;
    const { selectedQuestions, arrayHelpers } = this.props;

    return (
      <Spin spinning={fetching}>
        <Row>
          <Table
            dataSource={selectedQuestions}
            rowKey={i => i.id}
            size="small"
            loading={fetching}
            pagination={false}
          >
            <Table.Column title="Question" dataIndex="questionString" />
            <Table.Column title="Key" dataIndex="questionKey" />
            <Table.Column title="Response Type" dataIndex="responseType" />
            <Table.Column title="Optional" dataIndex="optional" render={(val, _i) => `${val}`} />
            <Table.Column
              title="Move"
              render={(value, item, index) => {
                let upStatus = false;
                let downStatus = false;
                if (selectedQuestions.length > 1) {
                  if (index === 0) {
                    downStatus = true;
                  } else if (index === selectedQuestions.length - 1) {
                    upStatus = true;
                  } else {
                    upStatus = true;
                    downStatus = true;
                  }
                }
                return (
                  <div>
                    <Button size="small" type="primary" disabled={!upStatus} onClick={() => this.moveUp(index, arrayHelpers)}><Icon type="up" /></Button>
                    <Button size="small" type="primary" disabled={!downStatus} onClick={() => this.moveDown(index, arrayHelpers)}><Icon type="down" /></Button>
                  </div>
                );
              }}
            />
            <Table.Column
              title="Remove"
              render={(value, item, index) => (
                <Button size="small" type="danger" onClick={() => this.remove(index, arrayHelpers)}><Icon type="close" /></Button>
              )}
            />
          </Table>
        </Row>
        <Divider />
        <Row>
          <Collapse accordion>
            <Collapse.Panel header="Add more questions" key="1">
              <Formik
                initialValues={{ questionString: '', questionKey: '', responseType: '' }}
                onSubmit={(values) => {
                  this.onChange({ current: 1, pageSize: limit }, values);
                }}
                onReset={() => {
                  this.onReset();
                }}
              >
                {
                  formProps => (
                    <Form onSubmit={formProps.handleSubmit}>
                      <Row gutter={15} spacing={15}>
                        <Col xs={24} sm={12} md={6}>
                          <Field placeholder="Filter by key" name="questionKey" component={InputField} />
                        </Col>

                        <Col xs={24} sm={12} md={6}>
                          <Field placeholder="Filter by question" name="questionString" component={InputField} />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Select
                            size="small"
                            name="responseType"
                            onChange={value => formProps.setFieldValue('responseType', value)}
                            value={formProps.values.responseType}
                          >
                            <Select.Option value="">Select response type</Select.Option>
                            <Select.Option value="number">Number</Select.Option>
                            <Select.Option value="string">Text</Select.Option>
                            <Select.Option value="boolean">True or False</Select.Option>
                          </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Select
                            size="small"
                            name="optional"
                            onChange={value => formProps.setFieldValue('optional', value)}
                            value={formProps.values.optional}
                          >
                            <Select.Option value="">Select optional</Select.Option>
                            <Select.Option value={false}>False</Select.Option>
                            <Select.Option value>True</Select.Option>
                          </Select>
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <Button size="small" onClick={formProps.handleReset}>Reset</Button>
                          &nbsp;
                          <Button type="primary" size="small" htmlType="submit">Filter</Button>
                        </Col>
                      </Row>
                    </Form>
                  )}
              </Formik>
              <Table
                dataSource={items}
                rowKey={i => i.id}
                size="small"
                loading={fetching}
              >
                <Table.Column title="Question" dataIndex="questionString" />
                <Table.Column title="Key" dataIndex="questionKey" />
                <Table.Column title="Response Type" dataIndex="responseType" />
                <Table.Column title="Optional" dataIndex="optional" render={(val, _i) => `${val}`} />
                <Table.Column
                  title="Added"
                  render={value => (
                    <Checkbox
                      size="small"
                      // eslint-disable-next-line
                      checked={!!selectedQuestions.map(it => it.id).includes(value.id)}
                      onClick={() => {
                        const selected = !!selectedQuestions.map(it => it.id).includes(value.id);
                        if (selected) {
                          const index = selectedQuestions.map(it => it.id).indexOf(value.id);
                          arrayHelpers.remove(index);
                        } else {
                          arrayHelpers.push(value);
                        }
                      }}
                    />
                  )}
                />
              </Table>
            </Collapse.Panel>
          </Collapse>
        </Row>
      </Spin>

    );
  }
}

export default QuestionsSelector;
