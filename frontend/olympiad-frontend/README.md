# Olympiad frontend

The frontend is a React application built with Vite.

## Requirements

- Node.js 22.12 or later
- npm

## Development

From this directory, install dependencies and start the development server:

```sh
npm install
npm run dev
```

Set `REACT_APP_API_URL` to the backend URL when it differs from
`http://127.0.0.1:8000`. This variable name is retained for compatibility with
existing deployments.

The backend Cloudinary signature endpoint also requires
`CLOUDINARY_UPLOAD_PRESET`. Configure it as a signed preset with the appropriate
upload restrictions; do not expose Cloudinary API secrets in frontend variables.

## Validation and production build

```sh
npm test
npm run build
```

The production site is generated in `dist/`. Vercel is configured to serve that
directory and route client-side paths back to the application entry point.
