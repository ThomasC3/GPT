import path from 'path';
import mustache from 'mustache';
import fs from 'fs';

export const templateName = path.basename(__filename, '.js');

export const subject = async () => 'New Rider Report';

export const html = async (values) => {
  const filePath = 'services/mailers/templates/assets/new-rider-report/email.html';
  const content = await fs.promises.readFile(filePath, 'utf-8');

  return mustache.render(content, values);
};

export default {
  templateName,
  html,
  subject
};
