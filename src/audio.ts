import tones from "./tones.json";

export const playNote = (duration: number, delay: number) => {
  const filesPadding = 9; //files have 9 seconds of padding after the midi note ends

  //convert the note duration from ms to seconds and add the padding
  const durationSeconds = duration / 1000 + filesPadding;

  // Sort the tones array based on the absolute difference between the tone duration and the given duration
  const sortedTones = tones.sort(
    (a, b) =>
      Math.abs(a.duration - durationSeconds) -
      Math.abs(b.duration - durationSeconds)
  );
  // The first element of the sorted array is the tone with the closest duration
  const tone = sortedTones[0];
  // If the tone is null, return
  if (tone == null) {
    console.log("No tone found for duration: " + duration);
    return;
  }
  const audio = new Audio("/sounds/" + tone.filename);

  setTimeout(() => {
    audio.play();
  }, delay);
};

export const playHelloSound = () => {
  const audio = new Audio("/sounds/hello.mp3");
  audio.play();
};
