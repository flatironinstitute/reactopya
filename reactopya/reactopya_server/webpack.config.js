const path = require('path');
const webpack = require('webpack');

module.exports = [
    {
        entry: ['./server/main.js'],
        target: 'node',
        output: {
            filename: 'server.js',
            path: path.resolve(__dirname, 'dist')
        },
        module: {
            rules: []
        },
        plugins: [
            new webpack.BannerPlugin({
              banner: '#!/usr/bin/env node',
              raw: true,
            }),
        ],
    }
];
