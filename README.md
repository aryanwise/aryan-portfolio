# Aryan Mishra — Portfolio

A responsive, cream-and-terracotta portfolio with connected project and experience cards.

## Open it

Extract this ZIP, then open `index.html` in your browser. No installation, build step, API keys, or external packages are required.

If you prefer a local server, open a terminal in the extracted `aryan-portfolio` folder and run:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000. On Windows, use `python` instead of `python3` if needed.

## Files

- `index.html` — Introduction, photo area, skills, interests, and all project/experience content.
- `styles.css` — Colors, typography, scattered card layouts, focus/blur effects, and responsive styles.
- `app.js` — Card interaction, related-card navigation, connection lines, and the About disclosure.

## Customize

Edit text and skill tags in `index.html`. Change the palette using the variables at the top of `styles.css`. The portrait area currently uses an initials monogram; replace it with your own image and update its alternative text.

To change card connections, update both the `edges` list in `app.js` and the related-card buttons in `index.html`. Keep card IDs and each button's `data-connect` value consistent.

## Interactions

- Desktop: hover to focus; click to keep a card expanded.
- Touch: tap a card to expand it; tap it again to close it.
- Use a related-card button to jump to a connected project or experience.
- Select “Show all cards” or press Escape to reset the focus effect.
- Select “Read a little more” beneath the portrait area to reveal skills and interests.
- Keyboard: use Tab to move between controls and Enter or Space to activate them.

## Publish elsewhere

Upload `index.html`, `styles.css`, and `app.js` together to any static website host, keeping them in the same directory. This bundle contains the portable website source, without repository history or account-specific hosting configuration.
