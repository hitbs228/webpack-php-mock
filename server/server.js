/**
 * @fileOverview The proxy serve instance.
 * @author chenckang@gmail.com
 */

'use strict';

var express = require('express');
var path = require('path');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer();
var fs = require('fs');

var cwdSpace = process.cwd();

var app = express();

module.exports = {
    parseCookie: function (file, opts) {
        var cookieFile = fs.readFileSync(file);
        var cookies = cookieFile.toString().split(';');

        return cookies.map(function (item, idx, arr) {
            return item.trim();
        });
    },
    run: function (config) {
        var me = this;
        app.use(express.static(config.root));

        config.rewrite.paths.forEach(function (item, idx, arr) {
            var method = item.method || 'all';
            var cookie = item.cookie;
            var cValues = cookie && cookie.values;
            var type = item.mime || 'text/plain';
            var cookies;

            if (cookie) {
                var file = cookie.file;
                var opts = cookie.opts;

                cookies = me.parseCookie(file, opts);
            }

            if (cValues instanceof Array) {
                cValues.forEach(function (item, idx, arr) {
                    if (!~cookies.indexOf(item.trim())) {
                        cookies.push(item.trim());
                    }
                });
            }

            app[method](item.from, function (req, res) {
                if (cookies) {
                    req.headers.cookie = cookies.join(';');
                }

                if ('local' === item.type) {
                    var resText = fs.readFileSync(
                        path.join(config.jsons.path, item.to)
                    );
                    res.type(type);
                    res.send(resText);
                    return;
                }

                proxy.web(req, res, {
                    target: item.to
                });
            });
        });

        proxy.on('error', function (e) {
            console.log('Cound not connect to proxy, please try again...');
        });

        app.listen(config.server.port, function () {
            console.log("Server is running on port: " + config.server.port);
        });
    }
};
