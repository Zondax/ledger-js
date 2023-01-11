import Transport from "@ledgerhq/hw-transport";
import { errorCodeToString, processErrorResponse } from "./common";
import { LedgerError } from "./consts";
import {
  ConstructorParams,
  INSGeneric,
  P1_VALUESGeneric,
  ResponseAppInfo,
  ResponseDeviceInfo,
  ResponseVersion,
} from "./types";

export default class GenericApp {
  readonly transport: Transport;
  readonly CLA: number;
  readonly INS: INSGeneric;
  readonly P1_VALUES: P1_VALUESGeneric;
  readonly acceptedPathLengths?: number[];

  constructor(transport: Transport, params: ConstructorParams) {
    this.transport = transport;
    this.CLA = params.cla;
    this.INS = params.ins;
    this.P1_VALUES = params.p1Values;
    this.acceptedPathLengths = params.acceptedPathLengths;
  }

  serializePath(path: string): Buffer {
    const HARDENED = 0x80000000;

    if (!path.startsWith("m/")) throw new Error('Path should start with "m/" (e.g "m/44\'/5757\'/5\'/0/3")');

    const pathArray = path.split("/");
    pathArray.shift(); // remove "m"

    if (this.acceptedPathLengths !== undefined && !this.acceptedPathLengths.includes(pathArray.length))
      throw new Error("Invalid path. (e.g \"m/44'/5757'/5'/0/3\")");

    const buf = Buffer.alloc(4 * pathArray.length);

    for (let i = 0; i < pathArray.length; i++) {
      let child = pathArray[i];
      let value = 0;
      if (child.endsWith("'")) {
        value += HARDENED;
        child = child.slice(0, -1);
      }
      const numChild = Number(child);

      if (Number.isNaN(numChild)) throw new Error(`Invalid path : ${child} is not a number. (e.g "m/44'/461'/5'/0/3")`);
      if (numChild >= HARDENED) throw new Error("Incorrect child value (bigger or equal to 0x80000000)");

      value += numChild;
      buf.writeUInt32LE(value, 4 * i);
    }
    return buf;
  }

  async getVersion(): Promise<ResponseVersion> {
    const versionResponse: ResponseVersion = await this.transport
      .send(this.CLA, this.INS.GET_VERSION, 0, 0)
      .then((res: Buffer) => {
        const errorCodeData = res.subarray(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
        let targetId = 0;
        if (res.length >= 9) targetId = (res[5] << 24) + (res[6] << 16) + (res[7] << 8) + (res[8] << 0);
        return {
          returnCode,
          errorMessage: errorCodeToString(returnCode),
          testMode: res[0] !== 0,
          major: res[1],
          minor: res[2],
          patch: res[3],
          deviceLocked: res[4] === 1,
          targetId: targetId.toString(16),
        };
      }, processErrorResponse);
    return versionResponse;
  }

  async appInfo(): Promise<ResponseAppInfo> {
    const response: ResponseAppInfo = await this.transport.send(0xb0, 0x01, 0, 0).then((response: Buffer) => {
      const errorCodeData = response.subarray(-2);
      const returnCode: number = errorCodeData[0] * 256 + errorCodeData[1];

      if (response[0] !== 1) {
        // Ledger responds with format ID 1. There is no spec for any format != 1
        return {
          returnCode: 0x9001,
          errorMessage: "Format ID not recognized",
        };
      }
      const appNameLen = response[1];
      const appName = response.subarray(2, 2 + appNameLen).toString("ascii");
      let idx = 2 + appNameLen;
      const appVersionLen = response[idx];
      idx += 1;
      const appVersion = response.subarray(idx, idx + appVersionLen).toString("ascii");
      idx += appVersionLen;
      const flagLen = response[idx];
      idx += 1;
      const flagsValue = response[idx];
      return {
        returnCode,
        errorMessage: errorCodeToString(returnCode),
        appName,
        appVersion,
        flagLen,
        flagsValue,
        flagRecovery: (flagsValue & 1) !== 0,
        flagSignedMcuCode: (flagsValue & 2) !== 0,
        flagOnboarded: (flagsValue & 4) !== 0,
        flagPINValidated: (flagsValue & 128) !== 0,
      };
    }, processErrorResponse);
    return response;
  }

  async deviceInfo(): Promise<ResponseDeviceInfo> {
    const response: ResponseDeviceInfo = await this.transport
      .send(0xe0, 0x01, 0, 0, Buffer.from([]), [LedgerError.NoErrors, 0x6e00])
      .then((response: Buffer) => {
        const errorCodeData = response.subarray(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

        if (returnCode === 0x6e00) {
          const res: ResponseDeviceInfo = {
            returnCode,
            errorMessage: "This command is only available in the Dashboard",
          };
          return res;
        }

        const targetId = response.subarray(0, 4).toString("hex");

        let pos = 4;
        const secureElementVersionLen = response[pos];
        pos += 1;
        const seVersion = response.subarray(pos, pos + secureElementVersionLen).toString();
        pos += secureElementVersionLen;

        const flagsLen = response[pos];
        pos += 1;
        const flag = response.subarray(pos, pos + flagsLen).toString("hex");
        pos += flagsLen;

        const mcuVersionLen = response[pos];
        pos += 1;
        // Patch issue in mcu version
        let tmp = response.subarray(pos, pos + mcuVersionLen);
        if (tmp[mcuVersionLen - 1] === 0) {
          tmp = response.subarray(pos, pos + mcuVersionLen - 1);
        }
        const mcuVersion = tmp.toString();

        return {
          returnCode,
          errorMessage: errorCodeToString(returnCode),
          targetId,
          seVersion,
          flag,
          mcuVersion,
        };
      }, processErrorResponse);
    return response;
  }
}
