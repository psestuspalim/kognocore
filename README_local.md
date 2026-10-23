# Run Kognocore locally

Install Node.js 24 and npm. The old `.local-node` Node.js 20 bundle is no longer supported.

From the project directory:

```sh
npm ci
npm run dev
```

On Bash, `./start_project.sh` checks the Node.js version and starts the application.

Validation:

```sh
npm test
npm run build
npm audit
```

Tailwind CSS 4 is configured in `src/index.css` and `postcss.config.js`.
Mermaid 12 requires modern browsers, including Safari 17.4 or newer.