import ExtensionBlock from './ExtensionBlock.js';
import Utils from './Utils.js';

export default class TitleExtensionBlock extends ExtensionBlock {

  constructor(data) {

    super(data);

    this.Title = null;

    if (Utils.isArrayOrTypedArray(data)) {
      // byte
      console.log("TitleExtensionBlock from byte:",data) 

      // parse byte into fields
      super.parseVariableLengthFields(data.slice(4, data.length), ["Title"]);

    } else {
      // json
      this.Title = data.Title || data.title || null;
    }
  }


  get ExtensionBlock2ByteArray() {

    return super.getExtensionBlockToByteArray(["Title"])

  }

}