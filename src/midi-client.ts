import { MidiMessage } from "midi";

//create a ws connection to the midi server
const ws = new WebSocket("ws://localhost:8080");

let playingNotes: number[] = [];

export const makeNote = (pitch: number, sustain: number, velocity: number) => {
  //create a midi message
  const message: MidiMessage = [144, pitch, velocity];
  //send the message
  ws.send(JSON.stringify(message));
  //create a midi message to turn the note off
  const offMessage: MidiMessage = [128, pitch, velocity];
  //send the off message after sustain ms
  setTimeout(() => {
    ws.send(JSON.stringify(offMessage));
    playingNotes = playingNotes.filter((note) => note != pitch);
  }, sustain);
};

export const makeRandomNote = (sustain: number) => {
  //the message should contain a random note between 40 and 80
  let note = Math.floor(Math.random() * 20 + 20);
  for (let i = 0; i < 30 && playingNotes.includes(note); i++) {
    note = Math.floor(Math.random() * 20 + 20);
  }
  if (playingNotes.includes(note)) return;
  playingNotes.push(note);

  const velocity = 127 - Math.floor((100 * sustain) / 26000);
  //create a midi message
  makeNote(note, sustain - 400 /*ms audio latency*/, velocity);
};
