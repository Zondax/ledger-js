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
