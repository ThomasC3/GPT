import { expect } from 'chai';
import { emptyAllCollections } from '../utils/helper';
import { Locations } from '../../models';

describe('Location model', () => {
  describe('When having 101 locations saved', () => {
    before(async () => {
      await emptyAllCollections();

      const locationPromises = [];
      for (let i = 0; i < 101; i += 1) {
        locationPromises.push(
          Locations.createLocation({ name: `Location ${i + 1}` })
        );
      }
      await Promise.all(locationPromises);
    });
    it('should list all 101 locations if limit given is 0', async () => {
      const locations = await Locations.getLocations({ limit: 0 });
      expect(locations.items).to.be.lengthOf(101);
    });
    it('should list 5 locations if limit given is 5', async () => {
      const locations = await Locations.getLocations({ limit: 5 });
      expect(locations.items).to.be.lengthOf(5);
    });
    it('should list a default of 30 locations if no limit is provided', async () => {
      const locations = await Locations.getLocations({});
      expect(locations.items).to.be.lengthOf(30);
    });
  });
});
