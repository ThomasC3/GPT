import path from 'path';
import mustache from 'mustache';

export const templateName = path.basename(__filename, '.js');

export const subject = async (values, language = 'en') => {
  const subjectTranslations = {
    en: '{{ role }} forgotten password request',
    es: 'Código PIN para recuperar la contraseña de Circuit'
  };
  const content = subjectTranslations[language] || subjectTranslations.en;
  return mustache.render(content, values);
};

export const html = async (values, language = 'en') => {
  const bodyTranslations = {
    en: `<html>
          <body>
            <h1>Hello!</h1>
            <p>Use this pincode to restore password: <b>{{ pincode }}</b></p>
          </body>
        </html>`,
    es: `<html>
          <body>
            <h1>¡Hola!</h1>
            <p>Usa este código PIN para restaurar tu contraseña: <b>{{ pincode }}</b></p>
          </body>
        </html>`
  };
  const content = bodyTranslations[language] || bodyTranslations.en;

  return mustache.render(content, values);
};

export default {
  templateName,
  html,
  subject
};
