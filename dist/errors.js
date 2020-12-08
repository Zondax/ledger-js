"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.errorCodeToString = errorCodeToString;
exports.processErrorResponse = processErrorResponse;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

/** ******************************************************************************
 *  (c) 2019-2020 Zondax GmbH
 *  (c) 2016-2017 Ledger
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
 ******************************************************************************* */
var ERROR_DESCRIPTION = {
  1: "U2F: Unknown",
  2: "U2F: Bad request",
  3: "U2F: Configuration unsupported",
  4: "U2F: Device Ineligible",
  5: "U2F: Timeout",
  14: "Timeout",
  0x9000: "No errors",
  0x9001: "Device is busy",
  0x6802: "Error deriving keys",
  0x6400: "Execution Error",
  0x6700: "Wrong Length",
  0x6982: "Empty Buffer",
  0x6983: "Output buffer too small",
  0x6984: "Data is invalid",
  0x6985: "Conditions not satisfied",
  0x6986: "Transaction rejected",
  0x6a80: "Bad key handle",
  0x6b00: "Invalid P1/P2",
  0x6d00: "Instruction not supported",
  0x6e00: "App does not seem to be open",
  0x6f00: "Unknown error",
  0x6f01: "Sign/verify error"
};

function errorCodeToString(statusCode) {
  if (statusCode in ERROR_DESCRIPTION) return ERROR_DESCRIPTION[statusCode];
  return "Unknown Status Code: ".concat(statusCode);
}

function isDict(v) {
  return (0, _typeof2.default)(v) === "object" && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

function processErrorResponse(response) {
  if (response) {
    if (isDict(response)) {
      if (Object.prototype.hasOwnProperty.call(response, "statusCode")) {
        return {
          returnCode: response.statusCode,
          errorMessage: errorCodeToString(response.statusCode)
        };
      }

      if (Object.prototype.hasOwnProperty.call(response, "returnCode") && Object.prototype.hasOwnProperty.call(response, "errorMessage")) {
        return response;
      }
    }

    return {
      returnCode: 0xffff,
      errorMessage: response.toString()
    };
  }

  return {
    returnCode: 0xffff,
    errorMessage: response.toString()
  };
}