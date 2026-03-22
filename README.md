# Dashivine Site

This project is now a small hostable site with:

- A proper landing page at `index.html`
- Responsive static story pages
- A 10-question quiz scored out of 100 percent
- A final question page that leads into a dramatic final reveal
- A lightweight Node server for local hosting

## Files

- `index.html`: landing page
- `page1-intro.html`: mirror entry page for the original file name
- `page2-quirks.html`: the "little things" write-up
- `page3-photos.html`: photo memory page
- `page4-quiz.html`: 10-question quiz
- `page5-question.html`: score reveal plus transition page
- `page6-question.html`: the actual ask with the runaway no button
- `page7-celebration.html`: final reveal page
- `about-david.html`: placeholder about page for your later write-up
- `theme.css`: shared styling for the full site
- `server.js`: static server for local hosting
- `.env.example`: optional environment template from earlier experiments

## Run locally

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env` and fill in your values.
3. Run `node server.js`.
4. Open `http://localhost:8080`.

## Add your own content later

- Replace the copy in `page2-quirks.html` with your exact write-up
- Replace the photo placeholders in `page3-photos.html` with real images
- Update the quiz questions in `page4-quiz.html` if you want different ones
- Replace the placeholder content in `about-david.html` when you send your write-up
