"use strict";

const mainLlogger = require('../logger');
var logger;

//const { resolve } = require('path');
var config = require('../config.js');
const net = require('net');
const { addCrcToBuffer } = require('./utils/crc16')
const Commands = require('./constants/commands')
const ISOStandardCommands = require('./constants/isoStandardCommands')
const Response = require('./response')
const ParseStatus = require('./constants/parseStatus')
const Status = require('./constants/status')
const TransponderType = require('./constants/transponderType')
const Protocol = require('./constants/protocol')
//const convertToHexString = require('./utils/convertToHexString');
var usb;

class Reader {

  constructor(conf) {
    this.debug = config.debug || false;
    this.ip = conf.ip;
    this.port = conf.port;
    this.id = conf.id;
    this.rxBufferSize = conf.rxBufferSize;
    this.counter = config.peopleCounter ? { "in": undefined, "out": undefined, "ts": undefined, "tsReset": undefined } : false;


    this.logger = mainLlogger.child({ name: this.id });
    this.logger.info("--------------------------")
    this.logger.info(`[${this.id}] ${this.ip}:${this.port}`)
    this.logger.info("--------------------------");

    // todo verify
    this.writeMultipleBlocksFrameBaseLength = 20; //

    this._connected = false;
    this._connectResolve = null;

    this.connectTimer = null;
    this.mSuccessCallback = null
    this.mErrorCallback = null
    this.tempBuffer = []

    if (conf.usb) {
      usb = require('usb');
      this.usb = conf.usb;
      
    } else {
      this.socket = new net.Socket();
      //this.socket.setTimeout(3000);
      this.socket.on('connect', () => {

        this.logger.debug("connected");
        this._connected = true;

        clearTimeout(this.connectTimer);

        if (this._connectResolve) {
          this._connectResolve();
        }

      });

      this.socket.on('data', this._handleData.bind(this));

      this.socket.on('close', (hadError) => {

        this.logger.error({ hadError: hadError }, "close");
        this._connected = false;

      });

      this.socket.on('timeout', (error) => {
        this.logger.error(error, "on timeout");
        this.socket.destroy();
      });

      this.socket.on('error', (error) => {
        this.logger.error(error, "socket on error");
        clearTimeout(this.connectTimer);

        if (this.mErrorCallback) {
          this.mErrorCallback(error);
        }

        // this.mSuccessCallback = resolve
        //this.mErrorCallback = reject
      });
    }


  }

  get _info() {
    return {
      debug: this.debug,
      ip: this.ip,
      port: this.port,
      id: this.id,
      rxBufferSize: this.rxBufferSize,
      counter: this.counter,
      connected: this._connected
    }
  }

  _handleError(error, reject) {
    reject({ error: error.message, reader: this.id })
  }

  _getErrorMEssage(err) {
    return {
      error: err.toString(),
      //errorMsg : err.message,
      reader: this.id
    }
  }

  _handleData(data) {

    if (!data) {
      return
    }

    clearTimeout(this.responseTimeoutTimer);

    // Append the temporary buffer.
    this.tempBuffer = Buffer.from([...this.tempBuffer, ...data])

    this.logger.debug('<<< ' + data.toString('hex'))

    // Try to parse the temporary buffer.
    const result = Response.tryParse(this.tempBuffer, Protocol.Advanced)
    // Get the response.
    const response = result.response

    switch (result.status) {

      // Successful buffer.
      case ParseStatus.Success:
        this.tempBuffer = []

        if (this.mSuccessCallback !== null) {

          // Call the success callback.
          this.mSuccessCallback(response)

          // Reset the callback.
          this.mSuccessCallback = null

        }
        break
      // Received an error.
      case ParseStatus.ChecksumError:
      case ParseStatus.FrameError:
        this.tempBuffer = []

        if (this.mErrorCallback !== null) {

          // Call the error callback.
          this.mErrorCallback(result)

          // Reset the callback
          this.mErrorCallback = null

        }
        break
    }

    // todo check 
    //this.socket.destroy(); 
  }

