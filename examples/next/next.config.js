/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverActions: true, //set to false and remove 'use server' in actions.ts to disable server actions
    },
  }

module.exports = nextConfig
