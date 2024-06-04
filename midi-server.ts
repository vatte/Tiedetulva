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

    //if message is note on, send a recordstart button press
    if (msg[0] == 144) {
      console.log("recordstart");
      output.sendMessage([176, 102, 127]);
    }
    // if message is note off, send a recordstop button press
    if (msg[0] == 128) {
      setTimeout(() => {
        console.log("recordstop");
        output.sendMessage([176, 103, 127]);
      }, 9000);
    }

    //send output on channel 5
    msg[0] = msg[0] | 4;

    output.sendMessage(msg);
  });
});
