# Repository instructions

## Runtime and verification

- Detect whether the developer machine has Node.js and npm available. If it
  does, prefer the host toolchain for faster development and verification.
- If Node.js/npm are unavailable, use Docker instead. For normal verification,
  use the Compose-built image so dependencies are cached:

  ```powershell
  docker compose run --rm app sh -c "npx tsc -b && npx vitest run && npx vite build"
  ```

- The anonymous `/app/node_modules` volume keeps Linux container dependencies
  separate from host files. Do not use the repository's host `node_modules`
  from inside the container.
- After `package.json` or `package-lock.json` changes, rebuild once with
  `docker compose build app` before verifying.
- Without a host toolchain, use `docker compose up`; with one, `npm run dev` is
  also supported.