  /**
   * prefixes feig specific protocol 
   * STX = 0x02
   * MSB ALENGTH
   * LSB ALENGTH
   * COM-ADR = 0xff
   * @param {*} command 
   * @param {*} data 
   * @returns 
   */
  createCommand(command, data = []) {
    // we take advanced protocol
    // 4 feig prefix length + 2 crc
    const finalLength = Buffer.from([command, ...data]).length + 6;
    // finalLength can be 8 - 65535
    const commandWithPrefix = Buffer.from([0x02, finalLength >> 8, finalLength & 0xff, 0xff, command, ...data]);

    return addCrcToBuffer(commandWithPrefix);
  }

  /**
   * 
   * @param {*} command 
   * @param {*} data 
   * @returns 
   */
  send(command, data = []) {

    return new Promise(async (resolve, reject) => {

      // Create the command buffer, including the CRC bytes.
      const buffer = this.createCommand(command, data)
      // Set temporary callbacks.
      this.mSuccessCallback = resolve
      this.mErrorCallback = reject

      if (this.debug) {

        this.logger.debug(`DEBUG Write command: ${buffer.toString('hex')}`)

      } else {


        if (!this._connected) {
          try {
            if (this.usb)
              await this.connect_usb();
            else
              await this.connect();
          } catch (connectError) {
            // connection timed out
            return reject(connectError);
          }
        }

        this.logger.debug(`>>> ${buffer.toString('hex')}`);

        if (this.usb){
          this.writeEndpoint.transfer(buffer)
        } else {
          // Send it to the RFID module!
          this.socket.write(buffer);
        }
        

        

        // todo check implementation
        this.responseTimeoutTimer = setTimeout(() => {

          this.logger.info(`response exceeded TIMEOUT value ${config.responseTimeout}`);

          if (this.mErrorCallback !== null) {

            // Call the error callback.
            this.mErrorCallback(new Error('Timeout reached - Reader did not respond in ' + config.responseTimeout))

            // Reset the callback
            this.mErrorCallback = null

          }

          this.socket.destroy();

        }, config.responseTimeout);

      }
    })


  }

  /**
     * Connect to the RFID scanner.
     *
     * @memberof Reader
     */
  connect_usb() {
    return new Promise((resolve, reject) => {

      this._connectResolve = resolve;

      this.device = usb.findByIds(this.usb.vendorId, this.usb.productId)

      if (this.device) {

        try {
          // Open the device.
          this.device.open()

          // It should always have an interface.
          this.interface = this.device.interface(0)

          // Claim the interface.
          this.interface.claim()

          // Read endpoint.
          this.readEndpoint = this.interface.endpoints.find(endpoint => endpoint.direction === "in")

          // Write endpoint.
          this.writeEndpoint = this.interface.endpoints.find(endpoint => endpoint.direction === "out")

          // Set-up event listeners on the read endpoint.
          this.readEndpoint.on('data', this._handleData.bind(this))
          this.readEndpoint.on('error', this._handleError.bind(this))

          // Start listening to the RFID output.
          this.readEndpoint.startPoll()

          this._connected = true;
          resolve()

        } catch (e) {

          reject(e)

        }
      } else {

        // The USB device cannot be found
        reject(`Couldn't connect to USB device with vendorId: ${this.usb.vendorId} and productId: ${this.usb.productId}`)

      }
    });

  }

  /**
     * Disconnect from the reader
     *
     * @memberof Reader
     */
  disconnect_usb () {
    // Only act if the device and interface are active
    if (this.device && this.interface) {

        // Remove all event listeners
        this.readEndpoint.removeAllListeners ()
        this.writeEndpoint.removeAllListeners ()

        // Stop polling on the read endpoint
        if (this.readEndpoint.pollActive) {
            this.readEndpoint.stopPoll()
        }

        // Release the interface
        this.interface.release (true)


        // TODO: Close the device, but all transfers need to be finished.
        // Close the device
        //this.device.close ()

    }
}

