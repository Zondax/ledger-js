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
import { errorCodeToString } from './errors'

/**
 * Class representing a response error.
 * Extends the built-in Error class to include additional properties.
 */
export class ResponseError extends Error {
  errorMessage: string
  returnCode: number

  /**
   * Creates an instance of ResponseError.
   * @param returnCode - The return code associated with the error.
   * @param errorMessage - The error message describing the error.
   */
  constructor(returnCode: number, errorMessage: string) {
    super(errorMessage)
    this.errorMessage = errorMessage
    this.returnCode = returnCode
  }

  /**
   * Creates a ResponseError instance from a return code.
   * @param returnCode - The return code to convert into a ResponseError.
   * @returns A new instance of ResponseError.
   */
  static fromReturnCode(returnCode: number): ResponseError {
    return new ResponseError(returnCode, errorCodeToString(returnCode))
  }
}
