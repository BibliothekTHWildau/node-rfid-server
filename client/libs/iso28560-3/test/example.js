import ISO28560DataModel from "iso28560-3";

let model = {
  "basicBlock": {
    "contentParameter": 1,
    "partNumber": 1,
    "partsInItem": 1,
    "typeOfUsage": 1,

    "primaryItemIdentifier": "1000000136",
    "ISIL": "DK718500"
  },
  "extensionBlocks": [
    {
      "dataBlockID": 1,
      "mediaFormat": 1,
      "ItemIdentifier": null,
      "ownerInstitution": null
    },
    {
      "dataBlockID": 2,
      "supplierIdentifier": "Bogvognen",
      "productIdentifierLocal": "1234567890",
      "orderNumber": null,
      "supplierInvoiceNumber": "a789656c",
      "gs1ProductIdentifier": null,
      "supplyChainStage": null
    },
    {
      "dataBlockID": 3,
      "MarcMediaFormat": null,
      "OnixMediaFormat": null,
      "shelfLocation": null,
      "subsidiaryOfAnOwnerInstitution": null
    },
    {
      "dataBlockID": 4,
      "title": null
    },
    {
      "dataBlockID": 5,
      "alternativeILLBorrowingInstitution": null,
      "illBorrowingInstitution": null,
      "illBorrowingTransactionNumber": null
    }
  ]
}

let tagSize = 32; // small rfid tag, will truncate data model
tagSize = 112;
let typedArray = new ISO28560DataModel(model).getByte(tagSize);
// or 
// typedArray = new ISO28560DataModel(json).getByte()
let byte = Array.from(typedArray)
console.log(byte);

let json = new ISO28560DataModel(byte);

console.log(json)

