import Transport from "@ledgerhq/hw-transport";

export enum PAYLOAD_TYPE {
  INIT= 0x00,
  ADD= 0x01,
  LAST= 0x02,
}

export enum P1_VALUES {
  ONLY_RETRIEVE= 0x00,
  SHOW_ADDRESS_IN_DEVICE= 0x01,
}

export const ERROR_DESCRIPTION : { [code: number]: string };

export interface ResponseBase {
  errorMessage: string;
  returnCode: number;
}

export interface ResponseVersion extends ResponseBase {
  testMode: boolean;
  major: number;
  minor: number;
  patch: number;
  deviceLocked: boolean;
  targetId: string;
}

export interface ResponseAppInfo extends ResponseBase {
  appName: string;
  appVersion: string;
  flagLen: number;
  flagsValue: number;
  flagRecovery: boolean;
  flagSignedMcuCode: boolean;
  flagOnboarded: boolean;
  flagPINValidated: boolean;
}

export function errorCodeToString(statusCode: number): string;
export function processErrorResponse(response: any): any;
export function serializePath(path: any): string;
export function printBIP44Path(pathArray: any): string;

export interface LedgerApp {
  new(transport: Transport): LedgerApp;

  getVersion(): Promise<ResponseVersion>;
  getAppInfo(): Promise<ResponseAppInfo>;
}
