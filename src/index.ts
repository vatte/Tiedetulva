import { runWhenLogosLoaded } from "./logos";
import { startShow } from "./main";
import { playHelloSound } from "./audio";
import { updatePublications } from "./makePaper";
import { restartShow } from "./main";

const logosLoadedPromise = runWhenLogosLoaded();

const play = async () => {
  document.getElementById("playButton")?.style.setProperty("display", "none");
  playHelloSound();
  await logosLoadedPromise;
  startShow();
};

let timer: NodeJS.Timeout;
const showMenu = () => {
  const menu = document.getElementById("menu");
  menu!.style.display = "block";
  clearTimeout(timer);
  setTimeout(() => {
    menu!.style.display = "none";
  }, 3000); // Hide after inactivity
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
  document.getElementById("playButton")?.addEventListener("click", play);

  window.addEventListener("mousemove", showMenu);

  document.getElementById("aboutButton")?.addEventListener("click", showAbout);
  document.getElementById("closeButton")?.addEventListener("click", closeAbout);

  document.getElementById("fileInput")?.addEventListener("change", uploadFile);
});