  /**
   * 
   * @returns 
   */
  connect() {
    return new Promise((resolve, reject) => {

      this._connectResolve = resolve;
      this.socket.connect(this.port, this.ip);

      // this timer is fired when a connection is not established
      this.connectTimer = setTimeout(() => {

        this.logger.error(`Attempt at connection exceeded TIMEOUT value`);
        //device.clientSocket.end();
        reject(new Error(`${this.id} connect timeout`));
        //reject("connect timeout");
        this.socket.destroy();

      }, 5000);
    });

  };

  /**
   * close socket 
   * if set rfOff rfOff is triggered before closing the socket
   * @param {*} rfOff 
   */
  async close(rfOff = false) {

    if (rfOff) {
      try {
        await this.rfOff();
      } catch (error) {
      }
    }
    if (this.socket) {
      // Add message
      this.socket.end();
    }
  }

  // system commands

  /**
   * Software reset
   * 02  xx xx xx 63
   */
  async cpuReset() {
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`>>> cpuReset`);
      this.send(Commands.CPUReset).then(cpuResetResponse => {

        // todo parse rfOffResponse
        const response = this.buildResponse('cpuReset', Status.getFromValue(cpuResetResponse.status));
        resolve(response);

      }).catch(err => {
        this.logger.error("cpuReset caught an error: " + err)
        reject(this._getErrorMEssage(err));
      });
    });
  }

  /**
   * system reset
   * 02  xx xx xx 64
   */
  async systemReset() {
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`>>> systemReset`);
      this.send(Commands.SystemReset).then(systemResetResponse => {

        // todo parse rfOffResponse
        const response = this.buildResponse('systemReset', Status.getFromValue(systemResetResponse.status));
        resolve(response);

      }).catch(err => {
        this.logger.error("systemReset caught an error: " + err)
        reject(this._getErrorMEssage(err));
      });
    });
  }

  /**
   * 02 00 08 FF 6A 01 A1 AA 
   */
  async rfOn() {
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`>>> rfOn`);
      this.send(Commands.RFOutputOnOff, [0x01]).then(rfOnResponse => {

        // todo parse rfOffResponse
        const response = this.buildResponse('rfOn', Status.getFromValue(rfOnResponse.status));
        resolve(response);

      }).catch(err => {
        this.logger.error("rfOn caught an error: " + err)
        reject(this._getErrorMEssage(err));
      });
    });
  }

  /**
   * 02 00 08 FF 6A 00 28 BB 
   */
  async rfOff() {
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`>>> rfOff`);
      this.send(Commands.RFOutputOnOff, [0x00]).then(rfOffResponse => {

        // todo parse rfOffResponse
        const response = this.buildResponse('rfOff', Status.getFromValue(rfOffResponse.status));
        resolve(response);

      }).catch(err => {
        this.logger.error("rfOff caught an error: " + err)
        reject(this._getErrorMEssage(err));
      });
    });
  }

  /**
   * sends GetReaderInfo and retrieves receive buffer size of reader
   * @returns GetReaderInfo response
   */
  async getReaderInfo() {
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`>>> getReaderInfo`);

      // mode = 0x00 includes rx buffer size
      let mode = 0x00;

      return this.send(Commands.GetReaderInfo, [mode]).then(getReaderInfoResponse => {
        //this.rxBufferSize = (getReaderInfoResponse.data[7] << 8) + (getReaderInfoResponse.data[8]);
        //console.log("rxBufferSize", this.rxBufferSize);

        // rxBufHigh 0x01 = 00000001 << 8 = 100000000
        // rxBufLow  0x18 =                  00011000
        // | 
        const rxBufHigh = getReaderInfoResponse.data[7];
        //console.log(rxBufHigh.toString(2), (rxBufHigh << 8).toString(2))
        const rxBufLow = getReaderInfoResponse.data[8];
        //console.log(rxBufLow.toString(2))
        this.rxBufferSize = (rxBufHigh << 8) | rxBufLow
        this.logger.debug(`rxBufferSize ${this.rxBufferSize}`);

        // todo parse getReaderInfoResponse
        const response = this.buildResponse('getReaderInfo', Status.getFromValue(getReaderInfoResponse.status));
        response.rxBufferSize = this.rxBufferSize;
        response.raw = getReaderInfoResponse;
        resolve(response);

      }).catch(err => {
        this.logger.error("getReaderInfo caught an error: " + err)
        reject(this._getErrorMEssage(err));
      });
    });

  }

  /**
   * sends a standard inventory command
   * @param {*} moreDataRequested 
   * @returns 
   */
  inventory(moreDataRequested = false) {
    return new Promise((resolve, reject) => {

      this.logger.debug(`>>> inventory`);

      // 0x00 new inventory request
      // 0x01 if status of last inventory was 0x94 we request more data
      let mode = moreDataRequested ? 0x01 : 0x00;

      this.send(Commands.ISOStandardHostCommand, [ISOStandardCommands.Inventory, mode]).then(inventoryResponse => {

        const response = this.buildResponse('inventory', Status.getFromValue(inventoryResponse.status));
        response.tags = [];

        switch (inventoryResponse.status) {
          case Status.OK:
            // The response contains data, let's parse the tags into an array.
            response.tags = this.parseInventory(inventoryResponse.data)
            break
          case Status.NoTransponder:
            // We did not receive any transponder data, return an empty array.
            break
          case Status.MoreData:
            // do inventory with param more data
            break;
        }

        // Let's reset the radio frequency.
        //this.resetRF().finally(() => {
        // Return the tags after the radio frequency has been sent.
        resolve(response)
        //})

      }).catch(err => {
        this.logger.error("inventory caught an error: " + err)
        reject(this._getErrorMEssage(err));
        //this._handleError(err,reject);

      })

    });
  };



  /**
   * 
   * @returns 
   */
  resetRF() {
    this.logger.debug(`>>> RFReset`);
    return this.send(Commands.RFReset)
  }

  /**
   * getSystemInformation of a tag including AFI
   * 02 00 11 FF B0 2B 01 E0 04 01 08 09 B9 CB 12 0B 65 
   * @param {*} tag 
   * @returns 
   */
  getSystemInformation(uid) {
    return new Promise((resolve, reject) => {

      this.logger.debug(`>>> getSystemInformation`);

      let mode = 0x01; // 0x01 = addressed

      // Send the ISO ReadMultipleBlocks command.rxBufferSize
      this.send(Commands.ISOStandardHostCommand, [].concat([ISOStandardCommands.GetSystemInformation, mode], Array.from(Buffer.from(uid, 'hex')))).then(getSystemInformationResponse => {

        const response = this.buildResponse('getSystemInformation', Status.getFromValue(getSystemInformationResponse.status));

        //console.log("getSystemInformationResponse", getSystemInformationResponse);
        switch (getSystemInformationResponse.status) {
          case Status.OK:
            response.tag = this.parseSecurityInformation(getSystemInformationResponse.data);
            resolve(response);
            //let data = getSystemInformationResponse.data;
            //resolve(this.parseSecurityInformation(data))

            break
          default:
            this.logger.error("The received data was not correct:" + Status.getFromValue(getSystemInformationResponse.status))
            return reject(response)
          //reject("The received data was not correct:" + Status.getFromValue(getSystemInformationResponse.status))
        }

      }).catch(err => {
        this.logger.error("getSystemInformation caught an error: " + err)
        reject(this._getErrorMEssage(err));
      })

    })
  }

  /**
   * read multiple blocks from tag
   * @param {*} uid 
   * @param {*} firstDataBlock 
   * @param {*} noOfDataBlocks 
   * @returns a data array
   */
  readMultipleBlocks(uid, firstDataBlock, noOfDataBlocks) {
    return new Promise((resolve, reject) => {

      this.logger.debug(`>>> readMultipleBlocks`);

      let mode = 0x01; // only addressed
      mode = 0x09; // with security status
      // Send the ISO ReadMultipleBlocks command.
      this.send(Commands.ISOStandardHostCommand, [].concat([ISOStandardCommands.ReadMultipleBlocks, mode], Array.from(Buffer.from(uid, 'hex')), [firstDataBlock, noOfDataBlocks])).then(readMultipleBlocksResponse => {

        const response = this.buildResponse('readMultipleBlocks', Status.getFromValue(readMultipleBlocksResponse.status));

        switch (readMultipleBlocksResponse.status) {
          case Status.OK:
            let data = readMultipleBlocksResponse.data;
            // 03 04 00  32 01 02 11 00  30 34 31 30 00  39 39 39 33
            //       sec -- -- -- --
            //                       sec -- -- -- --
            //                                       sec -- -- -- --
            // 00 01 02  03 04 05 06 07  08 09 10 11 12  13 14 15 16

            //  sec = 01 if lockMultipleBlocks was called for a block no
            let numBlocks = data[0];
            let blockSize = data[1];
            //          console.log('blockSize', blockSize)
            let payload = [];
            let offset = 2;
            let blockSecurityStatus = [];
            for (let block = 0; block < numBlocks; block++) {
              // block is 5 bytes, 1st is sec followed by 4 bytes data
              let secStatus = data[offset];
              blockSecurityStatus.push(secStatus)
              offset++;
              //console.log(Array.from(data.subarray(offset, offset + blockSize)));
              // get 4 byte data array and reverse it
              let tmp = Array.from(data.subarray(offset, offset + blockSize));
              payload = payload.concat(tmp.reverse());
              offset += blockSize;
            }
            response.data = payload;
            response.blockSecurityStatus = blockSecurityStatus;
            return resolve(response);



            //resolve(data)
            break
          default:
            this.logger.error("The received data was not correct.", Status.getFromValue(readMultipleBlocksResponse.status));
            response.error = Status.getFromValue(readMultipleBlocksResponse.status);
            return reject(response);
        }

      }).catch(err => {
        this.logger.error("readMultipleBlocks caught an error: " + err)
        reject(this._getErrorMEssage(err));
      })

    })
  }

  /**
   * write multiple blocks to tag
   * 
   * do we care about rxbuffersize? or tag size?
   * rxbuffer size = no, shoulkd be done in a writeData wrapper function 
   * tagsize = no , should be done by logic outside to gain tagsize and prepare data to be written
   * @param {*} uid 
   * @param {*} firstDataBlock 
   * @param {*} data 
   * @returns 
   */
  writeMultipleBlocks(uid, firstDataBlock, data) {
    return new Promise((resolve, reject) => {

      this.logger.debug(`>>> writeMultipleBlocks`);

      let mode = 0x01; // 0x01 = addressed
      let blockSize = 0x04; // standard
      //data = [0,1,2,3,4,5,6,7];
      if (data.length % blockSize !== 0) {
        // array length must be a multiple of blockSize
        // extending data by a new Array filled up with 0x00
        data = data.concat(new Array(blockSize - (data.length % blockSize)).fill(0));
      }

      let numBlocks = data.length / blockSize;
      //console.log("numBlocks", numBlocks);


      // legend
      // 1-4: 02 00 18 FF 
      // 5-6: B0 24 = iso host command, write multiple blocks
      // 7:   01 
      // 8- 15:  E0 04 01 08 09 B9 CB 12 = uid
      // 16-18:  00 01 04 =firstDataBlock blocks blocksize
      // 19- N: 34 33 32 31  = DATA*
      // N-2, N-1: 96 DB   =CRC

      // 1 block from 1
      // 02 00 18 FF B0 24 01 | E0 04 01 08 09 B9 CB 12 | 01 01 04 | 35 36 37 38 | 3C 82 

      // 3 blocks from 2
      // 02 00 20 FF B0 24 01 | E0 04 01 08 09 B9 CB 12 | 02 03 04 | 33 31 30 30 - 00 00 00 36 - 36 00 00 00 | 20 7D 


      // 02 00 18 FF B0 24 09 E0 04 01 00 41 3A 6D 4B | 01 01 04 | 66 66 66 66 | B3 78  // ffff in block 1

      // 3 blocks from 0
      // 02 00 20 FF B0 24 01 E0 04 01 00 11 59 13 9F | 00 03 04 | 33 22 11 00 -  30 30 31 30 - 34 35 36 33 | 79 D7 

      // reverse every block
      let revData = [];
      for (let i = 0; i < numBlocks; i++) {
        let tmp = data.slice(i * blockSize, i * blockSize + blockSize).reverse();
        revData = revData.concat(tmp);
      }
      data = revData;
      //                                                   11 blocks from 00
      // 02 00 40 ff b0 24 01 e0 04 01 00 41 3a 6d 4b | 00 0b 04 | 
      // 34 33 32 31 - 00 11 22 33 - 00 00 00 00 - 00 00 00 00 - 60 00 00 00 - 30 30 30 9e - 30 30 30 30 - 30 30 30 30 - 30 04 30 30 - 32 04 00 30 - 00 00 36 00 - afb6
      this.send(Commands.ISOStandardHostCommand, [].concat([ISOStandardCommands.WriteMultipleBlocks, mode], Array.from(Buffer.from(uid, 'hex')), [firstDataBlock, numBlocks, blockSize], Array.from(data))).then(writeMultipleBlocksResponse => {

        const response = this.buildResponse('writeMultipleBlocks', Status.getFromValue(writeMultipleBlocksResponse.status));
        this.logger.info(writeMultipleBlocksResponse.status)
        switch (writeMultipleBlocksResponse.status) {
          case Status.OK:
            resolve(response)
            break;
          default:
            // case 0x95 ISOError f.e.
            this.logger.error(`response of wmb: ${Status.getFromValue(writeMultipleBlocksResponse.status)}. rejecting`);
            response.error = Status.getFromValue(writeMultipleBlocksResponse.status);
            return reject(response);
          //reject(Status.getFromValue(writeMultipleBlocksResponse.status))
        }

      }).catch(err => {
        this.logger.error("writeMultipleBlocks caught an error: " + err)
        reject(err)
      })
    });
  }

  /**
   * 02 00 11 FF B0 2B 01 E0 04 01 08 09 B9 CB 12 0B 65 
   * @param {*} tag 
   * @returns tag object with AFI if successful
   */
  writeAFI(uid, afi) {
    return new Promise((resolve, reject) => {

      this.logger.debug(`>>> writeAFI ${uid} ${afi}`);

      // afi should be int
      let afiInt = parseInt(afi);
      this.logger.debug(`${afi} -> parseInt -> ${afiInt}`);

      // no int or greater than 255
      if (!Number.isInteger(afiInt) || afiInt > 0xff) {
        return reject(new Error("invalid_afi " + afi));
      }

      let mode = 0x01; // 0x01 = addressed

      // Send the ISO  command.
      this.send(Commands.ISOStandardHostCommand, [].concat([ISOStandardCommands.WriteAFI, mode], Array.from(Buffer.from(uid, 'hex')), afiInt)).then(writeAFIResponse => {

        const response = this.buildResponse('writeAFI', Status.getFromValue(writeAFIResponse.status));

        switch (writeAFIResponse.status) {
          case Status.OK:
            response.tag = { UID: uid, AFI: afiInt }
            resolve(response)
            break
          default:
            response.error = Status.getFromValue(writeAFIResponse.status);
            return reject(response);
          //return reject("The received data was not correct:" + Status.getFromValue(writeAFIResponse.status))
        }

      }).catch(err => {
        this.logger.error("writeAfi caught an error: " + err)
        reject(err)
      })

    })
  }

  // helper functions to read write data not caring about tag sizes

  buildResponse(request, status) {
    return {
      request: request,
      status: status,
      reader: this.id
    }
  }

  /**
   * reads complete memory of tag by  
   * 1. retrieve number of blocks by calling getSystemInformation
   * 2. retrieve number of blocks data from tag 
   * @param {*} uid 
   * @returns 
   */
  readCompleteTag(uid) {
    return new Promise(async (resolve, reject) => {

      const response = this.buildResponse('readCompleteTag', '');

      try {

        let systemInformationResponse = await this.getSystemInformation(uid);
        //tag.systemInformation = systemInformationResponse.systemInformation;

        let tag = { ...systemInformationResponse.tag }

        let readMultipleBlocksResponse = await this.readMultipleBlocks(uid, 0, tag.BLOCKS);
        tag.data = readMultipleBlocksResponse.data;
        tag.blockSecurityStatus = readMultipleBlocksResponse.blockSecurityStatus;


        response.tag = tag;

        return resolve(response);
      } catch (error) {
        this.logger.error(error)
        response.error = error;
        reject(response)
      }


    });
  }

  /**
   * 
   * @param {*} uid 
   * @param {*} firstDataBlock 
   * @param {*} data 
   * @returns 
   */
  writeTag(uid, firstDataBlock, dataObj, blockSize = 4) {
    return new Promise(async (resolve, reject) => {

      this.logger.info(dataObj);

      const response = this.buildResponse('writeTag', '');
      response.tag = { UID: uid };
      response.writeMultipleBlocksResponses = [];

      if (dataObj.AFI) {
        await this.writeAFI(uid, dataObj.AFI).then(afiResponse => {

          // todo writeAFI reutrns tag { uid, afi }
          response.tag = Object.assign(response.tag, afiResponse.tag)

        }).catch(error => {
          this.logger.error("Todo error on write afi in writeTag")
          this.logger.error(error)
        });
      }

      let data = dataObj.data;

      let sizePerChunk = this.rxBufferSize - this.writeMultipleBlocksFrameBaseLength; //; 

      // sizePerChunk must be a multiple of blockSize, if not danger of getting imploded in wmb and the hitting rxBufferSize
      while (sizePerChunk % blockSize !== 0) {
        sizePerChunk--;
      }
      this.logger.debug(`sizePerChunk: ${sizePerChunk}`);

      if (data.length % blockSize !== 0) {
        // array length must be a multiple of blockSize
        // extending data by a new Array filled up with 0x00
        data = data.concat(new Array(blockSize - (data.length % blockSize)).fill(0));
      }

      if (data.length + this.writeMultipleBlocksFrameBaseLength <= this.rxBufferSize) {
        // all data in one message
        //console.log(`writeTag [${uid}] data: ${data}`);
        await this.writeMultipleBlocks(uid, firstDataBlock, data).then(wmbResponse => {
          //console.log("Response from writeMultipleBlocks", wmbResponse)

          // respond with given data? check if necessaray
          response.tag.data = data;
          response.writeMultipleBlocksResponses.push(wmbResponse)
          resolve(response)
        }).catch(error => {
          response.error = error;
          reject(response)
        });
      } else {
        // chunking data
        //let chunk = data.slice(0,)
        let index = 0;

        while (index < data.length) {
          //console.log("index", index);

          let chunk;
          if (index + sizePerChunk <= data.length)
            chunk = data.slice(index, index + sizePerChunk);
          else
            chunk = data.slice(index);
          this.logger.debug(`chunk ${chunk}`);
          let wmbResponse;
          try {
            wmbResponse = await this.writeMultipleBlocks(uid, index / blockSize, chunk);
            //console.log("chunk written");
            response.writeMultipleBlocksResponses.push(wmbResponse)
          } catch (e) {
            this.logger.error("chunk error rejecting");
            response.error = e;
            //return response(response);
            return reject(response)
          }

          index += sizePerChunk;
        }
        response.tag.data = data;

        resolve(response)


      }

    });
  }

  /**
   * wrapper method to erase/overwrite a tag
   * if no payload given, tag is overwritten with 0x00
   * else it gets overwritten with payload array
   * 
   * @param {} uid 
   * @param {*} zeros 
   * @param {*} blockSize 
   * @returns 
   */
  eraseTag(uid, zeros = null, blockSize = 4) {
    return new Promise(async (resolve, reject) => {

      let tag;


      const response = this.buildResponse('eraseTag', '');


      try {

        if (!zeros) {
          let systemInformationResponse = await this.getSystemInformation(uid);
          //tag.systemInformation = systemInformationResponse.systemInformation;

          tag = { ...systemInformationResponse.tag }

          zeros = new Array(tag.BLOCKS * blockSize).fill(0);
        }

        // will return a fill write tag response including tag and data
        let eraseTagResponse = await this.writeTag(uid, 0, { data: zeros }, blockSize);
        //response.eraseTagResponse = eraseTagResponse;
        //response.tag = {data : zeros, UID : uid};
        return resolve(eraseTagResponse);
      } catch (e) {
        this.logger.error("error on eraseTag " + e)
        response.error = e;
        return reject(response);
      }



    });
  }

  /**
   * 3e e0 04 01 08 09 b9 cb 12 01 03 4f 01
   * memsize: 03  4f
   * @param {*} data 
   * @returns 
   */
  parseSecurityInformation(data) {
    const secInfo = {
      'DSFID': data[0].toString(16),
      'IDD': data.subarray(1, 9).toString('hex'),
      'UID': data.subarray(1, 9).toString('hex'),
      'AFI': data[9],
      'BLOCKSIZE': (data[10] & 0b00011111) + 1,
      'BLOCKS': data[11] + 1,
      'IC-REF': data[12].toString(16)
    }
    secInfo['MEM-SIZE'] = secInfo['BLOCKSIZE'] * secInfo['BLOCKS']
    return secInfo;
  }

  /**
 * Parse the current inventory buffer.
 * DATA-SETS  [ TR-TYPE 1 DSFID 1 IDD 8 ]
 * @param {Buffer} data The received inventory data buffer.
 * @returns 
 */
  parseInventory(data) {
    const inventory = []

    const dataSets = data[0]

    for (let i = 0; i < dataSets; i++) {

      let tagData = data.subarray(i * 10 + 1, i * 10 + 11);
      let tag = {
        'TR-TYPE': tagData[0],
        'DSFID': tagData[1].toString(16)
      }

      switch (tag['TR-TYPE']) {
        // Transponder is an ISO15693 type.
        case TransponderType.ISO15693:
          tag.IDD = tagData.subarray(2, tagData.length).toString('hex');
          tag.UID = tag.IDD;
          break;
        case TransponderType.ISO14443A:

          // ToDo
          // Variable length based on response
          const length = tagData[0] === 0x04 ? 10 : 7

          // Get a "length" long buffer containing the tag identifier.
          tag.IDD = tagData.slice(2, length + 2)

          break;
      }
      inventory.push(tag)

    }

    return inventory
  }


  log(msg, msgObject) {
    let d = new Date();
    let dString = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ':' + ("0" + d.getMinutes()).slice(-2) + ':' + ("0" + d.getSeconds()).slice(-2);
    if (this.debug)
      console.log(dString + " GATE(" + this.ip + ':' + this.port + "):", msg);
    if (msgObject)
      console.log(msgObject);
  }

  /**
   * initializes gateobject and requests for alarm status and if available people counter
   * @returns {Promise}
   */

};

exports = module.exports = Reader