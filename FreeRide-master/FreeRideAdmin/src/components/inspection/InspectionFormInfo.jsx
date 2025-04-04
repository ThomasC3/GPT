import React, { Component } from 'react';
import {
  Col, Button, Form, message
} from 'antd';
import {
  Formik, Field, FieldArray
} from 'formik';
import axios from 'axios';
import { Row, FormItem } from '../../elements';
import { InputField, SelectField, QuestionsSelector } from '..';

const INIT = {
  id: null,
  inspectionType: '',
  name: '',
  questionList: [],
  isDeleted: '',
  createdTimestamp: '',
  fetching: true
};

class InspectionFormInfo extends Component {
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
      url: `/v1/inspection-forms/${id}`
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

    const saveData = {
      ...data,
      questionList: data.questionList.map(i => i.id)
    };

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `/v1/inspection-forms/${id || ''}`,
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
      inspectionType, name, questionList,
      isDeleted, createdTimestamp, id,
      fetching
    } = this.state;

    return (
      <Formik
        enableReinitialize
        initialValues={{
          inspectionType,
          name,
          questionList,
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
              <Field label="Name" placeholder="GEM check-out form" name="name" component={InputField} />
            </Row>
            <Row gutter={15} spacing={15}>
              <Field
                disabled={!!id}
                label="Inspection type"
                name="inspectionType"
                options={[
                  { name: 'Choose a type', value: '' },
                  { name: 'Check-out', value: 'check-out' },
                  { name: 'Check-in', value: 'check-in' }
                ]}
                component={SelectField}
              />
            </Row>

            <Row gutter={15} spacing={15}>
              <FormItem label="Questions">
                <FieldArray
                  name="questionList"
                  render={arrayHelpers => (
                    <QuestionsSelector
                      selectedQuestions={formProps.values.questionList}
                      arrayHelpers={arrayHelpers}
                    />
                  )}
                />
              </FormItem>
            </Row>

            <Row gutter={15}>
              <Col>
                <Button
                  loading={fetching}
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

export default InspectionFormInfo;
