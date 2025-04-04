import { expect } from 'chai';
import { typeConverter } from '../utils/string';

describe('utils/string', () => {
  describe('typeConverter', () => {
    it('should convert [true, false, \'true\', \'false\', \'True\', \'False\'] to boolean', () => {
      [true, false, 'true', 'false', 'True', 'False'].forEach((value) => {
        expect(typeConverter(value, 'boolean')).to.be.a('boolean');
      });
    });
    it('should not convert [undefined, null, \'tru\', \'nan\'] to boolean', () => {
      [undefined, null, 'tru', 'nan'].forEach((value) => {
        const errorMessage = [null, undefined].includes(value) ? 'Invalid value' : 'Invalid boolean value';
        expect(() => typeConverter(value, 'boolean')).to.throw(Error, errorMessage);
      });
    });
    it('should convert [true, false, -1, 0, 1, \'-1\', \'0\', \'1\'] to number', () => {
      [-1, 0, 1, '-1', '0', '1'].forEach((value, idx) => {
        expect(typeConverter(value, 'number')).to.equal([-1, 0, 1][idx % 3]);
      });
    });
    it('should not convert [undefined, null, \'--1\', \'nan\'] to number', () => {
      [undefined, null, '--1', 'nan'].forEach((value) => {
        const errorMessage = [null, undefined].includes(value) ? 'Invalid value' : 'Invalid number value';
        expect(() => typeConverter(value, 'number')).to.throw(Error, errorMessage);
      });
    });
  });
});
