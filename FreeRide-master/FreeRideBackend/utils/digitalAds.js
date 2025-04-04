import { Campaigns } from '../models';
import { calculateAge } from './time';
import { shuffle } from './array';

const mediaListSequencer = (featuredMedia, mediaList) => [
  ...shuffle(featuredMedia), ...shuffle(mediaList)
];

const fetchRunningAdvertisements = async (location) => {
  const { timezone } = location;
  const locationId = location.id || location._id;
  const configuration = { timezone, populate: 'mediaList featuredMedia' };
  const activeCampaigns = await Campaigns.getLocationActiveCampaigns(locationId, configuration);

  const uniqueMediaIds = [];
  const uniqueMedia = (media) => {
    if (!media._id) return false;
    const isUnique = !uniqueMediaIds.includes(`${media._id}`);
    if (isUnique) uniqueMediaIds.push(`${media._id}`);
    return isUnique;
  };

  const campaignFeaturedMedia = activeCampaigns
    .map(camp => ({ ...camp.featuredMedia?.toJSON(), campaignId: camp._id, featured: true }))
    .filter(uniqueMedia);

  const campaignMediaList = activeCampaigns
    .map(camp => camp.mediaList.map(media => ({
      ...media.toJSON(), campaignId: camp._id, featured: false
    })))
    .flat()
    .filter(uniqueMedia);

  return { campaignFeaturedMedia, campaignMediaList };
};

// Filters
const completeAdvertisement = media => media.sourceUrl && media.advertisement?.url;
const allowedAdvertisement = (media, age) => (
  !media.advertisement?.ageRestriction || media.advertisement?.ageRestriction <= age
);
const isImage = media => ['jpeg', 'jpg'].includes(media.filetype);

export const fetchAllowedAdsForRider = async (location, rider) => {
  const { campaignFeaturedMedia, campaignMediaList } = await fetchRunningAdvertisements(location);
  const age = calculateAge(rider.dob);

  const mediaList = mediaListSequencer(campaignFeaturedMedia, campaignMediaList)
    .filter(media => (
      completeAdvertisement(media)
      && allowedAdvertisement(media, age)
    ));
  return mediaList.slice(0, 6);
};

export const fetchAllowedAdForEmail = async (location, rider) => {
  const { campaignFeaturedMedia, campaignMediaList } = await fetchRunningAdvertisements(location);
  const age = calculateAge(rider.dob);

  const mediaList = mediaListSequencer(campaignFeaturedMedia, campaignMediaList)
    .filter(media => (
      completeAdvertisement(media)
      && allowedAdvertisement(media, age)
      && isImage(media)
    ));
  return mediaList[0];
};

export default {
  fetchAllowedAdsForRider,
  fetchAllowedAdForEmail
};
