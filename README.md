# Tiedetulva / Science flood installation

In this installation scientific publications flow from the distance towards the visitor.

Publications are stored in the `publications.crossref` file, which is retrieved from the Crossref API with for example the following command:

```
curl -o publications_crossref.json 'https://api.crossref.org/works?rows=1000&filter=from-pub-date:2024-01-18,until-pub-date:2024-01-25,has-abstract:true&select=DOI,title,author,abstract,container-title'
```

See `package.json` for running and building commands.
