const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
};

const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during bundling
  silent: true,
  org: "susuchain",
  project: "web-app",
};

const sentryOptions = {
  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11
  transpileClientSDK: false,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Hides source maps from visitors
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  automaticVercelMonitors: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions);
