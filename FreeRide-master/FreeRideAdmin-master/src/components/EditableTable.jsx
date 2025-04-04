
import React from 'react';
import PropTypes from 'prop-types';
import {
  Table, Popconfirm, Divider, Button, Icon, Tooltip
} from 'antd';
import EditableCell from './EditableCell';

class EditableTable extends React.Component {
  constructor(props) {
    super(props);
    const {
      dataSource: propsDataSource, columns,
      handleSave, handleReset, handleDelete
    } = this.props;

    this.state = {
      dataSource: propsDataSource.map((e, i) => ({
        ...e,
        key: i
      }))
    };

    this.columns = [
      ...columns,
      {
        title: 'Operation',
        dataIndex: 'operation',
        width: '140px',
        fixed: 'right',
        // eslint-disable-next-line react/destructuring-assignment
        render: (text, record) => (this.state.dataSource.length >= 1 ? (
            <>
              <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record)}>
                <Tooltip title="Delete">
                  <Button size="small" type="danger">
                    <Icon type="close" />
                  </Button>
                </Tooltip>
              </Popconfirm>
              { record.edited && record.id
                && <>
                  <Divider type="vertical" />
                  <Popconfirm title="Sure to reset?" onConfirm={() => handleReset(record)}>
                    <Tooltip title="Reset">
                      <Button size="small" type="warning">
                        <Icon type="redo" />
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </>
              }
              { record.edited
                && <>
                  <Divider type="vertical" />
                  <Popconfirm title="Sure to save?" onConfirm={() => handleSave(record)}>
                    <Tooltip title="Save">
                      <Button size="small" type="primary">
                        <Icon type="save" />
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </>
              }
            </>
        ) : null)
      }
    ];
  }

  static getDerivedStateFromProps(props) {
    return {
      dataSource: props.dataSource.map((e, i) => ({
        ...e,
        key: i
      }))
    };
  }

  render() {
    const { dataSource } = this.state;
    const { handleUpdate } = this.props;
    const components = {
      body: {
        row: EditableCell.EditableFormRow,
        cell: EditableCell.EditableCell
      }
    };
    const columns = this.columns.map(col => (
      {
        ...col,
        onCell: record => ({
          record,
          editable: col.editable,
          required: col.required,
          dataIndex: col.dataIndex,
          title: col.title,
          backgroundColor: col.backgroundColor,
          switchType: col.switchType,
          // Row actions
          handleUpdate
        })
      }
    ));
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
          scroll={{ x: 1120 }}
        />
      </div>
    );
  }
}

EditableTable.propTypes = {
  dataSource: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    dataIndex: PropTypes.string.isRequired,
    editable: PropTypes.bool,
    switchType: PropTypes.bool,
    backgroundColor: PropTypes.string
  })).isRequired,
  handleUpdate: PropTypes.func.isRequired,
  handleSave: PropTypes.func.isRequired,
  handleReset: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired
};

export default EditableTable;
