
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const generateNumber = (min, max) => {
  const number = Math.floor(Math.random() * (max - min + 1)) + min;
  return number;
};

export const generatePassword = (lenght) => {
  const password = [];

  const possible = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*`;

  while (password.length < lenght) {
    const random = Math.floor(Math.random() * possible.length);
    password.push(possible.charAt(random));
  }

  return password.join(``);
};

export const generateHash = (word) => {
  const hash = bcrypt.hashSync(word, bcrypt.genSaltSync(10));
  return hash;
};

export const compareHashes = (password, hash2) => bcrypt.compareSync(password, hash2);

export const generateMD5 = (value) => {
  const hash = crypto.createHash(`md5`).update(value).digest(`hex`);
  return hash;
};

export default {
  generateNumber,
  generatePassword,
  generateHash,
  compareHashes,
  generateMD5
};
