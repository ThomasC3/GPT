import React from 'react';
import {
  Input, Form
} from 'antd';

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

  activateEdit = () => {
    this.setState({ editing: true });
  };

  deactivateEdit = () => {
    this.setState({ editing: false });
  };

  handleClick = () => {
    const { switchType } = this.props;
    if (!switchType) {
      this.activateEdit();
    }
  };

  update = (e) => {
    const { record, handleUpdate } = this.props;

    this.deactivateEdit();
    this.form.validateFields((error, values) => {
      if (error && error[e.currentTarget.id]) {
        return;
      }
      handleUpdate({ id: record.id, ...values, edited: true });
    });
  };

  renderCell = (form) => {
    this.form = form;
    const {
      children, dataIndex, record, title, required, switchType
    } = this.props;
    const { editing } = this.state;
    return (editing && !switchType) ? (
      <Form.Item style={{ margin: 0 }}>
        {form.getFieldDecorator(dataIndex, {
          rules: [
            {
              required,
              message: `${title} is required.`
            }
          ],
          initialValue: record[dataIndex]
        })(<Input onPressEnter={this.update} onBlur={this.update} />)}
      </Form.Item>
    ) : (
      <div aria-hidden="true" className="editable-cell-value-wrap" onClick={this.handleClick} onKeyDown={this.handleClick}>
        {children}
      </div>
    );
  };

  render() {
    const {
      // Column settings
      title,
      dataIndex,
      backgroundColor,
      editable,
      required,
      switchType,
      // Helpers
      record,
      index,
      // Row actions
      handleUpdate,
      // Others
      children,
      ...restProps
    } = this.props;
    return (
      <td style={{ backgroundColor }} {...restProps}>
        {editable ? (
          <EditableContext.Consumer>{this.renderCell}</EditableContext.Consumer>
        ) : (
          children
        )}
      </td>
    );
  }
}

export default { EditableCell, EditableFormRow };
