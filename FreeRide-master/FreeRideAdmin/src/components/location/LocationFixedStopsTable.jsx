
import React from 'react';
import {
  Table, Input, Switch,
  Popconfirm, Form, Divider
} from 'antd';
import { Link } from 'react-router-dom';

const EditableContext = React.createContext();

const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

class EditableCell extends React.Component {
  state = {
    editing: false
  };

  toggleEdit = () => {
    const editing = !this.state.editing;
    this.setState({ editing }, () => {
      if (editing) {
        this.input.focus();
      }
    });
  };

  save = (e) => {
    const { record, handleSave } = this.props;
    this.form.validateFields((error, values) => {
      if (error && error[e.currentTarget.id]) {
        return;
      }
      this.toggleEdit();
      handleSave({ ...record, ...values });
    });
  };

  renderCell = (form) => {
    this.form = form;
    const {
      children, dataIndex, record, title, required
    } = this.props;
    const { editing } = this.state;
    return editing ? (
      <Form.Item style={{ margin: 0 }}>
        {form.getFieldDecorator(dataIndex, {
          rules: [
            {
              required,
              message: `${title} is required.`
            }
          ],
          initialValue: record[dataIndex]
        })(<Input ref={node => (this.input = node)} onPressEnter={this.save} onBlur={this.save} />)}
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingRight: 24, minWidth: 50, minHeight: 10 }}
        onClick={this.toggleEdit}
      >
        {children}
      </div>
    );
  };

  render() {
    const {
      editable,
      dataIndex,
      title,
      record,
      index,
      handleSave,
      children,
      required,
      ...restProps
    } = this.props;
    return (
      <td {...restProps}>
        {editable ? (
          <EditableContext.Consumer>{this.renderCell}</EditableContext.Consumer>
        ) : (
          children
        )}
      </td>
    );
  }
}

class LocationFixedStopsTable extends React.Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        editable: true,
        width: '150px',
        required: true
      },
      {
        title: 'Business Name',
        dataIndex: 'businessName',
        editable: true,
        width: '150px',
        required: false
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: '100px',
        render: (text, record) => (this.state.dataSource.length >= 1 ? (
          <Switch
            size="small"
              // eslint-disable-next-line
              checked={record.status == 1}
            onClick={(active) => {
              this.setStatus(record.key, active);
            }}
          />
        ) : null)
      },
      {
        title: 'Latitude',
        dataIndex: 'lat',
        editable: true,
        width: '200px',
        required: true
      },
      {
        title: 'Longitude',
        dataIndex: 'lng',
        editable: true,
        width: '200px',
        required: true
      },
      {
        title: 'Address',
        dataIndex: 'address',
        editable: true,
        width: '200px',
        ellipsis: true
      },
      {
        title: 'Operation',
        dataIndex: 'operation',
        width: '120px',
        fixed: 'right',
        render: (text, record) => (this.state.dataSource.length >= 1 ? (
            <>
              <Popconfirm title="Sure to delete?" onConfirm={() => this.handleServerDelete(record.key)}>
                <Link to="#" size="small" type="primary">Delete</Link>
              </Popconfirm>
              { record.edited
                && <>
                  <Divider type="vertical" />
                  <Popconfirm title="Sure to save?" onConfirm={() => this.handleServerSave(record.key)}>
                    <Link to="#" size="small" style={{ color: '#d46b08' }} type="primary">
                      {record._id ? 'Update' : 'Save'}
                    </Link>
                  </Popconfirm>
                </>
              }
            </>
        ) : null)
      }
    ];

    this.state = {
      dataSource: props.fixedStops.map((e, i) => ({
        ...e,
        key: i
      }))
    };
  }

  static getDerivedStateFromProps(props, state) {
    return {
      dataSource: props.fixedStops.map((e, i) => ({
        ...e,
        key: i
      }))
    };
  }

  handleServerDelete = async (key) => {
    const dataSource = [...this.state.dataSource];
    const itemIndex = this.state.dataSource.findIndex((item => item.key === key));
    const deletedItem = dataSource[itemIndex];
    deletedItem.isDeleted = true;
    await this.props.handleDelete(deletedItem);
  };

  handleServerSave = async (key) => {
    const dataSource = [...this.state.dataSource];
    const itemIndex = this.state.dataSource.findIndex((item => item.key === key));
    const item = dataSource[itemIndex];
    item.edited = false;
    dataSource.splice(itemIndex, 1, { ...item });

    await this.props.handleSave(item);
  };

  handleSave = (row) => {
    const newData = [...this.state.dataSource];
    const index = newData.findIndex(item => row.key === item.key);
    const item = newData[index];

    row.lat = parseFloat(row.lat);
    row.lng = parseFloat(row.lng);

    newData.splice(index, 1, {
      ...item,
      ...row,
      edited: true
    });
    this.setState({ dataSource: newData });

    this.props.updateFixedStops(newData);
  };

  setStatus = (key, status) => {
    const dataSource = [...this.state.dataSource];
    const itemIndex = this.state.dataSource.findIndex((item => item.key === key));
    const editedItem = dataSource[itemIndex];
    editedItem.status = status ? 1 : 0;
    dataSource.splice(itemIndex, 1, { ...editedItem, edited: true });
    this.setState({ dataSource });

    this.props.updateFixedStops(dataSource);
  }

  render() {
    const { dataSource } = this.state;
    const components = {
      body: {
        row: EditableFormRow,
        cell: EditableCell
      }
    };
    const columns = this.columns.map((col) => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: record => ({
          record,
          editable: col.editable,
          required: col.required,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave: this.handleSave
        })
      };
    });
    return (
      <div>
        <Table
          size="small"
          components={components}
          rowClassName={() => 'editable-row'}
          bordered
          pagination={false}
          dataSource={dataSource}
          columns={columns}
          scroll={{ x: 1120, y: 400 }}
          onRow={(fixedStop, _rowIndex) => ({
            onClick: (e) => {
              this.props.onFixedStopSelected(fixedStop);
            }
          })}
        />
      </div>
    );
  }
}

export default LocationFixedStopsTable;
