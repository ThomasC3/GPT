import path from 'path';
import mustache from 'mustache';

export const templateName = path.basename(__filename, `.js`);

export const subject = async (_values = null) => {
  return 'Forgotten password request'
}

export const html = async (values) => {
  const content = `<html>
    <body>
      <h1>Hello!</h1>
      <p>You can sign in with the new temporary password: <b>{{ password }}</b></p>
      <p>Please change it after a successful login. </p>
    </body>
    </html>`;

  return mustache.render(content, values);
}

export default {
  templateName,
  html,
  subject
};
