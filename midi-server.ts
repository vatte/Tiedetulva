//import node-midi
import * as midi from "midi";
//import ws
import * as WebSocket from "ws";
//import express static
import express from "express";
import * as http from "http";

//serve the dist folder
const app = express();
app.use(express.static("dist"));

// Create an HTTP server with the Express application
const server = http.createServer(app);
server.listen(8080, () => console.log("listening on port 8080"));

//create virtual midi output
const output = new midi.Output();
output.openVirtualPort("tiedetulva");

//listen for websocket connections
const wss = new WebSocket.Server({ server });
wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const msg = JSON.parse(message.toString());
    console.log(msg);
    //send output on channel 5
    msg[0] = msg[0] | 4;
    output.sendMessage(msg);
  });
});
