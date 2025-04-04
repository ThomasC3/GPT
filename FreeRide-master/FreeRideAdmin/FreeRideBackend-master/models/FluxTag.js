const FluxTag = {
  '-2': {
    tag: -2,
    color: 'green',
    message: 'not busy',
    translationKey: 'flux.notBusy'
  },
  '-1': {
    tag: -1,
    color: 'green',
    message: 'normal',
    translationKey: 'flux.normal'
  },
  0: {
    tag: 0,
    color: 'green',
    message: 'normal',
    translationKey: 'flux.normal'
  },
  1: {
    tag: 1,
    color: 'yellow',
    message: 'busy',
    translationKey: 'flux.busy'
  },
  2: {
    tag: 2,
    color: 'red',
    message: 'very busy',
    translationKey: 'flux.veryBusy'
  },
  default: {
    tag: -2,
    color: 'green',
    message: 'not busy',
    translationKey: 'flux.notBusy'
  }
};

Object.freeze(FluxTag);

export default FluxTag;
