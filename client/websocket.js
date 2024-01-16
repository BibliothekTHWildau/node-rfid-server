var websocket;
var wsPromiseResolve = null;
var wsPromiseReject = null;
var websocketServer;

var processTag;

function initWebsocket(url,onTag) {
  websocketServer = url;
  processTag = onTag;

  if (websocket)
    websocket.close();

  websocket = new WebSocket(url);
  websocket.onopen = websocketOnOpen;

  websocket.onerror = function (error) {
    console.log('WebSocket Error ', error, websocket);
  };
  websocket.onmessage = websocketOnMessage;
}

function websocketOnOpen() {
  console.log("Websocket opened to " + websocketServer);

  document.querySelectorAll('.rfid').forEach(el => {
    el.disabled = false;
  })

}

async function writeTagWS(reader,tag) {

  return new Promise((resolve, reject) => {
    let request = {
      request: "writeTag",
      readerId: reader,
      keepOpen: true,
      tag: tag
    };

    try {
      console.log(">>>", JSON.stringify(request))
      wsPromiseResolve = resolve;
      wsPromiseReject = reject;
      websocket.send(JSON.stringify(request));

    } catch (ex) {
      return reject(ex);
    }
  });
}

/**
 * 
 * @param {*} uid 
 * @param {*} afi 
 * @returns 
 */
async function secureWS(reader, uid, afi) {

  return new Promise((resolve, reject) => {
    let request = {
      request: "writeAFI",
      readerId: reader,
      keepOpen: true,
      tag: { "UID": uid, "AFI": afi }
    };

    try {
      console.log(">>>", JSON.stringify(request))
      wsPromiseResolve = resolve;
      wsPromiseReject = reject;
      websocket.send(JSON.stringify(request));

    } catch (ex) {
      return reject(ex);
    }
  });
}

/**
 * 
 * @returns 
 */
async function getTagsWS(reader) {

  return new Promise((resolve, reject) => {
    let request = {
      request: "getTags",
      readerId: reader,
      keepOpen: true,
      readSystemInfo: true,
      readData: true,
      //blocksToRead: 0,
    };
    try {
      wsPromiseResolve = resolve;
      wsPromiseReject = reject;
      console.log("websocket >>>", JSON.stringify(request))
      websocket.send(JSON.stringify(request));

    } catch (ex) {
      return reject(ex);
    }

  });
}

/**
 * 
 * @returns 
 */
async function rfOffWS(reader) {

  return new Promise((resolve, reject) => {
    let request = {
      request: "rfOff",
      readerId: reader,
      keepOpen: true,
    };
    try {
      console.log(">>>", JSON.stringify(request))
      wsPromiseResolve = resolve;
      wsPromiseReject = reject;
      websocket.send(JSON.stringify(request));

    } catch (ex) {
      return reject(ex);
    }

  });
}

/**
 * 
 * @param {*} e 
 * @returns 
 */
function websocketOnMessage(e) {

  console.log(e)

  let response = JSON.parse(e.data);


  console.log("<<<", response)


  switch (response.request) {
    case "writeAFI": {
      if (response.error) {
        return wsPromiseReject(response);
      }

      return wsPromiseResolve(response);
    } break;

    case "getTags": {
      // websocket sends tags when discovered and bundles them in a complete (wsRequestComplete) response afterwards
      if (response.wsRequestComplete) {
        if (response.error) {
          return wsPromiseReject(response);
        }

        return wsPromiseResolve(response);
      }

      // async tag response for each tag
      if (response.tag)
        processTag(response.tag);

    } break;
    
    default:
      console.error("response not implemented in websocketOnMessage", response)
  }

  // this happens on connect error, no request is set inresponse
  if (response.error) {
    return wsPromiseReject(response);
  }

};



function closeWebsocket() {
  rfOffWS();
  if (websocket)
    websocket.close();
}

export { initWebsocket, getTagsWS, rfOffWS, secureWS }




