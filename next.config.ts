import type { NextConfig } from 'next';

const basePath = process.env.BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages already mounts the artifact at the repository path. vinext's
  // static exporter currently omits index.html when Next basePath is set, so
  // only prefix asset URLs and keep the exported route at the artifact root.
  assetPrefix: basePath || undefined,
  trailingSlash: true,
};

export default nextConfig;
