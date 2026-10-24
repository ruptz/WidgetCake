/**
 * Static export. The site is one page of text and a working copy of the
 * launcher; there is no server, no database and nothing to render per
 * request, so Vercel serves plain files.
 *
 * `images.unoptimized` is required by `output: 'export'`; every raster on the
 * page is already sized for its slot.
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* The launcher has its own lockfile one level up, so say which one is ours
     rather than letting the bundler infer the workspace root. */
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
