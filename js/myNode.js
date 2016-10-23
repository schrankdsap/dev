/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0*/
"use strict";
var express = require("express");
var xssec = require("sap-xssec");
var passport = require("passport");
var xsHDBConn = require("sap-hdbext");
var xsenv = require("sap-xsenv");
var async = require("async");

module.exports = function() {
	var app = express();
	passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
		uaa: {
			tag: "xsuaa"
		}
	}).uaa));
	app.use(passport.initialize());

	app.use(
		passport.authenticate("JWT", {
			session: false
		}),
		xsHDBConn.middleware());

	//Hello Router
	app.route("/")
		.get(function(req, res) {
			res.send("Hello World Node.js");
		});

	//Simple Database Select - In-line Callbacks
	app.route("/dummy")
		.get(function(req, res) {
			var client = req.db;
			client.prepare(
				"select SESSION_USER from \"dev.db.data::DUMMY\" ",
				function(err, statement) {
					statement.exec([],
						function(err, results) {
							if (err) {
								res.type("text/plain").status(500).send("ERROR: " + err);
							} else {
								var result = JSON.stringify({
									Objects: results
								});
								res.type("application/json").status(200).send(result);
							}
						});
				});
		});

	//Simple Database Select - Async Waterfall
	app.route("/dummy2")
		.get(function(req, res) {
			var client = req.db;
			async.waterfall([

				function prepare(callback) {
					client.prepare("select SESSION_USER from \"dev.data::DUMMY\" ",
						function(err, statement) {
							callback(null, err, statement);
						});
				},

				function execute(err, statement, callback) {
					statement.exec([], function(execErr, results) {
						callback(null, execErr, results);
					});
				},
				function response(err, results, callback) {
					if (err) {
						res.type("text/plain").status(500).send("ERROR: " + err);
					} else {
						var result = JSON.stringify({
							Objects: results
						});
						res.type("application/json").status(200).send(result);
					}
					callback();
				}
			]);
		});

	return app;
};