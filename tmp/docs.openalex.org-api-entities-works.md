---
url: https://docs.openalex.org/api-entities/works
title: Works | OpenAlex technical documentation
description: Journal articles, books, datasets, and theses
access_date: 2025-08-04T22:23:01.000Z
current_date: 2025-08-04T22:23:01.954Z
---

OpenAlex technical documentation

Copy

# 📄Works

Journal articles, books, datasets, and theses

Works are scholarly documents like journal articles, books, datasets, and theses. OpenAlex indexes over 240M works, with about 50,000 added daily. You can access a work in the OpenAlex API like this:

* Get a list of OpenAlex works:`https://api.openalex.org/works`

That will return a list of `Work` object, describing everything OpenAlex knows about each work. We collect new works from many sources, including Crossref, PubMed, institutional and discipline-specific repositories (eg, arXiv). Many older works come from the now-defunct Microsoft Academic Graph (MAG).

Works are linked to other works via the `referenced_works` (outgoing citations), `cited_by_api_url` (incoming citations), and `related_works` properties.

What's next

Learn more about what you can do with works:

* The Work object
* Get a single work
* Get lists of works
* Filter works
* Search for works
* Group works
* Get N-grams

PreviousEntities overviewNextWork object

Last updated 2 months ago