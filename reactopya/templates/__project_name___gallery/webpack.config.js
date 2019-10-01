const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackRootPlugin = require('html-webpack-root-plugin');
var version = require('./package.json').version;

module.exports = [];

let rules = [
    {
        // First up, our JavaScript rules.
        test: /\.js$/,
        // // Don't bother spending time transpiling your installed packages
        exclude: [/node_modules/, /.*\.min\.js/],
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
                plugins: ["@babel/plugin-proposal-class-properties", "react-hot-loader/babel"]
            }
        }
    },
    {
        test: /\.html$/, loader: 'html-loader'
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
                limit: 10000000,
            },
        },
    },
];

{% if adjust_webpack_rules is defined %}
{% if adjust_webpack_rules is string %}
{{ adjust_webpack_rules }}
{% else %}
{% for item in adjust_webpack_rules -%}
{{ item }}
{% endfor %}
{% endif %}
{% endif %}

module.exports.push({
    entry: './src/index.js',
    module: {
        rules: rules
    },
    resolve: {
        // using css here caused a problem!
        extensions: ['.js', '.json', '.png', '.gif', '.jpg', '.svg'],
        alias: {
            'react-dom': '@hot-loader/react-dom',
            'reactopya': __dirname + '/reactopya_common'
        }
    },
    output: {
        path: path.resolve(__dirname, 'dist/'),
        publicPath: '',
        filename: '{{ project_name }}.js',
        // This field determines how things are importable when installed from other
        // sources. UMD may not be correct now and there is an open issue to fix this,
        // but until then, more reading can be found here:
        // https://webpack.js.org/configuration/output/#output-librarytarget
        libraryTarget: 'umd',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index_template.html',
            title: '{{ project_name }}'
        }),
        new HtmlWebpackRootPlugin()
    ],
    optimization: {
        // Create a separate file for vendor modules
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    },
    devServer: {
        contentBase: 'dist',
        port: 5050
    }
});

