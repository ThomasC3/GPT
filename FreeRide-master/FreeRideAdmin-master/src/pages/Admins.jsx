import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Col, Button, Table, Input, Form, Divider, message
} from 'antd';
import { Formik } from 'formik';
import axios from 'axios';
import { AdminInfo } from '../components';
import { Modal2 as Modal, Row } from '../elements';
import { allowUpdate } from '../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const INIT = {
  q: '',
  sort: 'name:1',
  page: 0,
  perPage: 25,
  total: 0,
  fetching: true,
  users: []
};

class Admins extends React.Component {
  state = { ...INIT }

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
      q, sort, page, perPage
    } = this.state;
    try {
      const { data } = await axios({
        url: '/v1/admins',
        params: {
          q, sort, page, perPage
        }
      });
      this.setState({
        fetching: false,
        users: data.users,
        total: data.total,
        start: data.start,
        limit: data.limit
      });
    } catch (e) {
      message.error('An error occurred');
      this.setState({ fetching: false });
    }
  }

  onChange = (pagination, filters, sorter) => {
    const { current, pageSize } = pagination;
    const sort = sorter.order ? `${sorter.field}:${sorter.order === 'ascend' ? 1 : -1}` : 'name:1';

    this.setState({
      page: current - 1,
      perPage: pageSize,
      sort,
      fetching: true
    });
  }

  onReset = () => {
    this.setState({ ...INIT, fetching: true });
  }

  render() {
    const {
      users, start, limit, total, fetching
    } = this.state;
    const { permissions } = this.props;

    return (
      <Card title="Admins" extra={allowUpdate(AUTH0_RESOURCE_TYPES.ADMINS, permissions) && <NewAdmin />}>
        <Row>
          <Col>
            <Formik
              initialValues={{ q: '' }}
              onSubmit={(values) => {
                this.setState({ q: values.q, page: 0, fetching: true });
              }}
              onReset={() => {
                this.onReset();
              }}
            >
              {formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Row gutter={15} spacing={15}>
                    <Col xs={24} sm={12} md={6}>
                      <Input
                        size="small"
                        placeholder="Search by Name or Email"
                        name="q"
                        value={formProps.values.q}
                        onChange={formProps.handleChange}
                      />
                    </Col>
                  </Row>

                  <Row gutter={15}>
                    <Col>
                      <Button size="small" onClick={formProps.handleReset}>Reset</Button>
                      &nbsp;
                      <Button type="primary" size="small" htmlType="submit">Search</Button>
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
              dataSource={users}
              rowKey={i => i.user_id}
              size="small"
              loading={fetching}
              pagination={{
                pageSize: limit,
                current: (start / limit) + 1,
                total,
                showSizeChanger: true,
                showQuickJumper: true
              }}
              onChange={this.onChange}
            >
              <Table.Column
                title="Name"
                dataIndex="name"
                sorter
              />
              <Table.Column
                title="Email"
                dataIndex="email"
                sorter
              />
              <Table.Column
                title="Actions"
                key="action"
                render={(_text, record) => (
                  <Link to={`/admins/${record.user_id}`}>View</Link>
                )}
              />
            </Table>
          </Col>
        </Row>
      </Card>
    );
  }
}

const NewAdmin = () => (
  <Modal
    title="New Admin"
    button={<Button type="primary" size="small">New Admin</Button>}
    destroyOnClose
    width="50vw"
    footer={[]}
  >
    <AdminInfo />
  </Modal>
);

export default Admins;
