import sinon from 'sinon';
import moment from 'moment-timezone';
import { convertDate, calculateAge } from '../utils/time';

describe('Time utils for dob', () => {
  describe('converts date correctly', () => {
    it('converts MM/DD/YYYY -> YYYY-MM-DD', () => {
      const dob = '12/20/1990';
      const convertedDate = convertDate(dob);
      return sinon.assert.match(convertedDate, '1990-12-20');
    });
    it('converts MM-DD-YYYY -> YYYY-MM-DD', () => {
      const dob = '12-20-1990';
      const convertedDate = convertDate(dob);
      return sinon.assert.match(convertedDate, '1990-12-20');
    });
    it('converts YYYY-MM-DD -> YYYY-MM-DD', () => {
      const dob = '1990-12-20';
      const convertedDate = convertDate(dob);
      return sinon.assert.match(convertedDate, '1990-12-20');
    });
  });

  describe('calculates age correctly', () => {
    it('user should be 21', () => {
      const dob = '1999-12-20';
      const now = moment('2020-12-31');
      const age = calculateAge(dob, now);
      return sinon.assert.match(age, 21);
    });
    it('user should be 20', () => {
      const dob = '1999-12-20';
      const now = moment('2020-12-01');
      const age = calculateAge(dob, now);
      return sinon.assert.match(age, 20);
    });
  });
});
