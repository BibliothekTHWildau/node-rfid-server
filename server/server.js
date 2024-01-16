const express = require('express');
const cors = require('cors');
const logger = require('../logger');
//const axios = require('axios');
const pinoHTTP = require('pino-http');
const Reader = require("../index");
const config = require('../config.js');
// init readers 
const readers = {};

config.reader.forEach(r => {
  readers[r.id] = new Reader(r)
  //console.log(r.id)
});

var ISO28560_3 = {};

async function loadESModules() {
  ISO28560_3 = await import('../node_modules/iso28560-3/lib/ISO28560.js');
}
loadESModules();


var corsOptions = {
  origin: true,
  credentials: true
}

const app = express();

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(

  pinoHTTP({

    logger,

  })

);

/*app.use(function (req, res) {
  var send = res.send;
  res.send = function (body) { // It might be a little tricky here, because send supports a variety of arguments, and you have to make sure you support all of them!
      // Do something with the body...
      console.log("intercepted")
      send.call(this, body);
  };
});*/

const beforeMiddleware = function (req, res, next) {
  //console.log('Before middleware triggered');
  next();
}

/**
 * checks if query param keepOpen is set. If not connection to reader will be closed
 * @param {*} req 
 * @param {*} res 
 */
const afterMiddleware = function (req, res) {
  req.log.info(`after req.query.keepOpen ${req.query.keepOpen}`)
  //console.log("after",res.statusCode,req.params.reader,req.params.keepOpen);
  if (req.params.reader && res.statusCode != 500) {
    
    if (req.query["keepOpen"] === undefined) {
      logger.debug("send close");
      readers[req.params.reader].close()
    }
  }
}



app.get('/info/:reader?', async (req, res) => {
  try {

    // no param set - all readers
    if (!req.params.reader) {
      /*let infos = [];
      for (r in readers) {
        infos.push(readers[r]._info);
      }*/
      let infos = {};
      for (r in readers) {
        infos[readers[r].id] = readers[r]._info;
      }
      res.json(infos);
      return;
    }

    // param set but not valid
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    // return reader info
    res.json(readers[req.params.reader]._info);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }
});

app.get('/getReaderInfo/:reader', async (req, res) => {
  try {
    //console.log(req.params.reader)
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    const getReaderInfo = await (readers[req.params.reader]).getReaderInfo();

    res.json(getReaderInfo);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }
});

