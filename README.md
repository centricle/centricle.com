# centricle.com

Personal portfolio for Kevin Smith. Static site built with Tailwind CSS v4, deployed on Netlify.

## Principles

- **Be real.** No strategic understatement, no positioning games. Say what's true and let it stand. This applies to experience claims, capabilities, and all client-facing communication.

## Tech Stack

- **Tailwind CSS v4** - Utility-first CSS framework
- **Browser Sync** - Local development server with live reload
- **Nodemon** - File watcher for HTML changes
- **Netlify** - Static site hosting with CDN

## Project Structure

```
src/                 # Source files
├── index.html       # Main landing page
├── pay/             # Payment pages
│   └── *.html
└── styles.css       # Tailwind CSS input

dist/                # Built files (gitignored)
├── index.html       # Processed HTML
├── pay/             # Processed payment pages
└── styles.css       # Compiled & minified CSS
```

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Development server runs at http://localhost:3000* with:
- Tailwind CSS compilation with hot reload
- HTML file watching and auto-copy to dist/
- Browser auto-refresh on changes

_[*] If port 3000 is taken, check output from `npm run dev` for the correct port._

### Available Scripts

- `npm run dev` - Start development server with live reload
- `npm run build` - Build production-ready files to dist/
- `npm run build:css` - Build and minify Tailwind CSS only
- `npm run build:html` - Copy HTML files to dist/

## Production Build

```bash
npm run build
```

Generates optimized files in `dist/`:
- Minified CSS with Tailwind v4
- All HTML files copied with structure preserved
- Ready for deployment

## Deployment

Automatically deployed to Netlify on push to `main` branch.

### Netlify Configuration

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18.x

### Cache Headers

Static assets (CSS/JS) are served with immutable cache headers for optimal performance:
```
Cache-Control: public, max-age=31536000, immutable
```

## Environment Variables

None required for basic operation. Stripe integration may require:
- `STRIPE_PUBLIC_KEY` - For payment forms (client-side only)
