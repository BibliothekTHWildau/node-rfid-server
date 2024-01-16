'use strict'

/**
 * https://stackoverflow.com/a/18729931
 * https://gist.github.com/joni/3760795
 * @param {*} str 
 * @returns 
 */
function toUTF8Array(str) {
  var utf8 = [];
  for (var i = 0; i < str.length; i++) {
    var charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6),
        0x80 | (charcode & 0x3f));
    }
    else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f));
    }
    // surrogate pair
    else {
      i++;
      // UTF-16 encodes 0x10000-0x10FFFF by
      // subtracting 0x10000 and splitting the
      // 20 bits of 0x0-0xFFFFF into two halves
      charcode = 0x10000 + (((charcode & 0x3ff) << 10)
        | (str.charCodeAt(i) & 0x3ff))
      utf8.push(0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f));
    }
  }
  return utf8;
}

/**
 * https://weblog.rogueamoeba.com/2017/02/27/javascript-correctly-converting-a-byte-array-to-a-utf-8-string/
 * @param {*} data 
 * @returns 
 */
function stringFromUTF8Array(data) {
  const extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
  var count = data.length;
  var str = "";

  for (var index = 0; index < count;) {
    var ch = data[index++];
    if (ch & 0x80) {
      var extra = extraByteMap[(ch >> 3) & 0x07];
      if (!(ch & 0x40) || !extra || ((index + extra) > count))
        return null;

      ch = ch & (0x3F >> extra);
      for (; extra > 0; extra -= 1) {
        var chx = data[index++];
        if ((chx & 0xC0) != 0x80)
          return null;

        ch = (ch << 6) | (chx & 0x3F);
      }
    }

    str += String.fromCharCode(ch);
  }

  return str;
}


function getByteArrayFromStringWithEscape(str) {
  var utf8 = unescape(encodeURIComponent(str));

  var arr = [];
  for (var i = 0; i < utf8.length; i++) {
    arr.push(utf8.charCodeAt(i));
  }
  return arr;
}

function getByteArrayFromStringWithTextEncoder(str) {
  return new TextEncoder().encode(str);
}

function getStringFromByteArrayWithTextDecoder(byteArray) {
  let tmp = new Uint8Array(byteArray);
  return new TextDecoder("utf-8").decode(tmp);
}

/**
   * returns data printed in blockstyle
   * @param {*} data 
   */
function prettyPrint(data, blockSize = 4) {
  console.log(data, "pretty");
  let r = 0;
  //let row = 0;
  let out = "";
  for (let d = 0; d < data.length; d++) {
    if (d % blockSize == 0) {
      out += ("  " + (r++)).slice(-3) + " ";
    }
    out += ("0" + data[d].toString(16)).slice(-2) + " ";
    if ((d + 1) % blockSize == 0) {
      out += "\n";
    }
  }
  return out;
}

/**
 * https://stackoverflow.com/a/59004347
 * @param {*} x 
 * @returns 
 */
function isArrayOrTypedArray(x) {
  return Boolean(Array.isArray(x) || (ArrayBuffer.isView(x) && !(x instanceof DataView)));
}

export default {
  stringToByteArray: getByteArrayFromStringWithTextEncoder,
  byteArrayToString: getStringFromByteArrayWithTextDecoder,
  getByteArrayFromStringWithTextEncoder,
  getStringFromByteArrayWithTextDecoder,
  toUTF8Array,
  getByteArrayFromStringWithEscape,
  stringFromUTF8Array,
  prettyPrint,
  isArrayOrTypedArray
}
//module.exports = { toUTF8Array : toUTF8Array };