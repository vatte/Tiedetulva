#!/usr/bin/env python3
"""Build a Crossref-style work list of Ig Nobel Prize-winning publications.

improbable.com sits behind a bot check, so the winners page is read from the
Internet Archive. Each prize's references are resolved to DOIs (taken from
the page when present, otherwise matched with Crossref's bibliographic search),
and the works are then fetched from the Crossref API with the same `select` as
the main project, so the output drops straight into `getPublications()`.

Usage: python3 fetch_ig_nobel.py
Crossref often lacks abstracts (Elsevier, PLOS, BMJ... never deposit them), so
missing ones are filled from OpenAlex and then PubMed, wrapped in <jats:p> like
Crossref's own.

Outputs: publications_ig_nobel_crossref.json  (Crossref work-list response)
         publications_ig_nobel_crossref_with_abstracts.json  (only works with abstracts)
         ig_nobel_matches.json                (per-prize DOI audit trail)
"""

import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

WINNERS_URL = "https://web.archive.org/web/2026id_/https://improbable.com/ig/winners/"
CROSSREF = "https://api.crossref.org/works"
OPENALEX = "https://api.openalex.org/works"
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
SELECT = "published,DOI,title,author,abstract,container-title"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_HTML = os.path.join(HERE, "winners_cache.html")
OUT_WORKS = os.path.join(HERE, "publications_ig_nobel_crossref.json")
OUT_WORKS_ABSTRACTS = os.path.join(HERE, "publications_ig_nobel_crossref_with_abstracts.json")
OUT_MATCHES = os.path.join(HERE, "ig_nobel_matches.json")
CACHE_API = os.path.join(HERE, "crossref_cache.json")
HEADERS = {"User-Agent": "Tiedetulva-IgNobel/1.0 (python urllib)"}

DOI_RE = re.compile(r"10\.\d{4,9}/[^\s\"'<>&]+")
STOPWORDS = set("a an the of and in on for to with by from at as is are its".split())


_api_cache = json.load(open(CACHE_API, encoding="utf-8")) if os.path.exists(CACHE_API) else {}


def get_cached(url):
    """Crossref GET, cached on disk so reruns skip the ~10 minutes of searches."""
    if url not in _api_cache:
        _api_cache[url] = get(url)
        time.sleep(0.3)
    return _api_cache[url]


