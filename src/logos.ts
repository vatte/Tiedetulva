export const logos: HTMLImageElement[] = [];

for (let i = 1; i <= 20; i++) {
  const logo = new Image();
  logo.src = "logos/Artboard " + i + "a.png";
  logos.push(logo);
}

export const runWhenLogosLoaded = async () => {
  //wait for all logos to load
  await Promise.all(
    logos.map(
      (logo) =>
        new Promise((resolve) => {
          logo.onload = resolve;
        })
    )
  );
};
