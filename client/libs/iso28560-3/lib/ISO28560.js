import BasicBlock from './BasicBlock.js';
import ExtensionBlockFactory from './ExtensionBlockFactory.js';
import Utils from './Utils.js';

/**
 * 
 */
export default class ISO28560_3 {

  #nextBlockStart;

  constructor(data) {
    
    // if data is an array, we could convert to uint8 array BUT then some array functions like splice, called in basicblock, won't work
    //if (Array.isArray(data)) {
      //data = Uint8Array.from(data);
    //}

    console.log("New ISO28560_3 from " + (Utils.isArrayOrTypedArray(data) ? "BINARY data" : "JSON data" ) , data );

    // if data == json generate byte
    // if data == array generate json

    this.basicBlock = new BasicBlock(data);
    this.extensionBlocks = [];


    if (Utils.isArrayOrTypedArray(data)) {
      // byte to JSON

      // toDo can there be a truncated block with extension blocks?
      if (this.basicBlock.isTruncatedBasicBlock)
        return;

      this.#nextBlockStart = 34;
      
      while (data.length > this.#nextBlockStart && data[this.#nextBlockStart] != 0x00){
        this.extractExtensionBlock(data);
      }

    } else {
      // json to byte

      for (let i in data.extensionBlocks) {
        this.extensionBlocks.push(ExtensionBlockFactory.getExtensionBlock(data.extensionBlocks[i]))
      }

    }
  }

  

  /**
   * 
   * @param {*} data extensionBlock data in byte array
   */
  extractExtensionBlock(data){
    
    //console.log("checking for extension block at" , this.nextBlockStart)
    
    let actBlockStart = this.#nextBlockStart;
    let length = data[this.#nextBlockStart] & 0xFF;
    this.#nextBlockStart = actBlockStart + length;
    
    let eBlock = ExtensionBlockFactory.getExtensionBlock(data.slice(actBlockStart,this.#nextBlockStart));
    
    this.extensionBlocks.push(eBlock);
  }

  get JSON() {
    return this
  }

  /**
   * builds a byte array that can be written to a tag directly
   * @param {*} tagSize 
   * @returns 
   */
  getByte(tagSize = false) {
    console.log("ISO28560_3 getByte:", "tagsSize: " + (tagSize ? tagSize : "not defined"));

    // return basic block and extensionblocks in a byte array
    let truncated = tagSize && tagSize <= 32 ? true : false;

    let block = this.basicBlock.getBasicBlockByte(truncated);
    console.log("Basic block: ", block)
        
    // each extension block
    for (let i in this.extensionBlocks) {
      console.log(`ExtensionBlock (DataBlockID=${this.extensionBlocks[i].getDataBlockID()})`)
      let eBlock = this.extensionBlocks[i].ExtensionBlock2ByteArray;
      console.log(`(DataBlockID=${this.extensionBlocks[i].getDataBlockID()}) payload: `,eBlock)

      if (tagSize) {
        console.log(`(DataBlockID=${this.extensionBlocks[i].getDataBlockID()}) size: ${eBlock.length}. Size left on tag: ${tagSize - block.length}.`)
        if (eBlock.length + block.length > tagSize){
          console.log(`(DataBlockID=${this.extensionBlocks[i].getDataBlockID()}) Omitting extension block due to tagSize.`);
          continue;
        }
      }
      // extend block to new size
      let tmpBlock = new Uint8Array([...block, ...eBlock]);
      //console.log(tmpBlock)
      block = tmpBlock;
    }

    // mandatory end block if not truncated
    if ( (tagSize && block.length < tagSize ) || !tagSize ){
      console.log("Adding mandatory end block")
      let tmpBlock = new Uint8Array([...block, 0x00]);   
      console.log(Utils.prettyPrint(tmpBlock)) 
      
      return tmpBlock;
    } else {
      //Utils.prettyPrint(block)
      return block;
    }
      
  }

  


}

//module.exports = ISO28560_3