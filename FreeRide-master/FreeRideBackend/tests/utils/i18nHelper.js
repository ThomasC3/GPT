import fs from 'fs';
import json5 from 'json5';

export const TI18N = {
  en: json5.parse(fs.readFileSync('locales/en/circuit-backend.json')),
  es: json5.parse(fs.readFileSync('locales/es/circuit-backend.json'))
};

export default { TI18N };
