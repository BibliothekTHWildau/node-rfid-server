//const crc16 = require('./polycrc.js').crc(16, 0x1021, 0xFFFF, 0x0000, false);
import POLYCRC from './polycrc.js';
import Utils from './Utils.js';

export default class BasicBlock {
  
  constructor(data) {
    //this.truncatedBasicBlock = false;

    this.ContentParameter = null;
    this.TypeOfUsage = null;
    this.partNumber = null;
    this.partsInItem = null;
    this.PrimaryItemIdentifier = null;
    this.crc = null;
    this.ISIL = null;

    if (Utils.isArrayOrTypedArray(data)) {
      console.log("BasicBlock from byte: ",data)
      // byte to JSON
      
      let endPos = 34;
      if (data.length <= 32){
        endPos = 32;
        this.setTruncatedBasicBlock(true);
      }

      this.ContentParameter = data[0] >> 4;
      this.TypeOfUsage = data[0] & 0x0f;
      this.partsInItem = data[1];
      this.partNumber = data[2];
      
      let tmp = data.slice(3,19);
      if (tmp.indexOf(0) > -1)
        tmp = tmp.slice(0,tmp.indexOf(0));
      this.PrimaryItemIdentifier  = Utils.byteArrayToString(tmp).replace(/ /g,"");
      
      tmp = data.slice(21,endPos);
      if (tmp.indexOf(0) > -1)
        tmp = tmp.slice(0,tmp.indexOf(0));
      this.ISIL =  Utils.byteArrayToString(tmp);
     
      // verify checksum copy data to checksum array and take out crc bytes, fill up with 0x00 to length = 32
      let crcblock = data.slice(0,endPos);
      crcblock.splice(19,2);
      while (crcblock.length < 32){
        crcblock.push(0x00);// = [...crcblock, 0x00];
      }
      
      // generate crc from checksum array which has to be in unsinged 8bit int
      let crc16 = POLYCRC(16, 0x1021, 0xFFFF, 0x0000, false);
      let crc = crc16(new Uint8Array(crcblock));
      //console.log(data[19]& 0xFF ,data[20] & 0xFF)
      //console.log(crc & 0xFF,crc >> 8 & 0xFF)
      this.crcError = !( (crc & 0xFF) === (data[19] & 0xFF) && (crc >> 8 & 0xFF) === (data[20] & 0xFF));
      
    } else {
      // json to byte
      this.ContentParameter = data.basicBlock.contentParameter || data.basicBlock.ContentParameter;
      this.TypeOfUsage = data.basicBlock.TypeOfUsage || data.basicBlock.typeOfUsage;
      this.partNumber = data.basicBlock.PartNumber || data.basicBlock.partNumber;
      this.partsInItem = data.basicBlock.PartsInItem || data.basicBlock.partsInItem;
      this.PrimaryItemIdentifier = data.basicBlock.PrimaryItemIdentifier || data.basicBlock.primaryItemIdentifier;
      this.ISIL = data.basicBlock.ISIL;      
    }

  }

  getBasicBlockByte(truncatedBasicBlock = false){
    //console.log("BasicBlock getBasicBlockByte");

    let size = truncatedBasicBlock ? 32 : 34;
    if (truncatedBasicBlock) console.log("BasicBlock will be truncated in size")
    
    let block = new Uint8Array(size); 
    
    block[0] = ((this.ContentParameter << 4) | this.TypeOfUsage);
    block[1] = this.partsInItem;
    block[2] = this.partNumber;
    
    let index = 3;
    let tmp = Utils.stringToByteArray(this.PrimaryItemIdentifier);
    for (let i = 0; i <= 15; i++) {      
      if (i >= tmp.length)
        break;
      block[index++] = tmp[i];
    }

    index = 21;
    tmp = Utils.stringToByteArray(this.ISIL);
    for (let i = 0; i < truncatedBasicBlock ? 11 : 13; i++) {
      if (i >= tmp.length)
        break;
      
      block[index++] = tmp[i];
      
    }

    // checksum
    let crcblock = new Uint8Array(32);//ArrayBuffer(32);
    
    // skip crc from checksum 
    let srcIndex = 0;
    for (let j = 0; j < 32; j++){
      if (srcIndex == 19)
        srcIndex+=2;
      crcblock[j] = block[srcIndex] || 0x00
      srcIndex++;
    }
    //console.log("crcblock");
    //console.log(crcblock);
    let crc16 = POLYCRC(16, 0x1021, 0xFFFF, 0x0000, false);
    let crc = crc16(crcblock);
    //console.log(crc & 0xFF);
    block[19] = crc & 0xFF;
    //console.log(crc >> 8 & 0xFF)
    block[20] = crc >> 8 & 0xFF;

        
    
   /* block[0] = (byte) ((getContentParameter() << 4) | getTypeOfUsage());
    block[1] = (byte) getPartsInItem();
    block[2] = (byte) getPartNumber();

    byte[] temp = getPrimaryItemIdentifier().getBytes();
    for (int i = 3; i <= 3 + 15; i++) {
      if (i - 3 < temp.length) {
        block[i] = temp[i - 3];
      }
    }
    
    temp = getISIL().getBytes();
    for (int i = 21; i < block.length; i++) {
      if (i - 21 < temp.length) {
        block[i] = temp[i - 21];
      }
    }

    // optional data blocks start here
    //int optStart = 21 + temp.length;

    int crc = TagCRC(block);
    // Binary encoding with the lsb stored at the lowest memory location
    byte[] crcbytes = new byte[]{(byte) (crc & 0xFF), (byte) (crc >> 8 & 0xFF)};
    block[19] = crcbytes[0];
    block[20] = crcbytes[1];*/
    return block;
  }  

  get isTruncatedBasicBlock(){
    return this.truncatedBasicBlock;
  }

  setTruncatedBasicBlock(truncated){
    this.truncatedBasicBlock = truncated;
  }
}