# diffuse-systems.com

The marketing site. Hand-written HTML, one stylesheet, one script, no build
step and nothing to install. Any static server will do.

```bash
python3 -m http.server 3001    # http://localhost:3001
```

The documentation is a separate repository and a separate domain,
`docs.diffuse-systems.com`. Links between the two sites are absolute on
purpose, because they cross an origin.

## Publishing

A push to `main` publishes to GitHub Pages. The repository root is the site,
so a file added here appears at the matching path on the domain. `CNAME` holds
the domain and must stay at the root.

## Rules this site follows

**Nothing loads from a third party.** The eight WOFF2 faces are served from
our own origin, there is no analytics, no tag manager, no CDN and no embed.
The only network requests a visitor's browser makes are to this host. A
product that sells sovereignty cannot have a site that phones somebody else.

**No performance figure that has not been measured** on hardware we can name.

**No emoji, no em dash.**

## The typefaces

- **Titillium Web** (SIL OFL 1.1) for headings, subset to the characters the
  site actually uses: 1.48 MB of source became 87 KB of WOFF2.
- **Roboto** and **Roboto Condensed** (Apache 2.0) for body text and technical
  labels.

Both licences sit beside the files in `assets/fonts/`.

## Third-party marks

The "supported technology" band shows vendor logos from Simple Icons, which
publishes them under CC0. They identify platforms Diffuse Enterprise runs on.
They are not an endorsement and the vendors have not reviewed anything here.

## Licence

Proprietary. Diffuse Open, referenced from the documentation, is AGPL-3.0 and
lives in its own repository.
