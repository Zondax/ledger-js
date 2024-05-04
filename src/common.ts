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
import { ERROR_DESCRIPTION, LedgerError } from './consts'
import { type ResponseBase } from './types'

export function errorCodeToString(returnCode: LedgerError): string {
  if (returnCode in ERROR_DESCRIPTION) return ERROR_DESCRIPTION[returnCode]
  return `Unknown Return Code: 0x${returnCode.toString(16).toUpperCase()}`
}

function isDict(v: any): boolean {
  return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date)
}

/**
 * Processes error responses and formats them into a standardized object.
 * @param response - The raw response object that may contain error details.
 * @returns A standardized error response object.
 */
export function processErrorResponse(response: any): ResponseBase {
  if (isDict(response)) {
    if (Object.prototype.hasOwnProperty.call(response, 'statusCode')) {
      return {
        returnCode: response.statusCode,
        errorMessage: errorCodeToString(response.statusCode),
      }
    } else if (
      Object.prototype.hasOwnProperty.call(response, 'returnCode') &&
      Object.prototype.hasOwnProperty.call(response, 'errorMessage')
    ) {
      return response
    }
  }

  // If response is not a dictionary or does not contain the expected properties, handle as unknown error
  const unknownStatusCode = LedgerError.UnknownTransportError
  return {
    returnCode: unknownStatusCode,
    errorMessage: errorCodeToString(unknownStatusCode),
  }
}
