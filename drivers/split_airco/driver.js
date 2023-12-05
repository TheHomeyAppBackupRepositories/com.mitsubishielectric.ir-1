'use strict';

const Homey = require('homey');

module.exports = class SplitAircoDriver extends Homey.Driver {

  async onPairListDevices() {
    return [{
      data: {
        id: `${Math.random()}`,
      },
    }];
  }

};
