import ExtensionBlock from './ExtensionBlock.js';
import Utils from './Utils.js';

export default class ILLExtensionBlock extends ExtensionBlock {

  constructor(data) {

    super(data);

    this.IllBorrowingInstitution = null;
    this.IllBorrowingTransactionNumber = null;
    this.AlternativeILLBorrowingInstitution = null;


    if (Utils.isArrayOrTypedArray(data)) {
      // byte
      console.log("ILLExtensionBlock from byte:", data)

      // parse byte into fields
      super.parseVariableLengthFields(data.slice(4, data.length), ["IllBorrowingInstitution", "IllBorrowingTransactionNumber", "AlternativeILLBorrowingInstitution"]);

    } else {
      // json
      this.IllBorrowingInstitution = data.IllBorrowingInstitution || data.illBorrowingInstitution || null;
      this.IllBorrowingTransactionNumber = data.IllBorrowingTransactionNumber || data.illBorrowingTransactionNumber || null;
      this.AlternativeILLBorrowingInstitution = data.AlternativeILLBorrowingInstitution || data.alternativeILLBorrowingInstitution || null;
    }
  }

  get ExtensionBlock2ByteArray() {

    return super.getExtensionBlockToByteArray(["IllBorrowingInstitution", "IllBorrowingTransactionNumber", "AlternativeILLBorrowingInstitution"]);

  }

}