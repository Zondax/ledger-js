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
import { ERROR_DESCRIPTION_OVERRIDE, LedgerError } from './consts'
import { ResponsePayload } from './payload'
import { ResponseError } from './responseError'

/**
 * Converts a Ledger error code to a human-readable string.
 *
 * @param returnCode - The Ledger error code to convert.
 * @returns A string describing the error code.
 */
export function errorCodeToString(returnCode: LedgerError): string {
  const returnCodeStr = returnCode.toString(16).toUpperCase()
  let errDescription = `Unknown Return Code: 0x${returnCodeStr}`

  if (returnCode in ERROR_DESCRIPTION_OVERRIDE) {
    errDescription = ERROR_DESCRIPTION_OVERRIDE[returnCode]
  }

  return errDescription
}

/**
 * Checks if a value is a dictionary (i.e., a plain object).
 *
 * @param v - The value to check.
 * @returns True if the value is a dictionary, false otherwise.
 */
function isDict(v: any): boolean {
  return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date)
}

/**
 * Processes the raw response from a device to extract either the payload or error information.
 * It reads the last two bytes of the response to determine the return code and constructs
 * an appropriate response object based on this code. If the return code indicates no errors,
 * the payload is returned directly. Otherwise, an error object is thrown.
 *
 * @param responseRaw - The raw response buffer from the device, potentially containing error codes or data.
 * @returns The payload as a buffer if no errors are found.
 * @throws {ResponseError} An object detailing the error if any is found.
 */
export function processResponse(responseRaw: Buffer): ResponsePayload {
  // Ensure the buffer is large enough to contain a return code
  if (responseRaw.length < 2) {
    throw ResponseError.fromReturnCode(LedgerError.EmptyBuffer)
  }

  // Determine the return code from the last two bytes of the response
  const returnCode = responseRaw.readUInt16BE(responseRaw.length - 2)
  let errorMessage = errorCodeToString(returnCode)

  // Isolate the payload (all bytes except the last two)
  const payload = responseRaw.subarray(0, responseRaw.length - 2)

  // Directly return the payload if there are no errors
  if (returnCode === LedgerError.NoErrors) {
    return new ResponsePayload(payload)
  }

  // Append additional error message from payload if available
  if (payload.length > 0) {
    errorMessage += ` : ${payload.toString('ascii')}`
  }

  // Construct and throw an error object with details
  throw {
    returnCode: returnCode,
    errorMessage: errorMessage,
  } as ResponseError
}

/**
 * Processes error responses and formats them into a standardized object.
 * This function is deprecated and should not be used in new implementations.
 *
 * @param response - The raw response object that may contain error details.
 * @returns A standardized error response object.
 */
export function processErrorResponse(response: any): ResponseError {
  if (isDict(response)) {
    if (Object.prototype.hasOwnProperty.call(response, 'statusCode')) {
      return ResponseError.fromReturnCode(response.statusCode)
    }

    if (Object.prototype.hasOwnProperty.call(response, 'returnCode') && Object.prototype.hasOwnProperty.call(response, 'errorMessage')) {
      return response
    }
  }

  // If response is not a dictionary or does not contain the expected properties, handle as unknown error
  return ResponseError.fromReturnCode(LedgerError.UnknownTransportError)
}
