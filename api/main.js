var WebSocketServer = require('websocket').server;
var http = require('http');
 
var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});
 
wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
  return true;
}

var MAP = {};
var websocketClient = {};
var clientIndex = 0;

wsServer.on('request', function(request) {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }
  
  var connection = request.accept('crafting', request.origin);
  connection.id = clientIndex;
  websocketClient[clientIndex] = connection;
  clientIndex++;

  console.log((new Date()) + ' Connection accepted from ' + request.origin);
  connection.sendUTF(JSON.stringify(MAP));

  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      console.log('Received Message: ' + message.utf8Data);
      var voxel = JSON.parse(message.utf8Data)
      var stringKey = voxel.position.x + "," + voxel.position.y + "," + voxel.position.z;
      MAP[stringKey] = voxel;
      braodcast(message.utf8Data);
    }
    else if (message.type === 'binary') {
      console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
      connection.sendBytes(message.binaryData);
    }
  });
  connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected. Id: ' + connection.id);
      delete(websocketClient[connection.id]);
  });
});

function braodcast(utf8Data){
  for (key in websocketClient){
    websocketClient[key].sendUTF(utf8Data);
  }
}