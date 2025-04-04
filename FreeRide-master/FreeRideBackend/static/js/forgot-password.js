import * as Sentry from '@sentry/node';

document.addEventListener(`DOMContentLoaded`, (event) => {
  const formContainer = document.getElementById(`form-container`);
  const templatePincode = document.getElementById(`template-pincode`);
  const templateChangePassword = document.getElementById(`template-change-password`);
  const templateErrorMessage = document.getElementById(`template-error-message`);
  let email = ``;


  const submitForgotPasswordForm = (e) => {
    if (e.preventDefault) e.preventDefault();

    const URL = `v1/forgot-password`;
    const formEmail = document.getElementById(`input-email`).value;
    logger.info(formEmail);
    postRequest({ url: URL, data: { email: formEmail } })
      .then((data) => {
        email = formEmail;
        document.getElementsByTagName(`form`)[0].remove();
        formContainer.appendChild(templatePincode.content.cloneNode(true));
        addSubmitEventListener(document.getElementsByTagName(`form`)[0], submitPincodeForm);
        return false;
      }).catch((err) => {
        let message = ``;

        if (err === 404) message = `User with email doesn't exist`;
        else message = `An error occured`;

        document.getElementById(`errors`).innerHTML = ``;
        document.getElementById(`errors`).appendChild(createErrorMessage(message));

        return false;
      });
  };


  const submitPincodeForm = (e) => {
    if (e.preventDefault) e.preventDefault();

    const URL = `v1/email-verify`;
    const pincode = document.getElementById(`input-pincode`).value;

    postRequest({ url: URL, data: { email, code: pincode } })
      .then((data) => {
        document.getElementsByTagName(`form`)[0].remove();
        formContainer.appendChild(templateChangePassword.content.cloneNode(true));
        addSubmitEventListener(document.getElementsByTagName(`form`)[0], submitChangePasswordForm);

        return false;
      }).catch((err) => {
        let message = ``;
        logger.info(err);
        if (err === 401) message = `Incorrect Pincode`;
        else message = `An error occured`;

        document.getElementById(`errors`).innerHTML = ``;
        document.getElementById(`errors`).appendChild(createErrorMessage(message));

        return false;
      });
  };


  const submitChangePasswordForm = (e) => {
    if (e.preventDefault) e.preventDefault();

    const URL = `v1/change-password`;
    const newPassword = document.getElementById(`input-password`).value;
    const confirmPassword = document.getElementById(`input-confirm-password`).value;

    if (newPassword !== confirmPassword) {
      document.getElementById(`errors`).innerHTML = ``;
      document.getElementById(`errors`).appendChild(createErrorMessage(`Password should be identical`));
    } else {
      const URL = `v1/change-password`;
      postRequest({ url: URL, data: { password: newPassword } })
        .then((res) => {
          window.location.href = `/sign-in`;
        }).catch((err) => {
          let message = ``;
          logger.info(err);
          if (err === 401) {
            message = `Incorrect Pincode`;
          } else {
            Sentry.captureException(err);
            message = `An error occured`;
          }

          document.getElementById(`errors`).innerHTML = ``;
          document.getElementById(`errors`).appendChild(createErrorMessage(message));

          return false;
        });
    }
  };


  const createErrorMessage = (text) => {
    const node = templateErrorMessage.content.cloneNode(true);
    node.querySelector(`span`).innerHTML = text;
    return node;
  };

  const postRequest = ({ url = ``, data = {} }) => (
    fetch(url, {
      method: `POST`,
      mode: `cors`, // no-cors, cors, *same-origin
      cache: `no-cache`, // *default, no-cache, reload, force-cache, only-if-cached
      credentials: `same-origin`, // include, *same-origin, omit
      headers: {
        "Content-Type": `application/json; charset=utf-8`,
      },
      body: JSON.stringify(data),
    }).then((res) => {
      if (res.status < 300) {
        return res.json();
      }
      throw res.status;
    })
  );

  const addSubmitEventListener = (node, func) => node.addEventListener(`submit`, func);


  const formForgotPassword = document.getElementById(`form-forgot-password`);
  addSubmitEventListener(formForgotPassword, submitForgotPasswordForm);
});
