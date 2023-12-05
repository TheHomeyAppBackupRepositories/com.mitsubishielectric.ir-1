'use strict';

const Homey = require('homey');

const MITSUBISHI_OFF = 0x00;
const MITSUBISHI_ON = 0x20;

const MITSUBISHI_MODE_DRY = 0x10;
const MITSUBISHI_MODE_COOL = 0x18;
const MITSUBISHI_MODE_HEAT = 0x08;
// const MITSUBISHI_MODE_AUTO = 0x20;
const MITSUBISHI_MODE_AUTO = 0x00;

const MITSUBISHI_FAN_AUTO = 0x00;

const MITSUBISHI_TEMP_MIN = 16;
const MITSUBISHI_TEMP_MAX = 31;

module.exports = class SplitAircoDevice extends Homey.Device {

  async onInit() {
    this.registerMultipleCapabilityListener([
      'onoff',
      'target_temperature',
      'thermostat_mode',
    ], this.onCapabilitiesChanged.bind(this), 1000);
  }

  async onCapabilitiesChanged(valuesObj) {
    await this.setState({
      on: valuesObj.onoff ?? this.getCapabilityValue('onoff') ?? true,
      temperature: valuesObj.target_temperature ?? this.getCapabilityValue('target_temperature') ?? 16,
      mode: valuesObj.thermostat_mode ?? this.getCapabilityValue('thermostat_mode') ?? 'heat',
    });
  }

  async setState({
    on = true,
    temperature = 16,
    mode = 'heat',
  } = {}) {
    const payload = [
      0x23, // Byte 0 — Constant
      0xCB, // Byte 1 — Constant
      0x26, // Byte 2 — Constant
      0x01, // Byte 3 — Constant
      0x00, // Byte 4 — Constant
      0x20, // Byte 5 — On/Off
      0x08, // Byte 6 — HVAC Mode
      0x00, // Byte 7 — Temperature
      0x30, // Byte 8 — HVAC Mode ?
      0x58, // Byte 9 — Fan
      0x00, // Byte 10 — Clock
      0x00, // Byte 11 — End Time
      0x00, // Byte 12 — Start Time
      0x00, // Byte 13 — Timer
      0x00, // Byte 14 — Constant
      0x00, // Byte 15 — Constant
      0x00, // Byte 16 — Constant
      0x00, // Byte 17 — Checksum
    ];

    if (on) {
      // Set On
      payload[5] = MITSUBISHI_ON;

      // Set Mode
      switch (mode) {
        case 'dry': {
          payload[6] = MITSUBISHI_MODE_DRY;
          break;
        }
        case 'cool': {
          payload[6] = MITSUBISHI_MODE_COOL;
          break;
        }
        case 'heat': {
          payload[6] = MITSUBISHI_MODE_HEAT;
          break;
        }
        case 'auto': {
          payload[6] = MITSUBISHI_MODE_AUTO;
          break;
        }
        default: {
          throw new Error(`Invalid Mode: ${mode}`);
        }
      }

      // Set Temperature
      payload[7] = Math.round(Math.min(Math.max(temperature, MITSUBISHI_TEMP_MIN), MITSUBISHI_TEMP_MAX) - MITSUBISHI_TEMP_MIN);

      // Set Fan Speed
      // TODO
    } else {
      // Set Off
      payload[5] = MITSUBISHI_OFF;
    }

    // Calculate Checksum
    for (let i = 0; i < 17; i++) {
      payload[17] += payload[i];
    }

    this.log('Payload:', Buffer.from(payload));

    // Convert payload to array of 1 and 0
    const payloadBinary = [];
    for (const i of payload) {
      for (let j = 0; j < 8; j++) {
        const bit = i & (1 << j);
        payloadBinary.push(bit ? 1 : 0);
      }
    }

    // Transmit the payload
    this.signal = await this.homey.rf.getSignalInfrared('mitsubishi');
    this.signal.tx(payloadBinary, {
      device: this,
    })
      .then(() => this.log('TX Complete'))
      .catch((err) => this.error('TX Error:', err));
  }

};
