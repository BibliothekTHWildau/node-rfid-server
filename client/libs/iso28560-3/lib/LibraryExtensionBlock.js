import ExtensionBlock from './ExtensionBlock.js';
import Utils from './Utils.js';

export default class LibraryExtensionBlock extends ExtensionBlock {

  constructor(data) {

    super(data);

    this.MediaFormat = null;        // l=1 either 0x00 or int
    this.ItemIdentifier = null;     // l=variable
    this.OwnerInstitution = null;   // l=variable

    if (Utils.isArrayOrTypedArray(data)) {
      console.log("LibraryExtensionBlock from byte: ",data)
            
      this.MediaFormat = data[4] === 0x00 ? "" : data[4];
      super.parseVariableLengthFields(data.slice(5,data.length),["ItemIdentifier","OwnerInstitution"])

    } else {
      // json
      this.MediaFormat = data.mediaFormat || 0x00;
      this.ItemIdentifier = data.ItemIdentifier || data.itemIdentifier || null;
      this.OwnerInstitution = data.OwnerInstitution || data.ownerInstitution || null;
    }

  }


  get ExtensionBlock2ByteArray() {

    //return super.getExtensionBlockToByteArray(["MediaFormat", "ItemIdentifier","OwnerInstitution"])

    //console.log("LibraryExtensionBlock ExtensionBlockByte")
    // fields: length=1, id=2 and checksum=1 = 4
    let length = 4;
    // mediaFormat always 1 as it is a fixed length field 
    length += 1;
    // variable length fields + 1 end block length
    length += this.ItemIdentifier !== null ? Utils.stringToByteArray(this.ItemIdentifier).length + 1 : 1;
    length += this.OwnerInstitution !== null ? Utils.stringToByteArray(this.OwnerInstitution).length : 1;
    let block = new Uint8Array(length);
    //byte[] tmp;

    block[0] = length;
    // library extension block
    block[1] = 1;
    block[2] = 0;
    let pos = 4;
    let truncatePos = 4;

    if (this.MediaFormat !== null) {
      block[pos++] = this.MediaFormat;//.byteValue();
      
      truncatePos = pos;
    } else {
      // empty
      block[pos++] = 0x00;
    }

    // fixed length value is not followed by 0x00
    if (this.ItemIdentifier !== null) {
      let tmp = Utils.stringToByteArray(this.ItemIdentifier);
      for (let i = 0; i < tmp.length; i++) {
        block[pos++] = tmp[i];
        
      }
      truncatePos = pos;
    }
    block[pos++] = 0x00;

    if (this.OwnerInstitution !== null) {
      let tmp = Utils.stringToByteArray(this.OwnerInstitution);
      for (let i = 0; i < tmp.length; i++) {
        block[pos++] = tmp[i];
        
      }
      truncatePos = pos;
    }

    // truncate that extension block as values after truncatePos are null
    if (truncatePos != pos) {
      //console.log("truncatepos != pos",truncatePos,pos)
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

}