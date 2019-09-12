import React from "react";
import ReactDOM from "react-dom";
import MainWindow from "./components/MainWindow";
const config = require('../reactopya.config.json');

const ReactopyaClient = require('./ReactopyaClient');

function parse_url_params() {
	var match;
	var pl     = /\+/g;  // Regex for replacing addition symbol with a space
	var search = /([^&=]+)=?([^&]*)/g;
	var decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
	var query  = window.location.search.substring(1);
	var url_params = {};
	while (match = search.exec(query))
		url_params[decode(match[1])] = decode(match[2]);
	return url_params;
}


const main = () => {
    if (!window.using_electron) {
        window.reactopya_client = new ReactopyaClient();
        window.reactopya_client.connect(`ws://${window.location.host}`);
    }

    setTimeout(function() {
        let url_params = parse_url_params();
        ReactDOM.render((
            <MainWindow config={config} />
        ),
            document.getElementById("root")
        );
    }, 100);
}

main();