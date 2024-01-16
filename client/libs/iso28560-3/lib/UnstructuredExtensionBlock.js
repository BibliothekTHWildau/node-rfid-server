import Utils from './Utils.js';

export default class UnstructuredExtensionBlock {

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

  getDataBlockID() {
    return this.DataBlockID
  }


  get ExtensionBlock2ByteArray() {
    //console.log("UnstructuredExtensionBlock")
    let length = 4;

    //console.log("length shall be: ",length)
    let block = new Uint8Array(length);

    block[0] = length;
    
    // 65535 -> 0xFF 0xFF
    block[1] = this.DataBlockID & 0xFF;
    block[2] = this.DataBlockID >> 8;

    block[3] = 0x00;
    return block;
    //return super.getExtensionBlockToByteArray([])

  }

}