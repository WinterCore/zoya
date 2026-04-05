import SHA1 from "crypto-js/sha1";

export namespace WatchPower {
  export interface SessionData {
    readonly secret: string;
    readonly expire: number;
    readonly token: string;
    readonly role: number;
    readonly usr: string;
    readonly uid: number;
    readonly ppAuth: string;
    readonly expiresAt: number;
  }

  interface SuccessResponse<T> {
    readonly type: "success";
    readonly data: T;
  }

  interface ErrorResponse {
    readonly type: "error";
    readonly err: number;
    readonly message: string;
  }

  interface SessionContext {
    readonly token: string;
    readonly secret: string;
  }

  export type AuthResponse = SuccessResponse<SessionData> | ErrorResponse;

  const BASE_URL = "http://android.shinemonitor.com/public/";
  const SUFFIX_CONTEXT = "i18n=pt_BR&lang=pt_BR&source=1&_app_client_=android&_app_id_=wifiapp.volfw.watchpower&_app_version_=1.0.6.3";
  
  const generateHashedSalt = (): string => {
    return SHA1(new Date().getDate().toString()).toString().substring(0, 10);
  };

  export const login = async (username: string, password: string): Promise<AuthResponse> => {
    const baseParams = `&action=authSource&usr=${username}&company-key=bnrl_frRFjEz8Mkn&${SUFFIX_CONTEXT}`;
    const salt = generateHashedSalt();
    const passwordHash = SHA1(password).toString();
    const signature = SHA1(salt + passwordHash + baseParams).toString();

    const resp = await fetch(`${BASE_URL}?sign=${signature}&salt=${salt}${baseParams}`, {
      method: "GET",
    });

    const json = await resp.json();

    if (
      // User not found
      json.err === 261

      // Password is incorrect
      || json.err === 16
    ) {
      return {
        type: "error",
        err: json.err,
        message: "Login failed. Please check your credentials."
      };
    }

    return {
      type: "success",
      data: {
        ...json.dat,
        expiresAt: Date.now() + json.dat.expire * 1000,
      },
    };
  };

  export interface DeviceInfo {
    readonly brand: number;
    readonly buyEnergyToday: string;
    readonly buyEnergyTotal: string;
    readonly buyProfitToday: string;
    readonly buyProfitTotal: string;
    readonly collalias: string;
    readonly devaddr: number;
    readonly devalias: string;
    readonly devcode: number;
    readonly devtype: string;
    readonly energyToday: string;
    readonly energyTotal: string;
    readonly energyYear: string;
    readonly focus: boolean;
    readonly outpower: string;
    readonly pid: number;
    readonly pn: string;
    readonly profitToday: string;
    readonly profitTotal: string;
    readonly sellEnergyToday: string;
    readonly sellEnergyTotal: string;
    readonly sellProfitToday: string;
    readonly sellProfitTotal: string;
    readonly sn: string;
    readonly status: number;
    readonly uid: number;
    readonly usr: string;
  }

  type GetDevicesResponse = SuccessResponse<DeviceInfo[]> | ErrorResponse;

  export const getDevices = async (session: SessionContext): Promise<GetDevicesResponse> => {
    const { secret, token } = session;
    const baseParams = `&action=webQueryDeviceEs&${SUFFIX_CONTEXT}`;
    const salt = generateHashedSalt();
    const signature = SHA1(salt + secret + token + baseParams).toString();

    const resp = await fetch(`${BASE_URL}?sign=${signature}&salt=${salt}&token=${token}${baseParams}`, {
      method: "GET",
    });

    if (!resp.ok) {
      return {
        type: "error",
        err: -1,
        message: `HTTP error: ${resp.statusText}`,
      };
    }
    
    const json = await resp.json();

    if (json.err !== 0) {
      return {
        type: "error",
        err: json.err,
        message: "Failed to retrieve devices.",
      };
    }

    return {
      type: "success",
      data: json.dat.device,
    };
  };

  type GetDeviceDataResponse = SuccessResponse<readonly InverterDataPoint[]> | ErrorResponse;

  export const getDeviceData = async (session: SessionContext, deviceInfo: DeviceInfo, isoDateString: string): Promise<GetDeviceDataResponse> => {
    const { secret, token } = session;
    const baseParams = `&action=queryDeviceDataOneDay&pn=${deviceInfo.pn}&devcode=${deviceInfo.devcode}&sn=${deviceInfo.sn}&devaddr=${deviceInfo.devaddr}&date=${isoDateString}&${SUFFIX_CONTEXT}`;
    const salt = generateHashedSalt();
    const signature = SHA1(salt + secret + token + baseParams).toString();

    const resp = await fetch(`${BASE_URL}?sign=${signature}&salt=${salt}&token=${token}${baseParams}`, {
      method: "GET",
    });

    if (!resp.ok) {
      return {
        type: "error",
        err: -1,
        message: `HTTP error: ${resp.statusText}`,
      };
    }

    const json = await resp.json();

    if (json.err !== 0) {
      return {
        type: "error",
        err: json.err,
        message: "Failed to retrieve devices.",
      };
    }

    return {
      type: "success",
      data: parseInverterData(json.dat),
    };
  };

