import Axios from 'axios';
import React, { Component } from 'react';
import {
  Col, Badge, Descriptions, PageHeader, message,
  Button, Icon, Switch, Popconfirm, Divider
} from 'antd';
import { Link } from 'react-router-dom';
import { Row, SmallCard } from '../elements';
import { EditableTable, LocationDropdown } from '.';

import {
  decodeJobCode, applyLocationCode, applyClientCode, applyTypeCode
} from '../utils/format';

const url = '/v1/jobs';

class JobList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      addingJob: false,
      jobs: [],
      locations: [],
      filters: {}
    };
  }

  componentDidMount() {
    this.buildInitialTable();
  }

  buildInitialTable = async () => (
    this.fetchLocations().then(res => (
      this.setState({ locations: res.data.items }, this.fetchJobs)
    ))
  )

  fetchJobs = async () => {
    const { filters: params } = this.state;
    return Axios({
      url,
      method: 'GET',
      params
    }).then(res => this.setState({ jobs: res.data.jobs.map(this.buildRowFromJob) }))
      .catch(err => (
        message.error(err.response && err.response.data ? err.response.data.message : 'An error has occured while fetching jobs')
      ));
  }

  fetchLocations = async () => (
    Axios({
      url: '/v1/locations',
      method: 'GET',
      params: { limit: 0 }
    }).catch(err => (
      message.error(err.response && err.response.data ? err.response.data.message : 'An error has occured while fetching location info')
    ))
  )

  buildRowFromJob = job => ({
    id: job.id,
    originalJob: job,
    code: job.code,
    clientCode: job.clientCode,
    typeCode: job.typeCode,
    active: job.active,
    ...this.matchLocation(job)
  });

  matchLocation = ({ locationId, locationCode }) => {
    const { locations } = this.state;

    if (!locationId && !locationCode) {
      return { locationId: '', locationCode: '', locationName: '' };
    }

    const location = locationId
      ? locations.find(loc => `${loc.id}` === `${locationId}`)
      : locations.find(loc => loc.locationCode === locationCode);

    return {
      locationName: (location && location.name) || '',
      locationId: (location && location.id) || locationId || '',
      locationCode: (location && location.locationCode) || locationCode || ''
    };
  }

  addJob = () => {
    const { jobs, addingJob } = this.state;
    if (addingJob) {
      message.warning('Save or delete new job before adding another!');
    } else {
      this.setState({
        addingJob: true,
        jobs: [
          ...jobs,
          {
            id: null,
            originalJob: {},
            code: 'XXX001-XXXX',
            clientCode: 'XXX',
            typeCode: 'X',
            locationId: '',
            locationName: '',
            locationCode: 'XXX001',
            active: false,
            // Row params
            edited: true
          }
        ]
      });
    }
  }

  updateJob = (jobData_) => {
    const { jobs } = this.state;
    let jobData = { ...jobData_ };

    const idx = jobData.newJob ? jobs.findIndex(job => !job.id) : jobs.findIndex(j => `${j.id}` === `${jobData.id}`);
    const originalJob = jobs[idx];

    if (jobData.code) {
      const decodedJob = decodeJobCode(jobData.code);
      const locationData = this.matchLocation({ locationCode: decodedJob.locationCode });
      jobData = { ...jobData, ...decodedJob, ...locationData };
    } else {
      let jobCode = originalJob.code;
      const updatedLocationId = Object.keys(jobData).includes('locationId');
      if (updatedLocationId || jobData.locationCode) {
        const locationData = this.matchLocation(
          { locationId: jobData.locationId, locationCode: jobData.locationCode }
        );
        const code = applyLocationCode(jobCode, locationData.locationCode);
        jobData = { ...jobData, ...locationData, code };
        jobCode = code;
      }
      if (jobData.clientCode) {
        jobData.code = applyClientCode(jobCode, jobData.clientCode);
        jobCode = jobData.code;
      }
      if (jobData.typeCode) {
        jobData.code = applyTypeCode(jobCode, jobData.typeCode);
        jobCode = jobData.code;
      }
    }

    jobs[idx] = {
      ...originalJob,
      ...jobData
    };

    this.setState({ jobs });
  }

  toggleActive = (id) => {
    const { jobs } = this.state;
    const idx = !id ? jobs.findIndex(job => !job.id) : jobs.findIndex(j => `${j.id}` === `${id}`);
    const originalJob = jobs[idx];

    jobs[idx] = { ...originalJob, active: !originalJob.active, edited: true };

    this.setState({ jobs });
  }

  handleLocationChange = record => this.updateJob({
    id: record.id, locationId: record.locationId, edited: true
  });

  removeJob = (id) => {
    const { jobs } = this.state;
    this.setState({ jobs: [...jobs.filter(j => j.id !== id)] });
  }

  formatJobOutput = job => ({
    code: job.code,
    location: job.locationId || null,
    locationCode: job.locationCode,
    clientCode: job.clientCode,
    typeCode: job.typeCode,
    active: job.active
  })

  handleSave = async job => Axios({
    url: job.id ? `${url}/${job.id}` : url,
    method: job.id ? 'PUT' : 'POST',
    data: this.formatJobOutput(job)
  })
    .then((res) => {
      const newJob = !job.id;
      const jobData = this.buildRowFromJob(res.data);
      this.handleReset({ ...jobData, newJob }, true);
      if (newJob) {
        this.setState({ addingJob: false });
      }
      message.success('Job saved');
    })
    .catch((err) => {
      const errorMessage = err.response && err.response.data
        ? err.response.data.message
        : null;
      message.error(errorMessage || 'Unable to save job');
    })

  handleDelete = async (job) => {
    if (job.id) {
      Axios
        .delete(`${url}/${job.id}`)
        .then(() => this.removeJob(job.id))
        .catch((err) => {
          const errorMessage = err.response && err.response.data
            ? err.response.data.message
            : null;
          message.error(errorMessage || 'Unable to delete job');
        });
    } else {
      this.removeJob(job.id);
      this.setState({ addingJob: false });
    }
  }

  handleReset = (jobData, saving = false) => {
    const { jobs } = this.state;
    const idx = jobData.newJob ? jobs.findIndex(job => !job.id) : jobs.findIndex(j => `${j.id}` === `${jobData.id}`);

    jobs[idx] = {
      ...this.buildRowFromJob(jobData.originalJob),
      originalJob: jobData.originalJob,
      edited: false
    };

    this.setState({ jobs });
    if (!saving) {
      message.success('Job reset');
    }
  }

  render() {
    const { jobs, locations, filters: { location: locationFilter } } = this.state;
    const emptyBadgeStyle = {
      backgroundColor: '#fff', color: '#999', boxShadow: '0 0 0 1px #d9d9d9 inset'
    };

    const unsavedCount = jobs.filter(x => x.edited).length;

    return (
      <>
        <PageHeader>
          <Row gutter={15} spacing={15}>
            <Col xs={24} sm={12} md={6}>
              <LocationDropdown
                placeholder="Any location"
                width="220px"
                locations={locations}
                value={locationFilter || ''}
                onLocationChange={val => (
                  val
                    ? this.setState({ filters: { location: val } }) : this.setState({ filters: {} })
                )}
              />
              <Divider type="vertical" />
              <Popconfirm
                title={`Sure to filter?${unsavedCount ? ` You will lose ${unsavedCount} unsaved change${unsavedCount > 1 ? 's' : ''}.` : ''}`}
                onConfirm={() => this.buildInitialTable()}
              >
                <Button size="small" type="primary">
                  Filter
                </Button>
              </Popconfirm>
            </Col>
          </Row>
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="Total">
              <Badge count={jobs.length} style={emptyBadgeStyle} />
            </Descriptions.Item>
            <Descriptions.Item label="Not Saved">
              <Badge
                style={{ backgroundColor: '#d46b08' }}
                count={jobs.filter(x => x.edited).length}
              />
            </Descriptions.Item>
          </Descriptions>
        </PageHeader>
        <SmallCard title="Jobs">
          <Row gutter={15} spacing={15}>
            <Col xs={24} sm={24} md={24}>
              <EditableTable
                dataSource={jobs}
                columns={[
                  {
                    title: 'Code (Original)',
                    dataIndex: 'originalJob',
                    backgroundColor: 'lightgrey',
                    render: text => (
                      <Link to={`jobs/${text.id}`}>
                        {text.code}
                      </Link>
                    )
                  },
                  {
                    title: 'Code',
                    dataIndex: 'code',
                    editable: true,
                    required: true
                  },
                  {
                    title: 'Location Code',
                    dataIndex: 'locationCode',
                    editable: true,
                    required: true
                  },
                  {
                    title: 'Location Name',
                    dataIndex: 'locationId',
                    backgroundColor: 'lightgrey',
                    render: (text, record) => (
                      <LocationDropdown
                        placeholder="Select location"
                        width="100%"
                        // eslint-disable-next-line react/destructuring-assignment
                        locations={this.state.locations}
                        value={text}
                        onLocationChange={val => (
                          this.handleLocationChange({ id: record.id, locationId: val })
                        )}
                      />
                    )
                  },
                  {
                    title: 'Client Code',
                    dataIndex: 'clientCode',
                    editable: true,
                    required: true
                  },
                  {
                    title: 'Type Code',
                    dataIndex: 'typeCode',
                    editable: true,
                    required: true
                  },
                  {
                    title: 'Active',
                    dataIndex: 'active',
                    editable: true,
                    switchType: true,
                    render: (text, record) => (
                      <Switch
                        size="small"
                        checked={record.active}
                        onClick={() => {
                          this.toggleActive(record.id);
                        }}
                      />
                    )
                  }
                ]}
                handleUpdate={this.updateJob}
                handleReset={this.handleReset}
                handleSave={this.handleSave}
                handleDelete={this.handleDelete}
              />
            </Col>
          </Row>
          <Row gutter={15} spacing={15}>
            <Col xs={24} sm={24} md={24}>
              <Button size="small" type="warning" onClick={() => this.addJob()}>
                <Icon type="plus" />
              </Button>
            </Col>
          </Row>
        </SmallCard>
      </>
    );
  }
}

export default JobList;
