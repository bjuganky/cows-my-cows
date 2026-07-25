# Cows My Cows

A free, mobile-friendly scorekeeper for the road game.

## Run it

Open `index.html` in a browser.

For a public website, upload the folder to any static host:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

No build command or paid service is required.

## Included automation

- Cow claims
- Cemetery and insurance
- Church doubling
- Roadside burial
- Bank deposits and withdrawals
- Cow rustling
- Burger Time
- Casino randomizer
- False-call penalties
- Moving-company score swaps
- Bonus-rule purchases and replacement
- Drive changes and four-drive insurance expiration
- Undo, autosave, and JSON backup/import

## Assumptions used

- Percentage calculations round up.
- Burger Time increases the running Whataburger count, then makes every other player pay the caller that many current cows, capped by each player's available current cows.
- The casino loss wheel uses 5%, 10%, 20%, 25%, 50%, 75%, or 100%.
- “Four-day insurance” is represented as four drives because the app tracks drives.
- Banked cows are unaffected by multipliers, swaps, theft, and losses.
- Calls, negations, ties, voting, and Mao-rule enforcement happen in person.

## Live multi-phone syncing

This version saves to one device. For simultaneous score updates on every phone, connect the same interface to Firebase or Supabase.
