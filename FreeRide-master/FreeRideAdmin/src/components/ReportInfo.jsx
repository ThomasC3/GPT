import React, { Component } from 'react';
import { useDropzone } from 'react-dropzone';
import S3Upload from 'react-s3-uploader/s3upload';
import { withRouter, Link } from 'react-router-dom';
import {
  Col, Button, Spin, Form, Table, message
} from 'antd';
import { Formik, Field, ErrorMessage } from 'formik';
import axios from 'axios';
import moment from 'moment';
import { Row } from '../elements';
import { InputField, SelectField, DeleteModal } from '.';
import Components from '../pages/Login/components';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const {
  DropzoneContainer
} = Components;

const reasons = [
  'Purposefully created an inaccurate ride request',
  'Directed inappropriate speech and/or behavior toward a driver',
  'Directed inappropriate speech and/or behavior toward another rider or the public',
  'Physically assaulted a driver, Circuit staff-member or fellow rider',
  'Caused the police to be called for a non-emergency related event',
  'Under the age of 16',
  'Other'
].map(el => ({ name: el, value: el }));

const statuses = [
  'Pending', 'Confirmed', 'Denied'
].map(el => ({ name: el, value: el }));

class ReportInfo extends Component {
  state = {
    id: null,
    location: '',
    reporter: '',
    reportee: '',
    reported_at: null,
    reason: '',
    reporterReason: '',
    feedback: '',
    notes: '',
    isDeleted: false,
    docs: [],
    ride: {
      location: {}
    }
  }

  componentDidMount() {
    if (this.props.id) {
      this.fetch(this.props.id);
    } else {
      this.setState({ fetching: false });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.id) {
      if (this.props.id !== prevProps.id) {
        this.fetch(this.props.id);
      }
    }
  }

  fetch = (id) => {
    this.setState({ fetching: true });
    axios.get(`/v1/reports/${id}`).then((res) => {
      this.setState({
        ...res.data,
        fetching: false
      });
    });
  }

