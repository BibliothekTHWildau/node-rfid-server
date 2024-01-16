import ExtensionBlock from './ExtensionBlock.js';
import Utils from './Utils.js';

export default class OtherStructuredExtensionBlock extends ExtensionBlock {

  constructor(data) {

    super(data);

    this.Foo = null;
    this.Bar = null;
    

    if (Utils.isArrayOrTypedArray(data)) {
      
      console.log("OtherStructuredExtensionBlock from byte:",data)

      super.parseVariableLengthFields(data.slice(4, data.length), ["Foo", "Bar"]);

    } else {
      // json
      this.Foo = data.Foo || data.foo || null;
      this.Bar = data.Bar || data.bar || null;
    }

  }

  getDataBlockID() {
    return this.DataBlockID
  }


  get ExtensionBlock2ByteArray() {

    return super.getExtensionBlockToByteArray(["Foo","Bar"]);   
    /*let length = 4;

    //console.log("length shall be: ",length)
    let block = new Uint8Array(length);

    block[0] = length;
    
    // 65535 -> 0xFF 0xFF
    block[1] = this.DataBlockID & 0xFF;
    block[2] = this.DataBlockID >> 8;

    block[3] = 0x00;
    return block;
    //return super.getExtensionBlockToByteArray([])

    return null;//super.getExtensionBlockToByteArray(["Foo","Bar"])
*/
  }

}