import React, { Component } from 'react';
import {
  Col, Button, Form, message
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { Row } from '../../elements';
import { InputField, SelectField } from '..';

const INIT = {
  id: null,
  questionString: null,
  questionKey: '',
  responseType: '',
  optional: false,
  isDeleted: '',
  createdTimestamp: '',
  fetching: true
};

class QuestionInfo extends Component {
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
    const id = this.state.id || this.props.id;
    if (!id) {
      this.setState({ fetching: false });
      return;
    }

    await axios({
      url: `/v1/questions/${id}`
    })
      .then((res) => {
        this.setState({ fetching: false, ...res.data });
      }).catch((err) => {
        console.log(err);
        message.error('A error occured');
        this.setState({ fetching: false });
      });
  }

  save = (data, actions) => {
    const { id } = this.props;

    const saveData = { ...data };

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `/v1/questions/${id || ''}`,
      data: saveData
    }).then((_res) => {
      message.success('Successfully Saved');

      if (this.props.updateListCallback) {
        this.props.updateListCallback();
      }
    }).catch((err) => {
      const errorMessage = err.response && err.response.data
        ? err.response.data.message
        : null;

      message.error(errorMessage || 'An Error Occurred');
    }).finally(() => {
      if (actions) { actions.setSubmitting(false); }
      this.setState({ fetching: false });
    });
  }

  render() {
    const {
      questionString, questionKey, responseType,
      optional, isDeleted, createdTimestamp, id
    } = this.state;

    return (
      <Formik
        enableReinitialize
        initialValues={{
          questionString,
          questionKey,
          responseType,
          optional,
          createdTimestamp,
          isDeleted,
          id
        }}
        onSubmit={(values, actions) => {
          this.save({ ...values }, actions);
        }}
      >
        { formProps => (
          <Form onSubmit={formProps.handleSubmit}>
            <Row gutter={15} spacing={15}>
              <Field label="Question" placeholder="What is the battery percentage?" name="questionString" component={InputField} />
            </Row>
            <Row gutter={15} spacing={15}>
              <Field disabled={!!id} label="Key" placeholder="battery" name="questionKey" component={InputField} />
            </Row>
            <Row gutter={15} spacing={15}>
              <Field
                disabled={!!id}
                label="Response type"
                name="responseType"
                options={[
                  { name: 'Choose a type', value: '' },
                  { name: 'String', value: 'string' },
                  { name: 'Number', value: 'number' },
                  { name: 'Boolean', value: 'boolean' }
                ]}
                component={SelectField}
              />
            </Row>
            <Row gutter={15} spacing={15}>
              <Field
                label="Optional"
                name="optional"
                options={[
                  { name: 'False', value: false },
                  { name: 'True', value: true }
                ]}
                component={SelectField}
              />
            </Row>

            <Row gutter={15}>
              <Col>
                <Button
                  loading={this.state.fetching}
                  type="primary"
                  size="small"
                  htmlType="submit"
                >
                  {id ? 'Update' : 'Create'}
                </Button>
              </Col>
            </Row>

          </Form>
        )}
      </Formik>
    );
  }
}

export default QuestionInfo;
