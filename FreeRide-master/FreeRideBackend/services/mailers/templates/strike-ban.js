/* eslint-disable no-underscore-dangle */
import path from 'path';
import mustache from 'mustache';
import fs from 'fs';

export const templateName = path.basename(__filename, '.js');

export const subject = async ({ strikeType }, language = 'en') => {
  const subjectTranslations = {
    'first-strike': {
      en: 'Violation of Circuit Terms of Use and Rider Code of Conduct - 1st Strike',
      es: 'Violación de los Términos de Uso y del Código de Conducta de Pasajeros de Circuit: Primera Advertencia'
    },
    'second-strike': {
      en: 'Violation of Circuit Terms of Use and Rider Code of Conduct - 2nd Strike',
      es: 'Violación de los Términos de Uso de Circuit y del Código de Conducta de Circuit: Segunda Advertencia'
    },
    'third-strike': {
      en: 'Violation of Circuit Terms of Use and Rider Code of Conduct - 3rd Strike, Immediate Ban',
      es: 'Violación de los Términos de Uso de Circuit y del Código de Conducta de Circuit: Tercera Advertencia, Desactivación Inmediata'
    },
    ban: {
      en: 'Violation of Circuit Terms of Use and Rider Code of Conduct - Immediate Ban',
      es: 'Violación de los Términos de Uso de Circuit y del Código de Conducta de Circuit: Desactivación Inmediata'
    }
  };
  return subjectTranslations[strikeType][language] || subjectTranslations[strikeType].en;
};

const _templatePicker = (strikeType, language = 'en') => {
  const languagePrefix = language !== 'en' ? `${language}_` : '';
  return `services/mailers/templates/strike-ban/${strikeType}/${languagePrefix}email.html`;
};

export const html = async (values, language) => {
  let filePath = _templatePicker(values.strikeType, language);
  let content;

  try {
    content = await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    filePath = _templatePicker(values.strikeType);
    content = await fs.promises.readFile(filePath, 'utf-8');
  }

  return mustache.render(content, values);
};

export default {
  templateName,
  html,
  subject
};
