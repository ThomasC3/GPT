/* eslint-disable no-underscore-dangle */
import path from 'path';
import mustache from 'mustache';
import fs from 'fs';

export const templateName = path.basename(__filename, '.js');

export const subject = async (_values = {}, language = 'en') => {
  const subjectTranslations = {
    en: 'Your ride receipt from Circuit',
    es: 'Tu recibo de viaje de Circuit'
  };
  return subjectTranslations[language] || subjectTranslations.en;
};

const _templatePicker = (locationName, language = 'en') => {
  let languagePrefix = '';
  if (language !== 'en') {
    languagePrefix = `${language}_`;
  }
  let filePath = `services/mailers/templates/assets/default/${languagePrefix}email.html`;
  if (String(locationName) === 'FRANC - Newport Center') {
    filePath = `services/mailers/templates/assets/franc/${languagePrefix}email.html`;
  } else if (String(locationName) === 'FRED - San Diego') {
    filePath = `services/mailers/templates/assets/fred/${languagePrefix}email.html`;
  }
  return filePath;
};

export const html = async (values, language) => {
  let filePath = _templatePicker(values.locationName, language);
  let content;

  try {
    content = await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    filePath = _templatePicker(values.locationName);
    content = await fs.promises.readFile(filePath, 'utf-8');
  }

  return mustache.render(content, values);
};

export default {
  templateName,
  html,
  subject
};
