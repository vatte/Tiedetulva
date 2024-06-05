import { runWhenLogosLoaded } from "./logos";
import { startShow } from "./main";
import { playHelloSound } from "./audio";
import { updatePublications } from "./makePaper";
import { restartShow } from "./main";

const logosLoadedPromise = runWhenLogosLoaded();

const showPlayButton = () => {
  document.getElementById("playButton")?.style.setProperty("display", "block");
};
const hidePlayButton = () => {
  document.getElementById("playButton")?.style.setProperty("display", "none");
};

const hideMouseCursorWhenInactive = () => {
  let timeout: NodeJS.Timeout;

  document.body.style.cursor = "none";

  window.addEventListener("mousemove", () => {
    // Show the cursor
    document.body.style.cursor = "auto";

    // Clear the existing timeout
    clearTimeout(timeout);

    // Set a new timeout
    timeout = setTimeout(() => {
      // Hide the cursor
      document.body.style.cursor = "none";
    }, 5000); // 5000 milliseconds = 5 seconds
  });
};

const play = async () => {
  hidePlayButton();
  hideMenu();
  playHelloSound();
  await logosLoadedPromise;
  startShow();
  hideMouseCursorWhenInactive();
};

let timer: NodeJS.Timeout | null = null;
const showMenuForAWhile = () => {
  showMenu();
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    hideMenu();
  }, 3000); // Hide after inactivity
};

const showMenu = () => {
  document.getElementById("menu")!.style.display = "block";
};
const hideMenu = () => {
  document.getElementById("menu")!.style.display = "none";
};

const showAbout = () => {
  document.getElementById("about")!.style.display = "block";
  document.getElementById("main")!.style.display = "none";
};

const closeAbout = () => {
  document.getElementById("about")!.style.display = "none";
  document.getElementById("main")!.style.display = "block";
};

const uploadFile = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = JSON.parse(event.target?.result as string);
        updatePublications(fileContent);
        if (document.getElementById("playButton")?.style.display === "none") {
          closeAbout();
          restartShow();
        } else {
          closeAbout();
          play();
        }
      } catch (e) {
        alert(e);
      }
    };

    // Assuming 'file' is a File object you got from a file input or a drag-and-drop operation
    reader.readAsText(file);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  showPlayButton();
  showMenu();
  document.getElementById("playButton")?.addEventListener("click", play);

  window.addEventListener("mousemove", showMenuForAWhile);
  window.addEventListener("touchstart", showMenuForAWhile);

  document.getElementById("aboutButton")?.addEventListener("click", showAbout);
  document.getElementById("closeButton")?.addEventListener("click", closeAbout);

  document.getElementById("fileInput")?.addEventListener("change", uploadFile);
});
