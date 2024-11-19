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
import { processErrorResponse } from './common'
import { LedgerCustomError, LedgerError } from './consts'
import { errorCodeToString } from './errors'
import { ResponseError } from './responseError'

describe('errorCodeToString', () => {
  it('should return the correct error message for a known error code', () => {
    const knownErrorCode: LedgerError = 0x9000
    const expectedMessage = 'No errors'
    expect(errorCodeToString(knownErrorCode)).toEqual(expectedMessage)
  })

  it('should return the correct error message for a custom error code', () => {
    const knownErrorCode: LedgerCustomError = 0xabcd
    const expectedMessage = 'test custom error'
    expect(errorCodeToString(knownErrorCode, { 0xabcd: expectedMessage })).toEqual(expectedMessage)
  })

  it('should return the correct error message for a known error code, when a custom error list is passed', () => {
    const knownErrorCode: LedgerError = 0x9000
    const expectedMessage = 'No errors'
    expect(errorCodeToString(knownErrorCode, { [knownErrorCode]: 'Custom no errors' })).toEqual(expectedMessage)
  })

  it('should return "Unknown Return Code" for an unknown error code', () => {
    const unknownErrorCode: LedgerError = 0x9999 as LedgerError
    const expectedMessage = 'Unknown Return Code: 0x9999'
    expect(errorCodeToString(unknownErrorCode)).toEqual(expectedMessage)
  })
})

describe('processErrorResponse', () => {
  it('should return correct response object when statusCode is present', () => {
    const response = { statusCode: 0x9000 }
    const expectedResponse = new ResponseError(0x9000, 'No errors')
    expect(processErrorResponse(response)).toEqual(expectedResponse)
  })

  it('should return the input as is when returnCode and errorMessage are present', () => {
    const response = { returnCode: 0x9000, errorMessage: 'Success' }
    expect(processErrorResponse(response)).toEqual(response)
  })

  it('should return a default error response when neither statusCode nor returnCode/errorMessage are present', () => {
    const response = { someOtherKey: 123 }
    const expectedResponse = ResponseError.fromReturnCode(LedgerError.UnknownTransportError)
    expect(processErrorResponse(response)).toEqual(expectedResponse)
  })
})
