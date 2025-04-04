import * as React from 'react';
import { Spin, Select } from 'antd';
import axios from 'axios';

class InspectionFormDropdown extends React.PureComponent {
  state={
    inspectionForms: [],
    fetching: true
  }

  componentDidMount() {
    this.fetch();
  }

  fetch = async () => {
    this.setState({ fetching: true });
    const { inspectionType } = this.props;
    const params = {
      limit: 100,
      inspectionType
    };
    try {
      const data = await axios({
        url: '/v1/inspection-forms',
        params
      }).then(res => res.data);
      this.setState({ fetching: false, inspectionForms: data.items });
    } catch (e) {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { inspectionForms, fetching } = this.state;
    const { value, onChange } = this.props;

    return (
      <Spin spinning={fetching}>
        <Select
          menuPlacement="auto"
          menuPosition="fixed"
          size="small"
          onChange={onChange}
          value={value}
          style={{ width: '250px' }}
        >
          <Select.Option value={null}>Select Inspection form</Select.Option>
          {inspectionForms.map(i => <Select.Option key={i.id} value={i.id}>{i.name}</Select.Option>)}
        </Select>
      </Spin>
    );
  }
}

export default InspectionFormDropdown;
