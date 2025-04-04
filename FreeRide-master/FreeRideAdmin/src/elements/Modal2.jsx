import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Modal } from 'antd';

const modalRoot = document.getElementById('portals');

class ModalPortal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: props.visible
    };
    this.el = document.createElement('div');
  }

  componentDidMount() {
    modalRoot.appendChild(this.el);
  }

  componentWillUnmount() {
    modalRoot.removeChild(this.el);
  }

  toggle = () => {
    this.setState(({ visible }) => ({ visible: !visible }));
  }

  onClose = () => {
    this.setState({ visible: false });
  }

  render() {
    const { visible } = this.state;

    return (
      <Fragment>
        {this.props.button && React.cloneElement(this.props.button, { onClick: this.toggle })}
        {ReactDOM.createPortal(
          <Modal
            {...this.props}
            visible={visible}
            onCancel={this.onClose}
            onOk={() => {
              this.props.onOk({ onClose: this.onClose });
            }}
          >
            {this.props.children
              ? (
                this.props.children
              ) : (
                this.props.render({ ...this.state, onClose: this.onClose })
              )
            }
          </Modal>,
          this.el
        )
        }
      </Fragment>
    );
  }
}

export default ModalPortal;
