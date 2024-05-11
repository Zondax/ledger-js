import { errorCodeToString } from './common'

export class ResponseError extends Error {
  errorMessage: string
  returnCode: number

  constructor(returnCode: number, errorMessage: string) {
    super(errorMessage)
    this.errorMessage = errorMessage
    this.returnCode = returnCode
    this.name = 'ResponseReturnCode'
  }

  static fromReturnCode(returnCode: number): ResponseError {
    return new ResponseError(returnCode, errorCodeToString(returnCode))
  }
}
