"use strict"

const configuration = {
        public_port: 10000,
        public_url: '127.0.0.1',
        enable_gzip: process.env.ENABLE_GZIP === 'true',
        google_backend_api_key: 'AIzaSyCmXajz3vNgq7IePWTChGHWHiM3iz9VS_I',
        google_frontend_api_key: 'AIzaSyALJENiOZgcfe8GjRrheIysr5WxiExW-s0'
}

module.exports = configuration
