import Transport from "@ledgerhq/hw-transport";

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

export interface LedgerApp {
  new(transport: Transport): LedgerApp;

  getVersion(): Promise<ResponseVersion>;
  getAppInfo(): Promise<ResponseAppInfo>;
}
