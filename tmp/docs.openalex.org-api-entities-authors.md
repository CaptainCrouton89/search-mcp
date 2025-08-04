---
url: https://docs.openalex.org/api-entities/authors
title: Authors | OpenAlex technical documentation
description: People who create works
access_date: 2025-08-04T22:23:02.000Z
current_date: 2025-08-04T22:23:03.936Z
---

OpenAlex technical documentation

Copy

# 👩Authors

People who create works

Authors are people who create works. You can get an author from the API like this:

* Get a list of OpenAlex authors:`https://api.openalex.org/authors`

The Canonical External ID for authors is ORCID; only a small percentage of authors have one, but the percentage is higher for more recent works.

Our information about authors comes from MAG, Crossref, PubMed, ORCID, and publisher websites, among other sources. To learn more about how we combine this information to get OpenAlex Authors, see Author Disambiguation.

Authors are linked to works via the `works.authorships` property.

What's next

Learn more about what you can with authors:

* The Author object
* Get a single author
* Get lists of authors
* Filter authors
* Search authors
* Group authors

PreviousGet N-gramsNextAuthor object

Last updated 7 months ago