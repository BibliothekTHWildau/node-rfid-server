import ExtensionBlock from './ExtensionBlock.js';
import Utils from './Utils.js';

export default class LibrarySupplementExtensionBlock extends ExtensionBlock {

  constructor(data) {

    super(data);

    this.ShelfLocation = null;
    this.MarcMediaFormat = null;
    this.OnixMediaFormat = null;
    this.SubsidiaryOfAnOwnerInstitution = null;


    if (Utils.isArrayOrTypedArray(data)) {
      // byte
      console.log("LibrarySupplementExtensionBlock from byte:",data)

      // parse byte into fields
      super.parseVariableLengthFields(data.slice(4, data.length), ["ShelfLocation", "MarcMediaFormat", "OnixMediaFormat", "SubsidiaryOfAnOwnerInstitution"]);

    } else {
      // json
      this.ShelfLocation = data.ShelfLocation || data.shelfLocation || null;
      this.MarcMediaFormat = data.MarcMediaFormat || data.marcMediaFormat || null;
      this.OnixMediaFormat = data.OnixMediaFormat || data.onixMediaFormat || null;
      this.SubsidiaryOfAnOwnerInstitution = data.SubsidiaryOfAnOwnerInstitution || data.subsidiaryOfAnOwnerInstitution || null;
  //    console.log(data)
//console.log("LibrarySupplementExtensionBlockLibrarySupplementExtensionBlockLibrarySupplementExtensionBlockLibrarySupplementExtensionBlockLibrarySupplementExtensionBlock",this)
    }
  }

  get ExtensionBlock2ByteArray() {

    return super.getExtensionBlockToByteArray(["ShelfLocation", "MarcMediaFormat", "OnixMediaFormat", "SubsidiaryOfAnOwnerInstitution"])

  }

}