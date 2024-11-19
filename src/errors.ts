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
import { ERROR_DESCRIPTION_OVERRIDE, LedgerCustomError, LedgerError } from './consts'

/**
 * Converts a Ledger error code to a human-readable string.
 *
 * @param returnCode - The Ledger error code to convert.
 * @param customErrorList - Custom error description list to convert error code with.
 * @returns A string describing the error code.
 */
export function errorCodeToString(returnCode: LedgerError, customErrorList?: Record<LedgerCustomError, string>): string {
  const returnCodeStr = returnCode.toString(16).toUpperCase()
  let errDescription = `Unknown Return Code: 0x${returnCodeStr}`

  if (returnCode in ERROR_DESCRIPTION_OVERRIDE) {
    return ERROR_DESCRIPTION_OVERRIDE[returnCode]
  }

  if (customErrorList && returnCode in customErrorList) {
    return customErrorList[returnCode]
  }

  return errDescription
}