def get(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            if attempt == retries - 1:
                raise
            print(f"  retrying ({e})")
            time.sleep(2 * (attempt + 1))


def strip_tags(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def clean_doi(doi):
    doi = urllib.parse.unquote(re.split(r"[?#]|;jsessionid", doi, flags=re.I)[0])
    doi = re.sub(r"/(full|abstract|pdf|epdf|full-text|fulltext|meta)$", "", doi, flags=re.I)
    return doi.rstrip(".,;:)]>").lower()


def parse_winners(page):
    """Return one entry per prize: {year, prize, text, references, dois}."""
    prizes = []
    year = None
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", page, re.S):
        anchor = re.search(r'<a id="ig(\d{4})"', m.group(1))
        if anchor:
            year = int(anchor.group(1))
            prizes.append(None)  # stops text leaking across years
            continue
        if year is None:
            continue
        # Newer entries put REFERENCE and WHO ATTENDED in one <p>, split by <br>.
        for chunk in re.split(r"<br\s*/?>", m.group(1)):
            text = strip_tags(chunk)
            if not text or text.upper().startswith("WHO ATTENDED"):
                continue
            head = re.match(r"\s*<(strong|b)>(.*?)</\1>", chunk, re.S)
            head_text = strip_tags(head.group(2)).strip(" :") if head else ""
            if head_text and ("PRIZE" in head_text.upper() or re.fullmatch(r"[A-Z ,&/\-]+", head_text)):
                name = re.sub(r"^IG NOBEL |\s*\d{4}\s*$", "", head_text.split("[")[0].strip())
                prizes.append({"year": year, "prize": name.strip(), "text": "", "references": [], "dois": []})
            prize = prizes[-1] if prizes else None
            if prize is None:
                continue
            prize["text"] += " " + text
            prize["dois"] += [clean_doi(d) for d in DOI_RE.findall(html.unescape(chunk))]
            # "REFERENCE: ...", "[REFERENCE: ...]" or, in the 1990s, "[Published in ...]"
            prize["references"] += [
                r.strip() for r in re.findall(r"(?:REFERENCES?:|Published in)\s*(.*?)(?:\]|$)", text, re.I)
                if r.strip()
            ]
    prizes = [p for p in prizes if p and p["prize"] != "SPECIAL ANNOUNCEMENT"]
    for p in prizes:
        p["text"] = p["text"].strip()
        dois = list(dict.fromkeys(p["dois"]))
        # Link text is sometimes shortened ("10.1038/s4156…") next to the full href.
        p["dois"] = [d for d in dois if not any(o != d and o.startswith(d) for o in dois)]
    return prizes


def words(s):
    return [w for w in re.findall(r"[a-z0-9]+", s.lower()) if w not in STOPWORDS and len(w) > 1]


def title_matches(title, context, years, item_year):
    """The Crossref title must correspond to a quoted title on the winners page."""
    tw = set(words(title))
    if len(tw) < 3:
        return False
    year_ok = not years or item_year is None or any(abs(item_year - y) <= 2 for y in years)
    for quoted in re.findall(r"[“\"](.+?)[”“\"]", context):
        qw = set(words(quoted))
        if qw and len(tw & qw) / len(tw) >= 0.8 and len(tw & qw) / len(qw) >= 0.6:
            return year_ok
    return False


def item_year(item):
    for key in ("published", "issued", "published-print", "published-online"):
        parts = item.get(key, {}).get("date-parts", [[None]])
        if parts and parts[0] and parts[0][0]:
            return parts[0][0]
    return None


def search_doi(query, context):
    """Find a DOI for a reference with none, via Crossref bibliographic search."""
    q = urllib.parse.urlencode({
        "query.bibliographic": query[:500],
        "rows": 5,
        "select": "DOI,title,published,issued,score",
    })
    items = json.loads(get_cached(f"{CROSSREF}?{q}"))["message"]["items"]
    years = [int(y) for y in re.findall(r"\b(1[89]\d\d|20\d\d)\b", query)]
    for it in items:
        title = (it.get("title") or [""])[0]
        if title_matches(title, context, years, item_year(it)):
            return clean_doi(it["DOI"]), title
    return None, None


def fetch_works(dois):
    items = []
    dois = sorted(set(dois))
    for i in range(0, len(dois), 40):
        batch = dois[i:i + 40]
        q = urllib.parse.urlencode({
            "filter": ",".join(f"doi:{d}" for d in batch),
            "rows": 1000,
            "select": SELECT,
        })
        items += json.loads(get_cached(f"{CROSSREF}?{q}"))["message"]["items"]
    return items


def openalex_abstracts(dois):
    """DOI -> abstract, rebuilt from OpenAlex's inverted index."""
    found = {}
    for i in range(0, len(dois), 50):
        batch = [d for d in dois[i:i + 50] if "|" not in d and "," not in d]
        q = urllib.parse.urlencode({
            "filter": "doi:" + "|".join(batch),
            "per_page": 50,
            "select": "doi,abstract_inverted_index",
        })
        for work in json.loads(get_cached(f"{OPENALEX}?{q}"))["results"]:
            index = work.get("abstract_inverted_index")
            if not index or not work.get("doi"):
                continue
            positions = sorted((pos, word) for word, poss in index.items() for pos in poss)
            found[work["doi"].replace("https://doi.org/", "").lower()] = " ".join(w for _, w in positions)
    return found


def pubmed_abstracts(dois):
    """DOI -> abstract from PubMed (medical papers OpenAlex lacks)."""
    found = {}
    for i in range(0, len(dois), 20):
        term = " OR ".join(f'"{d}"[doi]' for d in dois[i:i + 20])
        q = urllib.parse.urlencode({"db": "pubmed", "term": term, "retmax": 100, "retmode": "json"})
        pmids = json.loads(get_cached(f"{EUTILS}/esearch.fcgi?{q}"))["esearchresult"]["idlist"]
        if not pmids:
            continue
        q = urllib.parse.urlencode({"db": "pubmed", "id": ",".join(pmids), "retmode": "xml"})
        root = ET.fromstring(get_cached(f"{EUTILS}/efetch.fcgi?{q}"))
        for article in root.iter("PubmedArticle"):
            doi = next((a.text for a in article.iter("ArticleId") if a.get("IdType") == "doi" and a.text), None)
            parts = []
            for t in article.iter("AbstractText"):
                text = "".join(t.itertext()).strip()
                if text:
                    parts.append(f"{t.get('Label')}: {text}" if t.get("Label") else text)
            if doi and parts:
                found[doi.lower()] = " ".join(parts)
    return found


JUNK_ABSTRACT = re.compile(
    r"doi\.org/|copyright|DOAJ is|Journals@Ovid|publisher is not responsible|\bVol(ume)?\.? \d", re.I)
ENGLISH = set("the of and to in is that for with was were this are by on as from".split())


def looks_like_abstract(text):
    """Reject OpenAlex's citation lines, site boilerplate and non-English text."""
    tokens = re.findall(r"[a-z]+", text.lower())
    if len(text) < 150 or JUNK_ABSTRACT.search(text) or not tokens:
        return False
    return sum(t in ENGLISH for t in tokens) / len(tokens) >= 0.08


def fill_abstracts(items):
    """Add missing abstracts in place; return DOI -> source of each abstract."""
    sources = {it["DOI"].lower(): "crossref" for it in items if it.get("abstract")}
    for name, lookup in (("openalex", openalex_abstracts), ("pubmed", pubmed_abstracts)):
        missing = [it["DOI"].lower() for it in items if not it.get("abstract")]
        found = lookup(missing) if missing else {}
        for it in items:
            text = found.get(it["DOI"].lower())
            if text and not it.get("abstract") and looks_like_abstract(text):
                it["abstract"] = f"<jats:p>{text}</jats:p>"
                sources[it["DOI"].lower()] = name
        added = sum(v == name for v in sources.values())
        print(f"  {name}: {added} abstracts added for {len(missing)} works")
    return sources


def work_list(items):
    return {
        "status": "ok",
        "message-type": "work-list",
        "message-version": "1.0.0",
        "message": {"facets": {}, "total-results": len(items), "items": items, "items-per-page": len(items)},
    }


def main():
    if os.path.exists(CACHE_HTML):
        page = open(CACHE_HTML, encoding="utf-8").read()
    else:
        print("Downloading winners page from the Internet Archive...")
        page = get(WINNERS_URL)
        open(CACHE_HTML, "w", encoding="utf-8").write(page)

    entries = parse_winners(page)
    print(f"Parsed {len(entries)} prizes ({sum(bool(e['dois']) for e in entries)} with DOIs on the page)")

    for n, e in enumerate(entries, 1):
        if e["dois"]:
            e["match"] = "page"
            continue
        e["match"], e["matched_titles"] = None, []
        # Without a REFERENCE line (early years), the prize text itself names the paper.
        for ref in e["references"] or [""]:
            # A bare "Journal X, vol. N" reference needs the title from the prize text.
            query = ref if "“" in ref else f"{ref} {e['text']}"
            doi, title = search_doi(query, e["text"])
            if doi and doi not in e["dois"]:
                e["dois"].append(doi)
                e["matched_titles"].append(title)
                e["match"] = "search"
        print(f"  [{n}/{len(entries)}] {e['year']} {e['prize']}: {', '.join(e['dois']) or '-'}")

    all_dois = [d for e in entries for d in e["dois"]]
    items = fetch_works(all_dois)
    found = {it["DOI"].lower() for it in items}
    print("Filling missing abstracts...")
    sources = fill_abstracts(items)
    for e in entries:
        e["in_crossref"] = [d for d in e["dois"] if d in found]
        e["abstract_sources"] = {d: sources[d] for d in e["in_crossref"] if d in sources}

    # Newest prize first, mirroring the winners page.
    order = {d: i for i, d in enumerate(dict.fromkeys(all_dois))}
    items.sort(key=lambda it: order.get(it["DOI"].lower(), 1e9))

    with_abstracts = [it for it in items if it.get("abstract")]
    json.dump(work_list(items), open(OUT_WORKS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(work_list(with_abstracts), open(OUT_WORKS_ABSTRACTS, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    json.dump(_api_cache, open(CACHE_API, "w", encoding="utf-8"))
    json.dump(entries, open(OUT_MATCHES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"\n{len(items)} works written to {os.path.basename(OUT_WORKS)}")
    print(f"{len(with_abstracts)} with abstracts written to {os.path.basename(OUT_WORKS_ABSTRACTS)}")
    print(f"Audit trail in {os.path.basename(OUT_MATCHES)}; "
          f"{sum(not e['in_crossref'] for e in entries)} prizes without a Crossref work")


if __name__ == "__main__":
    main()
