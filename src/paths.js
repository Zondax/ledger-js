/** ******************************************************************************
 *  (c) 2019-2020 Zondax GmbH
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
const HARDENED = 0x80000000;

export function serializePath(path) {
  if (typeof path !== "string") {
    throw new Error("Path should be a string (e.g \"m/44'/1'/5'/0/3\")");
  }

  if (!path.startsWith("m")) {
    throw new Error('Path should start with "m" (e.g "m/44\'/461\'/5\'/0/3")');
  }

  const pathArray = path.split("/");

  if (pathArray.length !== 6) {
    throw new Error("Invalid path. (e.g \"m/44'/1'/5'/0/3\")");
  }

  const buf = Buffer.alloc(20);

  for (let i = 1; i < pathArray.length; i += 1) {
    let value = 0;
    let child = pathArray[i];
    if (child.endsWith("'")) {
      value += HARDENED;
      child = child.slice(0, -1);
    }

    const childNumber = Number(child);

    if (Number.isNaN(childNumber)) {
      throw new Error(`Invalid path : ${child} is not a number. (e.g "m/44'/1'/5'/0/3")`);
    }

    if (childNumber >= HARDENED) {
      throw new Error("Incorrect child value (bigger or equal to 0x80000000)");
    }

    value += childNumber;

    buf.writeUInt32LE(value, 4 * (i - 1));
  }

  return buf;
}

function printBIP44Item(v) {
  let hardened = v >= 0x8000000;
  return `${v & 0x7FFFFFFF}${hardened ? "'" : ""}`;
}

export function printBIP44Path(pathBytes) {
  if (pathBytes.length !== 20) {
    throw new Error("Invalid bip44 path");
  }

  let pathValues = [0, 0, 0, 0, 0];
  for (let i = 0; i < 5; i += 1) {
    pathValues[i] = pathBytes.readUInt32LE(4 * i);
    console.log(pathValues[i]);
  }

  return `m/${
    printBIP44Item(pathValues[0])
  }/${
    printBIP44Item(pathValues[1])
  }/${
    printBIP44Item(pathValues[2])
  }/${
    printBIP44Item(pathValues[3])
  }/${
    printBIP44Item(pathValues[4])
  }`;
}
