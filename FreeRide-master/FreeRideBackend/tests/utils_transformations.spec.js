import { expect } from 'chai';
import { buildJobCode } from '../utils/transformations';

describe('utils/transformations', () => {
  describe('When running buildJobCode', () => {
    it('Should build code with location object', () => {
      const job = { location: { locationCode: 'LC001' }, clientCode: 'ABC', typeCode: 'T' };
      expect(buildJobCode(job)).to.equal('LC001-ABCT');
    });
    it('Should build code with only locationCode', () => {
      const job = { locationCode: 'LC002', clientCode: 'ABC', typeCode: 'T' };
      expect(buildJobCode(job)).to.equal('LC002-ABCT');
    });
    it('Should build code with location id and locationCode', () => {
      const job = {
        location: 'ID', locationCode: 'LC003', clientCode: 'ABC', typeCode: 'T'
      };
      expect(buildJobCode(job)).to.equal('LC003-ABCT');
    });
    it('Should build code with location\'s locationCode when both are present', () => {
      const job = {
        location: { locationCode: 'LC004' }, locationCode: 'LC005', clientCode: 'ABC', typeCode: 'T'
      };
      expect(buildJobCode(job)).to.equal('LC004-ABCT');
    });
  });
});
