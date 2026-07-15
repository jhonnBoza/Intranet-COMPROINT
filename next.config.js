/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // no revelar "X-Powered-By: Next.js"
  webpack: (config) => {
    // pdfjs-dist intenta requerir "canvas" (solo Node). No lo necesitamos en el navegador.
    config.resolve.alias.canvas = false;
    return config;
  },
  async headers() {
    // Cabeceras de seguridad para toda la app.
    const seguridad = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
    ];
    return [{ source: "/:path*", headers: seguridad }];
  },
};

module.exports = nextConfig;
