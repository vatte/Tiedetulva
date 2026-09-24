# Tiedetulva / Science flood installation

In this installation scientific publications flow from the distance towards the visitor.

In the ocean mode the papers float face down, title towards the viewer, on a rippling water surface that slowly flows towards a break point in front of the viewer, where the papers arrive one at a time. At each arrival a wave breaks like a tsunami: the paper lifts up on a towering wave with its top rolled back, unrolls towards the viewer and crashes down upright close to the viewer so that it can be read. Its colors invert, and it drifts towards the viewer while ripples wash over it, slowing down until it has faded out. Each wave break plays a synthesized wave sound (or a random one of your own sound files, see `SOUND.SAMPLE_FILES`).

All adjustable parameters (camera, ocean density and speed, waves, splash timing, sound, paper appearance) are in `src/params.ts`. Rebuild with `npm run build` after changing them.

Publications are stored in the `publications.crossref` file, which is retrieved from the Crossref API with for example the following command:

```
curl -o publications_crossref.json 'https://api.crossref.org/works?rows=1000&filter=from-pub-date:2024-01-18,until-pub-date:2024-01-25,has-abstract:true&select=DOI,title,author,abstract,container-title'
```

See `package.json` for running and building commands.