  export interface InverterDataPoint {
    readonly id: string;
    readonly timestamp: string;
    readonly serialNumber: string;
    readonly machineType: string;
    readonly gridRatingVoltage: number;
    readonly gridRatingCurrent: number;
    readonly batteryRatingVoltage: number;
    readonly acOutputRatingVoltage: number;
    readonly acOutputRatingCurrent: number;
    readonly acOutputRatingFrequency: number;
    readonly acOutputRatingApparentPower: number;
    readonly acOutputRatingActivePower: number;
    readonly mainCpuFirmwareVersion: string;
    readonly secondaryCpuFirmwareVersion: string;
    readonly pv2InputVoltage: number;
    readonly gridVoltage: number;
    readonly gridFrequency: number;
    readonly pv2ChargingPower: number;
    readonly pv1InputVoltage: number;
    readonly pv1ChargingPower: number;
    readonly batteryVoltage: number;
    readonly batteryCapacity: number;
    readonly batteryChargingCurrent: number;
    readonly batteryDischargeCurrent: number;
    readonly ac1OutputVoltage: number;
    readonly ac1OutputFrequency: number;
    readonly ac1OutputApparentPower: number;
    readonly acOutputActivePower: number;
    readonly outputLoadPercent: number;
    readonly ac2OutputStatus: string;
    readonly batteryReChargeVoltage: number;
    readonly batteryBulkVoltage: number;
    readonly batteryFloatVoltage: number;
    readonly batteryType: string;
    readonly maxAcChargingCurrent: number;
    readonly maxChargingCurrent: number;
    readonly acInputRange: string;
    readonly outputSourcePriority: string;
    readonly chargerSourcePriority: string;
    readonly parallelMaxNum: string;
    readonly batteryReDischargeVoltage: number;
    readonly busVoltage: number;
    readonly pv1InputCurrent: number;
    readonly batteryVoltageFromScc: number;
    readonly loadStatus: string;
    readonly solarFeedToGridPower: number;
    readonly pv2InputCurrent: number;
    readonly model: string;
    readonly totalGeneration: number;
  }

  interface InverterRawData {
    readonly row: {
      readonly realtime: boolean;
      readonly field: string[];
    }[];
    readonly title: {
      readonly title: string;
      readonly isDisplay: number;
    }[];
  }

  export const parseInverterData = (rawData: InverterRawData): InverterDataPoint[] => {
    return rawData.row.map(row => {
      const field = row.field;
      return {
        id: field[0],
        timestamp: field[1],
        serialNumber: field[2],
        machineType: field[3],
        gridRatingVoltage: parseFloat(field[4]),
        gridRatingCurrent: parseFloat(field[5]),
        batteryRatingVoltage: parseFloat(field[6]),
        acOutputRatingVoltage: parseFloat(field[7]),
        acOutputRatingCurrent: parseFloat(field[8]),
        acOutputRatingFrequency: parseFloat(field[9]),
        acOutputRatingApparentPower: parseInt(field[10]),
        acOutputRatingActivePower: parseInt(field[11]),
        mainCpuFirmwareVersion: field[12],
        secondaryCpuFirmwareVersion: field[13],
        pv2InputVoltage: parseFloat(field[14]),
        gridVoltage: parseFloat(field[15]),
        gridFrequency: parseFloat(field[16]),
        pv2ChargingPower: parseInt(field[17]),
        pv1InputVoltage: parseFloat(field[18]),
        pv1ChargingPower: parseInt(field[19]),
        batteryVoltage: parseFloat(field[20]),
        batteryCapacity: parseInt(field[21]),
        batteryChargingCurrent: parseInt(field[22]),
        batteryDischargeCurrent: parseInt(field[23]),
        ac1OutputVoltage: parseFloat(field[24]),
        ac1OutputFrequency: parseFloat(field[25]),
        ac1OutputApparentPower: parseInt(field[26]),
        acOutputActivePower: parseInt(field[27]),
        outputLoadPercent: parseInt(field[28]),
        ac2OutputStatus: field[29],
        batteryReChargeVoltage: parseFloat(field[30]),
        batteryBulkVoltage: parseFloat(field[31]),
        batteryFloatVoltage: parseFloat(field[32]),
        batteryType: field[33],
        maxAcChargingCurrent: parseFloat(field[34]),
        maxChargingCurrent: parseFloat(field[35]),
        acInputRange: field[36],
        outputSourcePriority: field[37],
        chargerSourcePriority: field[38],
        parallelMaxNum: field[39],
        batteryReDischargeVoltage: parseFloat(field[40]),
        busVoltage: parseInt(field[41]),
        pv1InputCurrent: parseInt(field[42]),
        batteryVoltageFromScc: parseFloat(field[43]),
        loadStatus: field[44],
        solarFeedToGridPower: parseInt(field[45]),
        pv2InputCurrent: parseFloat(field[46]),
        model: field[47],
        totalGeneration: parseInt(field[48]),
      };
    });
  };
}
