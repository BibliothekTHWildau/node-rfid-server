'use strict';

module.exports = {
  debug : false,
  server : {
    httpPort : 4001,
    httpsPort : 4002,
    wsPort: 4003,
    wssPort: 4004
  },
  maxReconnectionAttempts: 5,
  reconnectTimeout: 10000,
  responseTimeout: 5000,
  encoding: 'hex',
  reader: [
    {
      id : "mr102@home",
      ip: "192.168.178.53",
      port: 10001,
      rxBufferSize: 280, // MR102
      keepalive: 300000
    },
    {
      id : "prh200",
      ip: "192.168.178.XY",
      port: 10001,
      rxBufferSize: 280,  
      keepalive: 300000
    },
    {
      id : "usb",
      usb: {
        vendorId: 2737,
        productId: 2
      },
      ip: "usb",
      port: 0,
      rxBufferSize: 280, //MR102,  
      keepalive: 300000
    }
  ],
  testReader: [
    {
      id : "mr102@home",
      ip: "192.168.0.2",
      port: 10001,
      rxBufferSize: 280, // MR102
      keepalive: 300000
    },

  ],
  tag :{
    "UID": null,
    "AFI": 7,
    "dataModel" : "ISO28560-3",
    "model": {
      "basicBlock": {
        "contentParameter": 1,
        "partNumber": 1,
        "partsInItem": 1,
        "typeOfUsage": 1,      
        "primaryItemIdentifier": "",
        "ISIL": "DE526"
      }
    }
  },
  longtag :{
    "UID": null,
    "AFI": 7,
    "dataModel" : "ISO28560-3",
    "model": {
      "basicBlock": {
        "contentParameter": 1,
        "partNumber": 1,
        "partsInItem": 1,
        "typeOfUsage": 1,      
        "primaryItemIdentifier": "1234",
        "ISIL": "DE526"
      },
      "extensionBlocks": [
        {
          "dataBlockID": 1,
          "mediaFormat": 1,
          "ItemIdentifier":null,
          "OwnerInstitution": null
        },
        {
          "dataBlockID": 2,
          "supplierIdentifier": null,
          "productIdentifierLocal": null,
          "OrderNumber":null,
          "supplierInvoiceNumber": null,
          "GS1ProductIdentifier": null,
          "SupplyChainStage": null
        },
        {
          "dataBlockID": 3,
          "shelfLocation": null,
          "MarcMediaFormat": null,
          "OnixMediaFormat": null,
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
  }
}



