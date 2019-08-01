const path = require('path');

module.exports = {
    // This is where our app starts.
    entry: './js/index.js',
    // module is where we
    // define all the rules for how webpack will deal with things.
    module: {
        // rules takes an array, each item containing the respective rules
        rules: [
            {
                // First up, our JavaScript rules.
                test: /\.js$/,
                // // Don't bother spending time transpiling your installed packages
                exclude: /node_modules/,
                // Use babel to transpile our JS.
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ["@babel/preset-env",
                                {
                                    "targets": {
                                        "chrome": "75"
                                    }
                                }],
                            "@babel/preset-react"
                        ],
                        plugins: ["@babel/plugin-proposal-class-properties"]
                    }
                }
            },
            {
                // CSS files
                test: /\.css$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' }
                ],
            },
            {
                // Some image formats so you can import images
                test: /\.(png|gif|jpg|svg)$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 50000,
                    },
                },
            },
        ],
    },
    // This is where we define how everything gets output.
    // dist is a common output folder, and it should be gitignored.
    output: {
        path: path.resolve(__dirname, 'dist/'),
        publicPath: '',
        filename: 'index.js',
        // This field determines how things are importable when installed from other
        // sources. UMD may not be correct now and there is an open issue to fix this,
        // but until then, more reading can be found here:
        // https://webpack.js.org/configuration/output/#output-librarytarget
        libraryTarget: 'umd',
    }
};

