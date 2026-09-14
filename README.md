# Together We Compete — website

Static site. Plain HTML, CSS, and one small JavaScript file. No build step.

## Files

```
index.html          home: hero, what we do, donate band, next events
donate.html         what we accept, drop-off, the form
events.html         full events list and how event days work
about.html          why we do this, founders, contact
css/styles.css      styles, mobile first
js/main.js          nav toggle, events loader, form guard
js/ball.js          spinning basketball in the hero (raw WebGL, no deps)
data/events.json    upcoming events (edit this, not the HTML)
assets/logo.svg     header logo (placeholder, replace with the real file)
assets/favicon.svg  browser tab icon
```

## Preview locally

The events list loads `data/events.json` with `fetch`, which browsers block on `file://`. Serve the folder over HTTP instead:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

**GitHub Pages:** push this folder to a repo, then Settings → Pages → deploy from the `main` branch, root folder. The `.nojekyll` file is already there.

**Netlify:** drag the folder onto app.netlify.com, or connect the repo. Publish directory is the folder root. No build command.

## Adding an event

Add an object to the array in `data/events.json`:

```json
{
  "id": "soccer-oct-2026",
  "title": "Community soccer day",
  "sport": "Soccer",
  "date": "2026-10-10",
  "start_time": "10:00 AM",
  "end_time": "1:00 PM",
  "location_name": "Example Park",
  "address": "Boyle Heights, Los Angeles",
  "signup_url": "https://forms.example.com/...",
  "signup_label": "Sign up"
}
```

`date` must be `YYYY-MM-DD`. Events with a date before today are hidden automatically. Leave `signup_url` empty to hide the link. If the array is empty, the page shows the empty state.

## Shared header and footer

There is no build step, so the header and footer are copied into each of the four HTML files. If you change a nav link, change it in all four. Each page marks its own nav link with `aria-current="page"`.

## Things left for you to fill in

Search the code for `TODO` and `PLACEHOLDER` to find each one.

1. **Logo.** Replace `assets/logo.svg` with the real file. The header shows it at 28px tall; adjust `.logo img` in the CSS if the real logo needs a different height.
2. **Founder photos.** Save them as `assets/founders/jordan.jpg`, `lucas.jpg`, and `ethan.jpg`. Square or portrait, at least 800px wide. Until a file exists its slot is hidden.
3. **Drop-off details.** The address is in. Add where on campus and what days or hours on `donate.html`.
4. **Form endpoint.** The `action` attribute on `<form id="gear-form">` in `donate.html`. Netlify Forms or Formspree both work without a build step. See the comment above the form.
5. **Events.** Replace the two placeholder entries in `data/events.json` or delete them.

## Cache busting

Each page links the stylesheet and scripts with a `?v=` tag. Bump it whenever you change CSS or JS so visitors get the new file instead of a cached one:

```bash
V=$(git rev-parse --short HEAD); sed -i '' -E "s/\?v=[a-z0-9]+/?v=$V/g" index.html donate.html events.html about.html
```
