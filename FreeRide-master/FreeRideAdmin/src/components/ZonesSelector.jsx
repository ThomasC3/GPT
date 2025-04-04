import * as React from 'react';
import { Spin, Transfer } from 'antd';
import axios from 'axios';
import PropTypes from 'prop-types';

class ZonesSelector extends React.PureComponent {
  state={
    zones: [],
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
    this.setState({ fetching: true });
    const params = {
      limit: 100
    };
    const { location } = this.props;
    try {
      const data = await axios({
        url: `/v1/locations/${location}/zones`,
        params
      }).then(res => res.data);
      this.setState({ fetching: false, zones: data });
    } catch (e) {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { zones, fetching } = this.state;
    const { values, onChange, disabled } = this.props;
    return (
      <Spin spinning={fetching}>
        <Transfer
          dataSource={zones.map(i => ({ key: i.id, title: i.name }))}
          titles={['Zones', 'Assigned']}
          listStyle={{ width: 200, height: 200 }}
          targetKeys={values}
          onChange={onChange}
          disabled={disabled}
          render={i => <span>{i.title}</span>}
        />
      </Spin>

    );
  }
}

ZonesSelector.propTypes = {
  location: PropTypes.string,
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func,
  disabled: PropTypes.bool
};

ZonesSelector.defaultProps = {
  location: '',
  onChange: () => {},
  disabled: false
};

export default ZonesSelector;
