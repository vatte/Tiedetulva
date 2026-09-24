import { logos } from "./logos";
import { Publication } from "./crossref_parser";
import { roundRect } from "./helpers";
import { PAPER } from "./params";

const {
  FONT_SIZE_TITLE,
  FONT_SIZE_AUTHOR,
  FONT_SIZE_ABSTRACT,
  FONT_FAMILY,
  COLORS: paperColors,
} = PAPER;

const getLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  //make regexp to remove all html tags
  const regexp = /<[^>]*>/g;
  text = text.replace(regexp, "");
  var words = text.split(" ");
  var lines = [];
  var currentLine = words[0];

  for (var i = 1; i < words.length; i++) {
    var word = words[i];
    var width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

const getLines2 = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth1: number,
  maxWidth2: number
) => {
  //make regexp to remove all html tags
  const regexp = /<[^>]*>/g;
  text = text.replace(regexp, "");
  var words = text.split(" ");
  var lines = [];
  var currentLine = words[0];

  for (var i = 1; i < words.length; i++) {
    var word = words[i];
    var width = ctx.measureText(currentLine + " " + word).width;
    const maxWidth = lines.length < 5 ? maxWidth1 : maxWidth2;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      //hyphenate title
      var shortenedWord = word;
      while (width > maxWidth && shortenedWord.length > 0) {
        shortenedWord = word.substring(0, shortenedWord.length - 1);
        const remainingWord = word.substring(shortenedWord.length);
        //check if shortened word has vowel and remaining word begins with a consonant followed by a vowel
        if (
          /[aeiouy]/.test(shortenedWord) &&
          remainingWord.length > 1 &&
          !/[aeiouy]/.test(remainingWord[0]) &&
          /[aeiouy]/.test(remainingWord[1])
        ) {
          width = ctx.measureText(currentLine + " " + shortenedWord).width;
        }
      }
      if (shortenedWord.length > 0) {
        currentLine += " " + shortenedWord + "-";
        lines.push(currentLine);
        currentLine = word.substring(shortenedWord.length);
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
  }
  lines.push(currentLine);
  return lines;
};

export interface PaperStyle {
  color: string;
  logo: HTMLImageElement;
}

export const randomPaperStyle = (): PaperStyle => ({
  color: paperColors[Math.floor(Math.random() * paperColors.length)],
  logo: logos[Math.floor(Math.random() * logos.length)],
});

export const drawPaperToCanvas = (
  publication: Publication,
  style: PaperStyle = randomPaperStyle()
) => {
  const canvas = document.createElement("canvas");
  const upscale = PAPER.CANVAS_UPSCALE;

  canvas.width = 210 * upscale;
  canvas.height = 297 * upscale;

  //draw the publication title to canvas
  const ctx = canvas.getContext("2d");
  if (ctx == null) {
    throw new Error("Could not get a 2d context for drawing a paper");
  }

  let yPosition = 40 * upscale;
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = style.color;
  //draw a rounded rectangle
  ctx.beginPath();
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 4 * upscale);
  ctx.fill();
  ctx.closePath();
  ctx.fillStyle = "black";
  ctx.font = `${FONT_SIZE_TITLE * upscale}px ${FONT_FAMILY}`;

  getLines2(
    ctx,
    publication.title,
    canvas.width - 100 * upscale,
    canvas.width - 40 * upscale
  ).forEach((line) => {
    ctx.fillText(line, 20 * upscale, yPosition);
    yPosition += FONT_SIZE_TITLE * upscale;
  });
  yPosition += FONT_SIZE_ABSTRACT * upscale;

  //draw the publication authors to canvas
  ctx.font = `italic ${FONT_SIZE_AUTHOR * upscale}px ${FONT_FAMILY}`;
  getLines(
    ctx,
    publication.authors.join(", "),
    canvas.width - 40 * upscale
  ).forEach((line) => {
    ctx.fillText(line, 20 * upscale, yPosition);
    yPosition += FONT_SIZE_AUTHOR * upscale;
  });

  yPosition += FONT_SIZE_ABSTRACT * upscale;

  //draw the publication abstract to canvas
  ctx.font = `${FONT_SIZE_ABSTRACT * upscale}px ${FONT_FAMILY}`;
  getLines(ctx, publication.abstract, canvas.width - 40 * upscale).forEach(
    (line) => {
      ctx.fillText(line, 20 * upscale, yPosition);
      yPosition += FONT_SIZE_ABSTRACT * upscale;
    }
  );

  //draw the publication logo to canvas
  ctx.drawImage(
    style.logo,
    canvas.width - 80 * upscale,
    20 * upscale,
    60 * upscale,
    60 * upscale
  );

  return canvas;
};
