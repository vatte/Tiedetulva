import raw_data from "./publications_crossref.json";

export interface Publication {
  title: string;
  authors: string[];
  abstract: string;
  doi: string;
  journal: string | undefined;
}

export const getPublications: (raw_data?: JSON) => Publication[] = () => {
  const publications: Publication[] = [];

  for (const item of raw_data.message.items) {
    if (!item.abstract || !item.author || !item.title) continue;

    const title = item.title[0];
    const authors = item.author.map((a: any) => a.given + " " + a.family);
    const abstract = item.abstract.replace(
      /<jats:title>.*?<\/jats:title>/g,
      ""
    );
    const doi = item.DOI;
    const journal =
      item["container-title"] && item["container-title"].length > 0
        ? item["container-title"][0]
        : undefined;

    publications.push({
      title,
      authors,
      abstract,
      doi,
      journal,
    });
  }
  return publications;
};
