---
url: https://docs.openalex.org/api-entities/institutions
title: Institutions | OpenAlex technical documentation
description: Universities and other organizations to which authors claim affiliations
access_date: 2025-08-04T22:23:04.000Z
current_date: 2025-08-04T22:23:04.595Z
---

OpenAlex technical documentation

Copy

# 🏫Institutions

Universities and other organizations to which authors claim affiliations

Institutions are universities and other organizations to which authors claim affiliations. OpenAlex indexes about 109,000 institutions.

* Get a list of OpenAlex institutions:`https://api.openalex.org/institutions`

The Canonical External ID for institutions is the ROR ID. All institutions in OpenAlex have ROR IDs.

Our information about institutions comes from metadata found in Crossref, PubMed, ROR, MAG, and publisher websites. In order to link institutions to works, we parse every affiliation listed by every author. These affiliation strings can be quite messy, so we’ve trained an algorithm to interpret them and extract the actual institutions with reasonably high reliability.

For a simple example: we will treat both “MIT, Boston, USA” and “Massachusetts Institute of Technology” as the same institution (https://ror.org/042nb2s44).

Institutions are linked to works via the `works.authorships` property.

Most papers use raw strings to enumerate author affiliations (eg "Univ. of Florida, Gainesville FL"). Parsing these determine the actual institution the author is talking about is nontrivial; you can find more information about how we do it, as well as downloading code, models, and test sets, here on GitHub.

What's next

Learn more about what you can do with institutions:

* The Institution object
* Get a single institution
* Get lists of institutions
* Filter institutions
* Search institutions
* Group institutions

PreviousGroup sourcesNextInstitution object

Last updated 8 months ago