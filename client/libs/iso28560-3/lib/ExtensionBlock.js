import Utils from './Utils.js';

export default class ExtensionBlock {


  #validBlock;

  constructor(data) {

    this.DataBlockID = null;

    if (Utils.isArrayOrTypedArray(data)) {
      // byte
      let length = data[0];

      this.DataBlockID = data[1] + (data[2] << 8);

      let checksum = 0x00;

      for (let i = 0; i < length; i++) {
        checksum ^= data[i] &0xFF;
        //console.log("generatedChecksum",checksum)
      }
      if (checksum == 0x00) {
        this.#validBlock = true;
      } else {
        this.#validBlock = false;
        //console.error("Extension block is invalid ", data)
      }

    } else {
      // json

      this.DataBlockID = data.DataBlockID || data.dataBlockID; 
    }

  }

  /*get ExtensionBlockByte() {

  }*/

  /**
   * parse given byte data into fields given as array of strings
   * @param {*} data 
   * @param {*} keys 
   */
  parseVariableLengthFields(data, keys) {

    if (!this.#validBlock)
      return console.error("extension block is not valid");

    console.log("super ExtensionBlock parseVariableLengthFields:", data , keys);
    
    let index = 0;
    let startIndex = index;
    let val = null;
    let key = null;
    while (index < data.length) {
      if (data[index] == 0x00) {
        // end of variable field
        //console.log("end", startIndex, index)
        val = Utils.byteArrayToString(data.slice(startIndex, index));
        key = keys.shift();
        console.log(`found '${val}' for key ${key}`);
        this[key] = val;
        //val = null;
        startIndex = index + 1;
      }
      index++;
    }
    key = keys.shift();
    val = Utils.byteArrayToString(data.slice(startIndex, index));
    console.log(`found '${val}' for key ${key}`);
    this[key] = val;
  }


  /**
   * 
   * @param {*} data 
   * @param {*} keys 
   */
  getExtensionBlockToByteArray(keys) {
    console.log("using new getExtensionBlockToByteArray ",keys)
    let length = 4;

    for (let key of keys) {
      length += this[key] != null ? Utils.stringToByteArray(this[key]).length + 1 : 1;
    }
    // remove length of 1 for last element
    length--;
    //console.log("length shall be: ",length)
    let block = new Uint8Array(length);

    block[0] = length;
    
    // 65535 -> 0xFF 0xFF
    //block[1] = this.DataBlockID;
    //block[2] = 0;//this.DataBlockID >>> 8;
    block[1] = this.DataBlockID & 0xFF;
    block[2] = this.DataBlockID >> 8;

    // block[3] is XOR

    let pos = 4;
    let truncatePos = 4;

    for (let j = 0; j < keys.length; j++) {
      console.log(j,keys[j])
      let key = keys[j];
      if (this[key] !== null) {
        let tmp = Utils.stringToByteArray(this[key]);
        //console.log("tmp",tmp)
        for (let i = 0; i < tmp.length; i++) {
          block[pos++] = tmp[i];
        }
        truncatePos = pos;
      }
      
      if (j + 1 < keys.length){
        console.log("append end block")
        block[pos++] = 0x00; // append end block
      } 
        
    }
    
    // truncate that extension block as values after truncatePos are null
    if (truncatePos != pos) {
      //console.log("truncatepos != pos", truncatePos, pos)
      block[0] = truncatePos;
      block = block.slice(0, truncatePos)
      // todo block = Arrays.copyOf(block, truncatePos);
    }

    // generate checksum
    let xor = 0x00;
    for (let i = 0; i < block.length; i++) {
      xor ^= block[i];
    }
    xor ^= 0x00;
    block[3] = xor;

    return block;
  }

  getDataBlockID() {
    return this.DataBlockID
  }

  /*get DataBlockID(){
    return this.DataBlockID;
  }
  set DataBlockID(id){
    this.DataBlockID = id
  }*/



}