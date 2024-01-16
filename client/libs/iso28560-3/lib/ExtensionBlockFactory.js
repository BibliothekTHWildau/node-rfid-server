import LibraryExtensionBlock from './LibraryExtensionBlock.js';
import AcquisitionExtensionBlock from './AcquisitionExtensionBlock.js';
import LibrarySupplementExtensionBlock from './LibrarySupplementExtensionBlock.js';
import TitleExtensionBlock from './TitleExtensionBlock.js';
import ILLExtensionBlock from './ILLExtensionBlock.js';

import OtherStructuredExtensionBlock from './OtherStructuredExtensionBlock.js';
import UnstructuredExtensionBlock from './UnstructuredExtensionBlock.js';

import Utils from './Utils.js';

export default class ExtensionBlockFactory {
  
  /*constructor() {
    
  };*/
  
  static getExtensionBlock(data){
    let ebType;
    if (Utils.isArrayOrTypedArray(data)) {
      // toDo int values
      // uint16 payload 02 00 -> 2
      ebType = data[1] +  (data[2] << 8) ; 

    } else {
      ebType = data.dataBlockID || data.DataBlockID;
    }

    console.log("ExtensionBlockFactory returns type " + ebType)
    
    switch (ebType) {
      case 1:
        return new LibraryExtensionBlock(data);
      case 2:
        return new AcquisitionExtensionBlock(data);
      case 3:
        return new LibrarySupplementExtensionBlock(data);
      case 4:
        return new TitleExtensionBlock(data);
      case 5:
        return new ILLExtensionBlock(data);
      default:
        if (ebType <= 100)
          return new OtherStructuredExtensionBlock(data);
        else
          return new UnstructuredExtensionBlock(data);
        
    }
  }

}