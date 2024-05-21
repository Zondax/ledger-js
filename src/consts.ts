/******************************************************************************
 *  (c) 2018 - 2024 Zondax AG
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *****************************************************************************/

export const HARDENED = 0x80000000

export const LEDGER_DASHBOARD_CLA = 0xb0

// Payload types for transactions
export const PAYLOAD_TYPE: Readonly<Record<string, number>> = {
  INIT: 0x00,
  ADD: 0x01,
  LAST: 0x02,
}

// Ledger error codes and descriptions sorted by value
export enum LedgerError {
  U2FUnknown = 1,
  U2FBadRequest = 2,
  U2FConfigurationUnsupported = 3,
  U2FDeviceIneligible = 4,
  U2FTimeout = 5,
  Timeout = 14,
  GpAuthFailed = 0x6300,
  PinRemainingAttempts = 0x63c0,
  ExecutionError = 0x6400,
  WrongLength = 0x6700,
  IncorrectLength = 0x6700,
  MissingCriticalParameter = 0x6800,
  ErrorDerivingKeys = 0x6802,
  EmptyBuffer = 0x6982,
  SecurityStatusNotSatisfied = 0x6982,
  OutputBufferTooSmall = 0x6983,
  DataIsInvalid = 0x6984,
  ConditionsOfUseNotSatisfied = 0x6985,
  CommandIncompatibleFileStructure = 0x6981,
  TransactionRejected = 0x6986,
  BadKeyHandle = 0x6a80,
  IncorrectData = 0x6a80,
  ReferencedDataNotFound = 0x6a88,
  NotEnoughMemorySpace = 0x6a84,
  FileAlreadyExists = 0x6a89,
  InvalidP1P2 = 0x6b00,
  IncorrectP1P2 = 0x6b00,
  InstructionNotSupported = 0x6d00,
  InsNotSupported = 0x6d00,
  UnknownApdu = 0x6d02,
  DeviceNotOnboarded = 0x6d07,
  DeviceNotOnboarded2 = 0x6611,
  CustomImageBootloader = 0x662f,
  CustomImageEmpty = 0x662e,
  AppDoesNotSeemToBeOpen = 0x6e01,
  ClaNotSupported = 0x6e00,
  Licensing = 0x6f42,
  UnknownError = 0x6f00,
  TechnicalProblem = 0x6f00,
  SignVerifyError = 0x6f01,
  Halted = 0x6faa,
  NoErrors = 0x9000,
  DeviceIsBusy = 0x9001,
  UnknownTransportError = 0xffff,
  AccessConditionNotFulfilled = 0x9804,
  AlgorithmNotSupported = 0x9484,
  CodeBlocked = 0x9840,
  CodeNotInitialized = 0x9802,
  ContradictionInvalidation = 0x9810,
  ContradictionSecretCodeStatus = 0x9808,
  InvalidKcv = 0x9485,
  InvalidOffset = 0x9402,
  LockedDevice = 0x5515,
  MaxValueReached = 0x9850,
  MemoryProblem = 0x9240,
  NoEfSelected = 0x9400,
  InconsistentFile = 0x9408,
  FileNotFound = 0x9404,
  UserRefusedOnDevice = 0x5501,
  NotEnoughSpace = 0x5102,

  GenericError = 0xffffffff,
}

export const ERROR_DESCRIPTION_OVERRIDE: Readonly<Record<LedgerError, string>> = {
  [LedgerError.U2FUnknown]: 'U2F: Unknown',
  [LedgerError.U2FBadRequest]: 'U2F: Bad request',
  [LedgerError.U2FConfigurationUnsupported]: 'U2F: Configuration unsupported',
  [LedgerError.U2FDeviceIneligible]: 'U2F: Device Ineligible',
  [LedgerError.U2FTimeout]: 'U2F: Timeout',
  [LedgerError.Timeout]: 'Timeout',
  [LedgerError.NoErrors]: 'No errors',
  [LedgerError.DeviceIsBusy]: 'Device is busy',
  [LedgerError.ErrorDerivingKeys]: 'Error deriving keys',
  [LedgerError.ExecutionError]: 'Execution Error',
  [LedgerError.WrongLength]: 'Wrong Length',
  [LedgerError.EmptyBuffer]: 'Empty Buffer',
  [LedgerError.OutputBufferTooSmall]: 'Output buffer too small',
  [LedgerError.DataIsInvalid]: 'Data is invalid',
  [LedgerError.TransactionRejected]: 'Transaction rejected',
  [LedgerError.BadKeyHandle]: 'Bad key handle',
  [LedgerError.InvalidP1P2]: 'Invalid P1/P2',
  [LedgerError.InstructionNotSupported]: 'Instruction not supported',
  [LedgerError.AppDoesNotSeemToBeOpen]: 'App does not seem to be open',
  [LedgerError.UnknownError]: 'Unknown error',
  [LedgerError.SignVerifyError]: 'Sign/verify error',
  [LedgerError.UnknownTransportError]: 'Unknown transport error',
  [LedgerError.GpAuthFailed]: 'GP Authentication Failed',
  [LedgerError.PinRemainingAttempts]: 'PIN Remaining Attempts',
  [LedgerError.MissingCriticalParameter]: 'Missing Critical Parameter',
  [LedgerError.ConditionsOfUseNotSatisfied]: 'Conditions of Use Not Satisfied',
  [LedgerError.CommandIncompatibleFileStructure]: 'Command Incompatible with File Structure',
  [LedgerError.ReferencedDataNotFound]: 'Referenced Data Not Found',
  [LedgerError.NotEnoughMemorySpace]: 'Not Enough Memory Space',
  [LedgerError.FileAlreadyExists]: 'File Already Exists',
  [LedgerError.UnknownApdu]: 'Unknown APDU',
  [LedgerError.DeviceNotOnboarded]: 'Device Not Onboarded',
  [LedgerError.DeviceNotOnboarded2]: 'Device Not Onboarded (Secondary)',
  [LedgerError.CustomImageBootloader]: 'Custom Image Bootloader Error',
  [LedgerError.CustomImageEmpty]: 'Custom Image Empty',
  [LedgerError.ClaNotSupported]: 'CLA Not Supported',
  [LedgerError.Licensing]: 'Licensing Error',
  [LedgerError.Halted]: 'Device Halted',
  [LedgerError.AccessConditionNotFulfilled]: 'Access Condition Not Fulfilled',
  [LedgerError.AlgorithmNotSupported]: 'Algorithm Not Supported',
  [LedgerError.CodeBlocked]: 'Code Blocked',
  [LedgerError.CodeNotInitialized]: 'Code Not Initialized',
  [LedgerError.ContradictionInvalidation]: 'Contradiction Invalidation',
  [LedgerError.ContradictionSecretCodeStatus]: 'Contradiction with Secret Code Status',
  [LedgerError.InvalidKcv]: 'Invalid KCV',
  [LedgerError.InvalidOffset]: 'Invalid Offset',
  [LedgerError.LockedDevice]: 'Device Locked',
  [LedgerError.MaxValueReached]: 'Maximum Value Reached',
  [LedgerError.MemoryProblem]: 'Memory Problem',
  [LedgerError.NoEfSelected]: 'No EF Selected',
  [LedgerError.InconsistentFile]: 'Inconsistent File',
  [LedgerError.FileNotFound]: 'File Not Found',
  [LedgerError.UserRefusedOnDevice]: 'User Refused on Device',
  [LedgerError.NotEnoughSpace]: 'Not Enough Space',
  [LedgerError.GenericError]: 'Generic Error',
}
