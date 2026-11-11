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
      readonly unit?: string;
      readonly isDisplay?: number;
    }[];
  }

  /**
   * Maps each InverterDataPoint field to the `title` name the API reports for
   * it. The API docs guarantee title[x] corresponds 1:1 with row[x].field[x],
   * and the vendor has already reordered this layout once (firmware/measurement
   * columns moved ahead of the rating columns, PV2 columns dropped), so parsing
   * positionally is not safe.
   */
  const FIELD_TITLES = {
    serialNumber: "SN",
    machineType: "Machine Type",
    gridRatingVoltage: "Grid Rating Voltage",
    gridRatingCurrent: "Grid Rating Current",
    batteryRatingVoltage: "Battery Rating Voltage",
    acOutputRatingVoltage: "AC Output Rating Voltage",
    acOutputRatingCurrent: "AC Output Rating Current",
    acOutputRatingFrequency: "AC Output Rating Frequency",
    acOutputRatingApparentPower: "AC Output Rating Apparent Power",
    acOutputRatingActivePower: "AC Output Rating Active Power",
    mainCpuFirmwareVersion: "Main CPU Firmware Version",
    secondaryCpuFirmwareVersion: "Secondary CPU Firmware Version",
    pv2InputVoltage: "PV2 Input Voltage",
    gridVoltage: "Grid Voltage",
    gridFrequency: "Grid Frequency",
    pv2ChargingPower: "PV2 Charging Power",
    pv1InputVoltage: "PV1 Input Voltage",
    pv1ChargingPower: "PV1 Charging Power",
    batteryVoltage: "Battery Voltage",
    batteryCapacity: "Battery Capacity",
    batteryChargingCurrent: "Battery Charging Current",
    batteryDischargeCurrent: "Battery Discharge Current",
    ac1OutputVoltage: "AC Output Voltage",
    ac1OutputFrequency: "AC Output Frequency",
    ac1OutputApparentPower: "AC Output Apparent Power",
    acOutputActivePower: "AC Output Active Power",
    outputLoadPercent: "Output Load Percent",
    ac2OutputStatus: "AC2 Output Status",
    batteryReChargeVoltage: "Battery Re-Charge Voltage",
    batteryBulkVoltage: "Battery Bulk Voltage",
    batteryFloatVoltage: "Battery Float Voltage",
    batteryType: "Battery Type",
    maxAcChargingCurrent: "Max AC Charging Current",
    maxChargingCurrent: "Max Charging Current",
    acInputRange: "AC Input Range",
    outputSourcePriority: "Output Source Priority",
    chargerSourcePriority: "Charger Source Priority",
    parallelMaxNum: "Parallel Max Num",
    batteryReDischargeVoltage: "Battery Re-Discharge Voltage",
    busVoltage: "BUS Voltage",
    pv1InputCurrent: "PV1 Input Current",
    batteryVoltageFromScc: "Battery Voltage From SCC",
    loadStatus: "Load Status",
    solarFeedToGridPower: "Solar Feed To Grid Power",
    pv2InputCurrent: "PV2 Input Current",
    model: "Model",
    totalGeneration: "Total Generation",
  } as const satisfies Record<
    Exclude<keyof InverterDataPoint, "id" | "timestamp">,
    string
  >;

  /** Lowercased title -> index into each row's field array. */
  const buildTitleIndex = (titles: readonly { readonly title: string }[]): ReadonlyMap<string, number> => {
    const index = new Map<string, number>();
    titles.forEach((entry, i) => {
      const key = entry.title.trim().toLowerCase();
      if (!index.has(key)) {
        index.set(key, i);
      }
    });
    return index;
  };

  const num = (raw: string | undefined): number => {
    const parsed = parseFloat(raw ?? "");
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const str = (raw: string | undefined): string => raw ?? "";

  export const parseInverterData = (rawData: InverterRawData): InverterDataPoint[] => {
    const titleIndex = buildTitleIndex(rawData.title ?? []);

    // Per the API docs, field[0] is always the row id and field[1] is always
    // the timestamp, regardless of locale or layout — those stay positional.
    return rawData.row.map(row => {
      const field = row.field;
      const valueOf = (key: keyof typeof FIELD_TITLES): string | undefined => {
        const idx = titleIndex.get(FIELD_TITLES[key].toLowerCase());
        return idx === undefined ? undefined : field[idx];
      };

      return {
        id: field[0],
        timestamp: field[1],
        serialNumber: str(valueOf("serialNumber")),
        machineType: str(valueOf("machineType")),
        gridRatingVoltage: num(valueOf("gridRatingVoltage")),
        gridRatingCurrent: num(valueOf("gridRatingCurrent")),
        batteryRatingVoltage: num(valueOf("batteryRatingVoltage")),
        acOutputRatingVoltage: num(valueOf("acOutputRatingVoltage")),
        acOutputRatingCurrent: num(valueOf("acOutputRatingCurrent")),
        acOutputRatingFrequency: num(valueOf("acOutputRatingFrequency")),
        acOutputRatingApparentPower: num(valueOf("acOutputRatingApparentPower")),
        acOutputRatingActivePower: num(valueOf("acOutputRatingActivePower")),
        mainCpuFirmwareVersion: str(valueOf("mainCpuFirmwareVersion")),
        secondaryCpuFirmwareVersion: str(valueOf("secondaryCpuFirmwareVersion")),
        pv2InputVoltage: num(valueOf("pv2InputVoltage")),
        gridVoltage: num(valueOf("gridVoltage")),
        gridFrequency: num(valueOf("gridFrequency")),
        pv2ChargingPower: num(valueOf("pv2ChargingPower")),
        pv1InputVoltage: num(valueOf("pv1InputVoltage")),
        pv1ChargingPower: num(valueOf("pv1ChargingPower")),
        batteryVoltage: num(valueOf("batteryVoltage")),
        batteryCapacity: num(valueOf("batteryCapacity")),
        batteryChargingCurrent: num(valueOf("batteryChargingCurrent")),
        batteryDischargeCurrent: num(valueOf("batteryDischargeCurrent")),
        ac1OutputVoltage: num(valueOf("ac1OutputVoltage")),
        ac1OutputFrequency: num(valueOf("ac1OutputFrequency")),
        ac1OutputApparentPower: num(valueOf("ac1OutputApparentPower")),
        acOutputActivePower: num(valueOf("acOutputActivePower")),
        outputLoadPercent: num(valueOf("outputLoadPercent")),
        ac2OutputStatus: str(valueOf("ac2OutputStatus")),
        batteryReChargeVoltage: num(valueOf("batteryReChargeVoltage")),
        batteryBulkVoltage: num(valueOf("batteryBulkVoltage")),
        batteryFloatVoltage: num(valueOf("batteryFloatVoltage")),
        batteryType: str(valueOf("batteryType")),
        maxAcChargingCurrent: num(valueOf("maxAcChargingCurrent")),
        maxChargingCurrent: num(valueOf("maxChargingCurrent")),
        acInputRange: str(valueOf("acInputRange")),
        outputSourcePriority: str(valueOf("outputSourcePriority")),
        chargerSourcePriority: str(valueOf("chargerSourcePriority")),
        parallelMaxNum: str(valueOf("parallelMaxNum")),
        batteryReDischargeVoltage: num(valueOf("batteryReDischargeVoltage")),
        busVoltage: num(valueOf("busVoltage")),
        pv1InputCurrent: num(valueOf("pv1InputCurrent")),
        batteryVoltageFromScc: num(valueOf("batteryVoltageFromScc")),
        loadStatus: str(valueOf("loadStatus")),
        solarFeedToGridPower: num(valueOf("solarFeedToGridPower")),
        pv2InputCurrent: num(valueOf("pv2InputCurrent")),
        model: str(valueOf("model")),
        totalGeneration: num(valueOf("totalGeneration")),
      };
    });
  };
}
