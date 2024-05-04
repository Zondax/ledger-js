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

// Payload types for transactions
export const PAYLOAD_TYPE: Readonly<Record<string, number>> = {
  INIT: 0x00,
  ADD: 0x01,
  LAST: 0x02,
}

// Ledger error codes and descriptions
export const enum LedgerError {
  U2FUnknown = 1,
  U2FBadRequest = 2,
  U2FConfigurationUnsupported = 3,
  U2FDeviceIneligible = 4,
  U2FTimeout = 5,
  Timeout = 14,
  NoErrors = 0x9000,
  DeviceIsBusy = 0x9001,
  ErrorDerivingKeys = 0x6802,
  ExecutionError = 0x6400,
  WrongLength = 0x6700,
  EmptyBuffer = 0x6982,
  OutputBufferTooSmall = 0x6983,
  DataIsInvalid = 0x6984,
  ConditionsNotSatisfied = 0x6985,
  TransactionRejected = 0x6986,
  BadKeyHandle = 0x6a80,
  InvalidP1P2 = 0x6b00,
  InstructionNotSupported = 0x6d00,
  AppDoesNotSeemToBeOpen = 0x6e01,
  UnknownError = 0x6f00,
  SignVerifyError = 0x6f01,
  UnknownTransportError = 0xffff,
}

export const ERROR_DESCRIPTION: Readonly<Record<LedgerError, string>> = {
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
  [LedgerError.ConditionsNotSatisfied]: 'Conditions not satisfied',
  [LedgerError.TransactionRejected]: 'Transaction rejected',
  [LedgerError.BadKeyHandle]: 'Bad key handle',
  [LedgerError.InvalidP1P2]: 'Invalid P1/P2',
  [LedgerError.InstructionNotSupported]: 'Instruction not supported',
  [LedgerError.AppDoesNotSeemToBeOpen]: 'App does not seem to be open',
  [LedgerError.UnknownError]: 'Unknown error',
  [LedgerError.SignVerifyError]: 'Sign/verify error',
  [LedgerError.UnknownTransportError]: 'Unknown transport error',
}
