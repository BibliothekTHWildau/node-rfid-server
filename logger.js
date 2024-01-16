
const pino = require('pino')

const fileTransport = pino.transport({
  target: 'pino/file',
  options: { destination: `${__dirname}/logs/rfid-node.log` },
});

const debugTransport = pino.transport({
  target: 'pino-pretty',
});

module.exports = pino({
  //level: 'debug',
  level: process.env.PINO_LOG_LEVEL || 'debug',
  //transport: {
  //target: 'pino-pretty'
  //},

}, process.env.NODE_ENV !== 'production' ? debugTransport : fileTransport)

/*module.exports = {
  child: function(msg){
   return { 
    info : function (msg){ console.log("info:" + msg)},
    debug :  function (msg){ console.log("debug:" + msg)},
    error: function (msg){ console.log("error:" + msg)}
  } 
  }
}*/