app.put('/cpuReset/:reader', async (req, res) => {
  try {

    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    const cpuReset = await (readers[req.params.reader]).cpuReset();

    res.json(cpuReset);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  //afterMiddleware(req, res);
});

app.put('/systemReset/:reader', async (req, res) => {
  try {

    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    const systemReset = await (readers[req.params.reader]).systemReset();

    res.json(systemReset);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  //afterMiddleware(req, res);
});


app.put('/rfOff/:reader', async (req, res) => {
  try {

    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    const rfOff = await (readers[req.params.reader]).rfOff();

    res.json(rfOff);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  afterMiddleware(req, res);
});

app.put('/afi/:reader/:uid?/:afi?', async (req, res) => {
  try {
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    let uid = null;
    let afi = null;

    // uid is in path
    if (req.params.uid) {
      uid = req.params.uid;
      // afi can be in path or body
      afi = req.body.AFI || req.body.afi || req.params.afi;

    } else {
      // uid is in body
      afi = 'AFI' in req.body ? req.body.AFI : req.body.afi;
      uid = req.body.UID || req.body.uid;
    }
    //return res.status(400).send(`afi:${afi} or uid:${uid} not given`);

    if (afi === null || uid === null) {
      return res.status(400).send(`afi:${afi} or uid:${uid} not given`);
    }

    const writeAFI = await (readers[req.params.reader]).writeAFI(uid, afi);

    res.json(writeAFI);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err.message);
  }

  afterMiddleware(req, res);
});

app.get('/afi/:reader/:uid', async (req, res) => {
  try {
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    const getSystemInformation = await (readers[req.params.reader]).getSystemInformation(req.params.uid);

    res.json(getSystemInformation);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err.message);
  }

  afterMiddleware(req, res);
});


app.get('/inventory/:reader', async (req, res) => {

  if (!readers[req.params.reader]) {
    res.status(404).send('reader not found');
    return;
  }

  try {
    const inventory = await (readers[req.params.reader]).inventory();
    logger.debug(inventory);
    res.json(inventory);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  afterMiddleware(req, res);
});

app.get('/tags/:reader', async (req, res) => {
  try {
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    const inventory = await (readers[req.params.reader]).inventory();

    for (let tag of inventory.tags) {


      const completeTag = await readers[req.params.reader].readCompleteTag(tag.IDD);
      tag = Object.assign(tag, completeTag.tag);
      if (req.query.out == "json" || req.query.json !== undefined) {
        tag.model = new ISO28560_3.default(completeTag.tag.data);

      }

    }
    logger.debug(inventory);
    res.json(inventory);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  afterMiddleware(req, res);
});

app.get('/tag/:reader/:uid', async (req, res) => {
  try {
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    const completeTag = await (readers[req.params.reader]).readCompleteTag(req.params.uid);

    if (req.query.out == "json" || req.query.json !== undefined) {
      let json = new ISO28560_3.default(completeTag.tag.data);
      completeTag.tag.model = json;
    }

    res.json(completeTag);
  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  afterMiddleware(req, res);
});

app.post('/tag/:reader/:uid?', async (req, res) => {
  try {
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    //logger.info(req.body);


    // assume req.body 
    //if (req.body) {

    let uid = req.body.UID || req.body.uid || req.params.uid;
    if (!uid) {
      return res.status(400).send('uid not given');
    }

    /**
     * UID: "e0040100153b990a"
  AFI: 7
  dataModel: "ISO28560-3"
  data: [],
  model: {}
     */

    let writeTag;
    if (!req.body.data || req.body.data.length == 0) {
      // model delivered -> transform to data
      logger.info("writeTag generating data from model from req.body")
      
      if (req.body.basicBlock) {
        // only model delivered
        let data = new ISO28560_3.default(req.body).getByte();
        writeTag = await readers[req.params.reader].writeTag(uid, 0, { data: Array.from(data) });
      } else {
        // complete tag structure
        req.body.data = Array.from(new ISO28560_3.default(req.body.model).getByte());
        writeTag = await readers[req.params.reader].writeTag(uid, 0, req.body);
      }
    } else {
      // data array delivered
      logger.info("writeTag with data from req.body")
      writeTag = await readers[req.params.reader].writeTag(uid, 0, req.body);
    }


    res.json(writeTag);


  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  afterMiddleware(req, res);
});

app.delete('/tag/:reader/:uid?', async (req, res) => {
  try {
    if (!readers[req.params.reader]) {
      res.status(404).send('reader not found');
      return;
    }

    if (req.body) {

      let uid = req.body.UID || req.body.uid || req.params.uid;
      if (!uid) {
        return res.status(400).send('uid not given');
      }

      let eraseTag;
      if (Array.isArray(req.body)) {
        eraseTag = await readers[req.params.reader].eraseTag(uid, req.body);
      } else {
        eraseTag = await readers[req.params.reader].eraseTag(uid);
      }
      res.json(eraseTag);
    }


  } catch (err) {
    logger.error(err);
    res.status(500).json(err);
  }

  afterMiddleware(req, res);
});



app.listen(config.server.httpPort, () => {
  logger.info(`Server is running on port ${config.server.httpPort}`);
});




/* Websocket */
const clients = [];

/**
 * todo or use application behind a reverse proxy, which handles authentication
 * @param {*} address 
 * @returns 
 */
function clientIsPermitted(address) {
  return true;
  // pattern is part of address
  /*if (config.permittedClients.pattern.active === true){
    if (address.indexOf(config.permittedClients.pattern.pattern) > -1)
      return true;
  }
  
  // address is in list of permitted clients
  if (config.permittedClients.list.active === true){
    if (config.permittedClients.list.list.indexOf(address) > -1)
      return true;
  }
  */
  return false;
}

// port where we'll run the websocket server
var webSocketsServerPort = config.server.wsPort; //config.mainServer.port;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');
var server = http.createServer(function (request, response) {
  // Not important for us. We're writing WebSocket server,
  // not HTTP server
});
server.listen(webSocketsServerPort, function () {
  logger.info("WS Server is listening on port "
    + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
  // WebSocket server is tied to a HTTP server. WebSocket
  // request is just an enhanced HTTP request. For more info 
  // http://tools.ietf.org/html/rfc6455#page-6
  httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function (request) {

  // prevent unknown clients 
  if (!clientIsPermitted(request.remoteAddress)) {
    logger.warn('WS Connection rejected remote: ' + request.remoteAddress);
    request.reject();
    return;
  }

  logger.info('WS Connection from origin ' + request.origin + '. Address: ' + request.remoteAddress);

  var connection = request.accept(null, request.origin);
  // we need to know client index to remove them on 'close' event
  //console.log(connection);

  var index = clients.push(connection) - 1;
  logger.debug('WS Connection accepted.');

  connection.on('message', async function (message) {

    if (message.type === 'utf8') { // accept only text
      logger.info("WS <= " + JSON.stringify(message));

      // parse msg.utf8Data to JSON
      // {\"request\":\"getTags\",\"readerId\":\"mr102@home\",\"keepOpen\":true,\"readSystemInfo\":false,\"readData\":true,\"blocksToRead\":3,\"iso\":false}
      let msg = { "type": undefined };

      try {
        msg = JSON.parse(message.utf8Data);
      } catch (exc) {
        logger.error("WS Error on JSON.parse", exc);
      }

      let response = { request: msg.request }

      if (!readers[msg.readerId]) {
        connection.sendUTF("reader not found");
        return;
      }

      switch (msg.request) {
        case "writeAFI":{

          if (!msg.tag || msg.tag.AFI === null || msg.tag.UID === null) {
            return connection.sendUTF(`afi:${JSON.stringify(msg.tag)}`);
          }
          try {
            const writeAFI = await (readers[msg.readerId]).writeAFI(msg.tag.UID, msg.tag.AFI);      
            connection.sendUTF(JSON.stringify(writeAFI));
          } catch (err){
            connection.sendUTF(JSON.stringify(err));
          }
          
          break;
        } 
        case "getTags": {
          
          try {
            const inventory = await (readers[msg.readerId]).inventory();
            for (let tag of inventory.tags) {

              if (msg.blocksToRead > 0) {
                try {
                  let rmbRespnse = await readers[msg.readerId].readMultipleBlocks(tag.IDD, 0, msg.blocksToRead)
                  tag.data = rmbRespnse.data;
                } catch (error) {
                  tag.error = error
                }
  
              } else {
                try {
                  const completeTag = await readers[msg.readerId].readCompleteTag(tag.IDD);
                  tag = Object.assign(tag, completeTag.tag);
                }
                catch (error) {
                  tag.error = error
                }
              }

              // async tag object gets sent before whole getTags is completed
              response.tag = tag;
              connection.sendUTF(JSON.stringify(response));
  
            }
            logger.debug(inventory);
            response = { request: msg.request }
            response.wsRequestComplete = true
            connection.sendUTF(JSON.stringify(response));
          } catch (error) {
            connection.sendUTF(JSON.stringify(error));
          }

          

          break;
        }
        case 'rfOff': {
          if (!readers[msg.readerId]) {
            //res.status(404).send('reader not found');
            connection.sendUTF("reader not found");
            return;
          }

          try {
            const rfOff = await (readers[msg.readerId]).rfOff();
            logger.debug(rfOff);
          } catch (err) {
            logger.error(err);
          }

          response.wsRequestComplete = true
          connection.sendUTF(JSON.stringify(response));
          break;
        }

      }


    }



  });

  // user disconnected
  connection.on('close', function (connection) {
    logger.debug("WS Peer "
      + connection + " disconnected.");

  });
});
