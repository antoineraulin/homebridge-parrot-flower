
'use strict';

const debug = require('debug')('flower:ble');

const BleUtils = require('../ble/BleUtils');

const FLOWER_POWER_LIVE_SERVICE_UUID = '39e1fa0084a811e2afba0002a5d5c51b';

/** 
 * Must keep these sorted as they're used sorted.
 */
const LiveCharacteristics = [
  '39e1fa0184a811e2afba0002a5d5c51b', // FLOWER_POWER_LIGHT_LEVEL_CHARACTERISTIC_UUID
  '39e1fa0384a811e2afba0002a5d5c51b', // FLOWER_POWER_SOIL_TEMP_CHARACTERISTIC_UUID
  '39e1fa0484a811e2afba0002a5d5c51b', // FLOWER_POWER_AIR_TEMP_CHARACTERISTIC_UUID
  '39e1fa0584a811e2afba0002a5d5c51b', // FLOWER_POWER_SOIL_VWC_CHARACTERISTIC_UUID
];

class RetrieveFlowerPowerDataTask {
  constructor() {
  }

  async execute(peripheral) {
    const [service] = await BleUtils.discoverServices(peripheral, [FLOWER_POWER_LIVE_SERVICE_UUID]);
    debug('Discovered flower power live service');

    const [lightLevel, soilTemp, airTemp, soilMoisture] =
      await BleUtils.discoverCharacteristics(service, LiveCharacteristics);
    debug('Discovered characteristics');

    const rawLightLevel = await BleUtils.readCharacteristic(lightLevel);
    const rawSoilTemp = await BleUtils.readCharacteristic(soilTemp);
    const rawAirTemp = await BleUtils.readCharacteristic(airTemp);
    const rawSoilMoisture = await BleUtils.readCharacteristic(soilMoisture);

    return {
      lightLevel: this._convertLightLevel(rawLightLevel),
      soilTemperature: this._convertTemperatureData(rawSoilTemp),
      airTemperature: this._convertTemperatureData(rawAirTemp),
      soilMoisture: this._convertMoistureData(rawSoilMoisture),
    };
  }

  _convertLightLevel(data) {
    const rawValue = data.readUInt16LE(0) * 1.0;

    const sunlight = 0.08640000000000001 * (192773.17000000001 * Math.pow(rawValue, -1.0606619));

    return sunlight;
  }

  _convertTemperatureData(data) {
    const rawValue = data.readUInt16LE(0) * 1.0;

    let temperature = 0.00000003044 * Math.pow(rawValue, 3.0) - 0.00008038 * Math.pow(rawValue, 2.0) + rawValue * 0.1149 - 30.449999999999999;
    if (temperature < -10.0) {
      temperature = -10.0;
    } else if (temperature > 55.0) {
      temperature = 55.0;
    }

    return temperature;
  }

  _convertMoistureData(data) {
    const rawValue = data.readUInt16LE(0) * 1.0;

    let soilMoisture = 11.4293 + (0.0000000010698 * Math.pow(rawValue, 4.0) - 0.00000152538 * Math.pow(rawValue, 3.0) + 0.000866976 * Math.pow(rawValue, 2.0) - 0.169422 * rawValue);

    soilMoisture = 100.0 * (0.0000045 * Math.pow(soilMoisture, 3.0) - 0.00055 * Math.pow(soilMoisture, 2.0) + 0.0292 * soilMoisture - 0.053);

    if (soilMoisture < 0.0) {
      soilMoisture = 0.0;
    } else if (soilMoisture > 60.0) {
      soilMoisture = 60.0;
    }

    return soilMoisture;
  }
}

module.exports = RetrieveFlowerPowerDataTask;