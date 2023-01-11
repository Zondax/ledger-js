export interface ResponseBase {
  errorMessage: string;
  returnCode: number;
}

export interface ResponseVersion extends ResponseBase {
  deviceLocked?: boolean;
  major?: number;
  minor?: number;
  patch?: number;
  testMode?: boolean;
  targetId?: string;
}

export interface ResponseAppInfo extends ResponseBase {
  appName?: string;
  appVersion?: string;
  flagLen?: number;
  flagsValue?: number;
  flagRecovery?: boolean;
  flagSignedMcuCode?: boolean;
  flagOnboarded?: boolean;
  flagPINValidated?: boolean;
}

export interface ResponseDeviceInfo extends ResponseBase {
  targetId?: string;
  seVersion?: string;
  flag?: string;
  mcuVersion?: string;
}

export interface INSGeneric {
  GET_VERSION: 0x00;
  [k: string]: number;
}

export interface P1_VALUESGeneric {
  ONLY_RETRIEVE: number;
  SHOW_ADDRESS_IN_DEVICE: number;
  [k: string]: number;
}

export interface ConstructorParams {
  cla: number;
  ins: INSGeneric;
  p1Values: P1_VALUESGeneric;
  acceptedPathLengths?: number[];
}
