import * as React from 'react';
import PropTypes from 'prop-types';
import { Spin, Transfer } from 'antd';
import axios from 'axios';

class JobSelector extends React.PureComponent {
  state={
    jobs: [],
    fetching: true
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps) {
    const { location } = this.props;
    if (prevProps.location !== location) {
      this.fetch();
    }
  }

  fetch = async () => {
    const { location } = this.props;
    const params = { active: true };
    if (location) {
      params.location = location;
    }
    this.setState({ fetching: true });

    try {
      const data = await axios({
        url: '/v1/jobs',
        params
      }).then(res => res.data);
      this.setState({ fetching: false, jobs: data.jobs });
    } catch (e) {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { jobs, fetching } = this.state;
    const { values, onChange } = this.props;
    return (
      <Spin spinning={fetching}>
        <Transfer
          dataSource={jobs.map(i => ({ key: i.id, title: i.code }))}
          titles={['Jobs', 'Assigned']}
          listStyle={{ width: 200, height: 200 }}
          targetKeys={values}
          onChange={onChange}
          render={i => <span>{i.title}</span>}
        />
      </Spin>

    );
  }
}

JobSelector.propTypes = {
  location: PropTypes.string,
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired
};

JobSelector.defaultProps = {
  location: ''
};

export default JobSelector;
