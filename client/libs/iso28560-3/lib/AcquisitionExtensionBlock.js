import ExtensionBlock from './ExtensionBlock.js';
import Utils from './Utils.js';

export default class AcquisitionExtensionBlock extends ExtensionBlock {

  constructor(data) {

    super(data);

    this.SupplierIdentifier = null;
    this.ProductIdentifierLocal = null;
    this.OrderNumber = null;
    this.SupplierInvoiceNumber = null;
    this.GS1ProductIdentifier = null;
    this.SupplyChainStage = null;

    if (Utils.isArrayOrTypedArray(data)) {
      console.log("AcquisitionExtensionBlock from byte:",data)

      super.parseVariableLengthFields(data.slice(4, data.length), ["SupplierIdentifier", "ProductIdentifierLocal", "OrderNumber", "SupplierInvoiceNumber", "GS1ProductIdentifier", "SupplyChainStage"]);

    } else {
      // json
      this.SupplierIdentifier = data.SupplierIdentifier || data.supplierIdentifier || null;
      this.ProductIdentifierLocal = data.ProductIdentifierLocal || data.productIdentifierLocal || null;
      this.OrderNumber = data.OrderNumber || data.orderNumber || null;
      this.SupplierInvoiceNumber = data.SupplierInvoiceNumber || data.supplierInvoiceNumber || null;
      this.GS1ProductIdentifier = data.GS1ProductIdentifier || data.gs1ProductIdentifier || null;
      this.SupplyChainStage = data.SupplyChainStage || data.supplyChainStage || null;
    }

  }


  get ExtensionBlock2ByteArray() {

    return super.getExtensionBlockToByteArray(["SupplierIdentifier", "ProductIdentifierLocal", "OrderNumber", "SupplierInvoiceNumber", "GS1ProductIdentifier", "SupplyChainStage"])

  }

}