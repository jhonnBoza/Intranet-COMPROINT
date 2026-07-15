/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist intenta requerir "canvas" (solo Node). No lo necesitamos en el navegador.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
