import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Modal } from 'antd';

const modalRoot = document.getElementById('portals');

class ModalPortal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: props.isOpen
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
    this.setState(({ isOpen }) => ({ isOpen: !isOpen }));
  }

  onClose = () => {
    this.setState({ isOpen: false });
  }

  render() {
    const { isOpen } = this.state;
    return (
      <Fragment>
        {this.props.button && React.cloneElement(this.props.button, { onClick: this.toggle })}
        {this.state.isOpen && ReactDOM.createPortal(
          <Modal
            {...this.props}
            visible={isOpen}
            onCancel={this.onClose}
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
