//const Reader = require("./reader");
const Reader = require("./index");
const config = require('./config.js');

const mainLogger = require('./logger')
logger = mainLogger.child({ name: "test" })

let r1 = config.reader.find(r => { return r.id == "mr102@home" });

const mr102 = new Reader(r1);
//const mr102 = new Reader("mr102","192.168.0.2",10001,false);

let data = [0x34, 0x35, 0x39, 0x38];
let newData = new Array(27 * 4 + 2);
for (let i = 0; i < newData.length; i++) {
  newData[i] = Math.floor(Math.random() * (255 - 0 + 1) + 0);
}

(async function () {


  //

  //let readerInfo = await mr102.getReaderInfo();
  //console.log("readerInfo",readerInfo);


  //let data = new ISO28560_3.default(config.tag.model).getByte(32);
  //console.log(data);  

  /*let sysInfo;
  try {
    sysInfo = await mr102.getSystemInformation("E00401001159139F");
    logger.info(`ÀFI ${sysInfo.AFI}`)
  } catch (error) {
    logger.error(error);
  } */

  let inventory = await mr102.inventory();
  console.log(inventory);

  let afiChange;
  try {
    const CHECKEDOUT = 0xC2;
    afiChange = await mr102.writeAFI("e004010809b9cb12",CHECKEDOUT);
    logger.info(afiChange)
  } catch (error) {
    logger.error(error);
  } 

  /*

  let readCompleteTag;
  try {
    readCompleteTag =  await mr102.readCompleteTag("e004010809b9cb12");
    logger.info(readCompleteTag)
  } catch (error) {
    logger.error(error);
  }*/
  
  /*const   ISO28560_3   = await import('./node_modules/iso28560-3/lib/ISO28560.js');
  let json = new ISO28560_3.default(readCompleteTag.data);
  console.log(json)
  //let re = await mr102.WriteMultipleBlocks("E00401001159139F",0,newData);
  //console.log("re",re);

  /*let writeTag;
  try {
    writeTag = await mr102.writeTag("E00401001159139F", 0, newData);
    logger.debug(writeTag, "writeTag");

  } catch (exc) {
    console.log("Exception", exc)
  }*/


  //let payload = await mr102.readMultipleBlocks("E00401001159139F",0,3);
  //console.log(String.fromCharCode(...payload));


  //for (let tag of inventory.tags) {

  /*let sysInfo = await mr102.getSystemInformation(tag.IDD);
  console.log(sysInfo)

  //let payload = await mr102.readMultipleBlocks(tag.IDD,0,3);
  //console.log(String.fromCharCode(...payload))
  /*
  //let json = new ISO28560_3.default(Array.from(content)); // if buffer 
  let json = new ISO28560_3.default(payload);
  console.log(json);
 */
  /* console.log(tag.IDD);
  let payload =  await mr102.readCompleteTag(tag.IDD);
  let json = new ISO28560_3.default(payload);
  console.log(json)*/
  //}
  mr102.close(true);

})();


/*const Reader = require("./index")

const reader = new Reader({
    debug: false,
})

reader.connect ().then(() => {

  console.log("connected");

    reader.inventory().then(tags => {
      console.log(tags)
        if (tags.length > 0) {
            
            console.log('Received tags:', tags)

        }

    }).catch(result => {

        console.log('Error:', result)
        
    })

    setTimeout(() => {
        reader._handleData(Buffer.from([0x11, 0x00, 0xb0, 0x00, 0x01, 0x03, 0x00, 0xe0, 0x04, 0x01, 0x50, 0xa0, 0x5f, 0x02, 0xb7, 0xd7, 0xbe]))
    }, 3000)

}).catch(error => {
    console.log(error)
})*/