  save = (data) => {
    const { id, rideId } = this.props;
    const {
      reason, feedback, notes, docs,
      isDeleted, doc, status
    } = data;

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `/v1/reports/${id || ''}`,
      data: {
        reason,
        feedback,
        notes,
        docs,
        isDeleted,
        doc,
        status,
        ride: rideId
      }
    });
  }

  saveDoc = (id, doc) => axios({
    method: 'POST',
    url: `/v1/reports/${id}/docs`,
    data: { doc }
  })

  getSignedUrl = (file, callback) => {
    const { id } = this.props;

    axios.post('/v1/reports/signS3', {
      objectName: file.name,
      contentType: file.type,
      prefix: `report/${id}`
    })
      .then((response) => {
        callback(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  handleUploadedFile = (uploadResult) => {
    const { id } = this.props;

    const url = uploadResult.url;
    const filename = url.substring(url.lastIndexOf('/') + 1);

    this.saveDoc(id, { url, filename })
      .then((response) => {
        const report = response.data;
        const ctr = this.state.uploadCounter;

        this.setState({ docs: report.docs, uploadCounter: ctr - 1 });
      })
      .catch((err) => {
        console.log(err);
        message.error('An error has occured');
      });
  }

  handleRejected = (_files, e) => {
    message.error('An error has occured!');
    console.log(e);
  }

  handleUpload = (files) => {
    this.setState({ uploadingDocs: true });

    new S3Upload({
      files,
      uploadRequestHeaders: { 'Access-Control-Allow-Origin': '*' },
      getSignedUrl: this.getSignedUrl,

      onFinishS3Put: this.handleUploadedFile,
      preprocess: (file, next) => {
        const ctr = this.state.uploadCounter || 0;
        this.setState({ uploadCounter: ctr + 1 });
        next(file);
      },
      onProgress: (e) => { console.log(`progress: ${e}`); },
      onError: (e) => {
        message.error('An error has occured!');
        console.log(e);
      },
      onFinish: (e) => { console.log(`Final Finish: ${e}`); }
    });
  }

  handleRemoveFile = (filename) => {
    const { id } = this.props;

    const docs = this.state.docs;
    const filteredDocs = docs.filter(item => item.filename !== filename);

    this.setState({ docs: filteredDocs });
    this.save({ id, docs: filteredDocs });
  }

  submit = (values, actions) => {
    const { id } = this.props;

    this.save({ ...values }).then((res) => {
      message.success('Successfully Saved');
      if (!id) {
        this.props.history.replace(`/reports/${res.data.id}`);
      }
    }).catch((err) => {
      message.error('An Error Occurred');
      console.log(err);
    }).finally(() => {
      actions.setSubmitting(false);
    });
  };

  render() {
    const { fetching } = this.state;
    const {
      reporter, reporterReason, reportee,
      reported_at, reason, docs, ride,
      feedback, notes, isDeleted, driver,
      createdTimestamp, status, uploadCounter
    } = this.state;

    const { id } = this.props;

    return (
      <Spin spinning={fetching}>
        <Formik
          enableReinitialize
          initialValues={{
            id,
            reporter,
            docs,
            reportee,
            reported_at,
            reason,
            reporterReason,
            feedback,
            notes,
            isDeleted,
            ride,
            createdTimestamp,
            driver,
            status,
            uploadCounter
          }}
          validateOnChange={false}
          onSubmit={this.submit}
          render={formProps => (
            <Form onSubmit={formProps.handleSubmit}>
              {id && !fetching && (
              <Row gutter={15} spacing={15}>
                <Col xs={24} sm={24} md={24} lg={12}>
                  <div>
                    <strong>Status:</strong>
                    {' '}
                    {status}
                    &nbsp;
                    &nbsp;
                  </div>

                  <div>
                    <strong>Reported By:</strong>
                    {' '}
                    {reporter.userType}
                    &nbsp;
                  </div>

                  <div>
                    <strong>Reported:</strong>
                    {' '}
                    {reportee.userType}
                    &nbsp;
                  </div>

                  <div>
                    <strong>Location:</strong>
                    {' '}
                    {ride.location.name}
                  </div>
                  <div>
                    <strong>Ride:</strong>
                    {' '}
                    <Link to={`/rides/${ride.id}`}>View Ride</Link>
                  </div>

                  <div>
                    <strong>Reporter:</strong>
                    &nbsp;
                    <DriverOrRiderLink type={reporter.userType} id={reporter.id}>
                      {reporter.firstName}
                      {' '}
                      {reporter.lastName}
                    </DriverOrRiderLink>
                  </div>

                  <div>
                    <strong>Reportee:</strong>
                    &nbsp;
                    <DriverOrRiderLink type={reportee.userType} id={reportee.id}>
                      {reportee.firstName}
                      {' '}
                      {reportee.lastName}
                    </DriverOrRiderLink>
                  </div>

                  <div>
                    <strong>Reported At:</strong>
                    {' '}
                    { moment(createdTimestamp).format('lll') }
                  </div>

                  <div>
                    <strong>Reported Reason:</strong>
                    {' '}
                    {reporterReason}
                    &nbsp;
                  </div>

                  <div>
                    <strong>Is Deleted?</strong>
                    {' '}
                    {isDeleted ? 'Yes' : 'No'}
                    &nbsp;
                  </div>
                </Col>
              </Row>
              )
            }
              <Row gutter={15} spacing={15}>
                <Col xs={24} sm={24} md={24} lg={12}>
                  <Row spacing={15}>
                    <Col xs={24} sm={24} md={24}>
                      <Field label="Status" name="status" options={statuses} component={SelectField} />
                    </Col>
                  </Row>
                  <Row spacing={15}>
                    <Col xs={24} sm={24} md={24}>
                      <Field label="Reason" name="reason" options={reasons} component={SelectField} />
                    </Col>
                  </Row>
                  <Row gutter={15}>
                    <Col xs={24} sm={24} md={24}>
                      <Field label="Feedback" name="feedback" component={InputField} type="textarea" row={2} />
                    </Col>
                  </Row>
                  <Row gutter={15}>
                    <Col xs={24} sm={24} md={24}>
                      <Field label="Notes" name="notes" component={InputField} type="textarea" rows={4} />
                    </Col>
                  </Row>
                  <Row gutter={15}>
                    &nbsp;
                    &nbsp;
                    Documents:
                    { id
                      && (
                      <Col xs={24} sm={24} md={24}>
                        <BasicDropZone
                          docs={docs}
                          uploadCounter={uploadCounter}
                          onDrop={this.handleUpload}
                          onDropRejected={this.handleRejected}
                          onRemove={this.handleRemoveFile}
                        />
                      </Col>
                      )
                    }
                    {' '}
                    {/* else */}
                    {' '}
                    {
                      !id
                        && (
                        <Col xs={24} sm={24} md={24}>
                          <i>Can only be uploaded after report is created</i>
                        </Col>
                        )
                      }
                  </Row>
                </Col>
              </Row>

              <Row gutter={15} spacing={15}>
                <Col xs={24} sm={24} md={24} lg={12}>
                  <Button size="small" style={{ float: 'right' }} type="primary" htmlType="submit" disabled={formProps.isSubmitting}>{id ? 'Update' : 'Create'}</Button>
                  <div style={{ clear: 'clear' }}>
                    <ErrorMessage name="serviceArea" />
                  </div>
                  {(id && !isDeleted) && <DeleteModal url={`/v1/reports/${id}`} onSuccess={() => this.props.history.replace('/reports')} resourceType={AUTH0_RESOURCE_TYPES.REPORTS} /> }
                </Col>
              </Row>
            </Form>
          )}
        />
      </Spin>
    );
  }
}

const BasicDropZone = (props) => {
  const { getRootProps, getInputProps } = useDropzone({ onDrop: props.onDrop });

  return (
    <section className="container">
      <DropzoneContainer {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag and drop some files here, or click to select files</p>
      </DropzoneContainer>
      <aside>
        <Spin spinning={props.uploadCounter > 0}>
          <Table
            dataSource={props.docs}
            rowKey={i => i.url}
            size="small"
            loading={props.uploadCounter > 0}
            pagination={false}
          >
            <Table.Column
              title="Uploaded Files"
              dataIndex="filename"
              render={
              (_text, i) => <a href={i.url} target="_blank" rel="noopener noreferrer">{i.filename}</a>
            }
            />
            <Table.Column
              title=""
              dataIndex="action"
              render={
              (_text, i) => (
                <Button size="small" type="primary" onClick={() => props.onRemove(i.filename)}>
                  Remove
                </Button>
              )}
            />
          </Table>
        </Spin>
      </aside>
    </section>
  );
};

const DriverOrRiderLink = (props) => {
  const { type, id, children } = props;
  const url = (type === 'Rider') ? `/riders/${id}` : `/drivers/${id}`;
  return (
    <Link to={url}>{children}</Link>
  );
};

export default withRouter(ReportInfo);
