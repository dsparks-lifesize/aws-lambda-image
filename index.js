/**
 * Automatic Image resize, reduce with AWS Lambda
 * Lambda main handler
 *
 * @author Yoshiaki Sugimoto
 * @created 2015/10/29
 */
"use strict";

const ImageProcessor = require("./libs/ImageProcessor");
const Config         = require("./libs/Config");
const fs             = require("fs");
const path           = require("path");
const Request        = require("request");

// Lambda Handler
exports.handler = (event, context) => {
    const s3Object   = event.Records[0].s3;
    const configPath = path.resolve(__dirname, "config.json");
    const processor  = new ImageProcessor(s3Object);
    const config     = new Config(
        JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }))
    );

    var options = {
        uri : config.userEndpoint + s3Object,
        method : "PUT",
        headers: { 
            'Content-Type': 'application/json'
        }
    };

    processor.run(config)
    .then((proceedImages) => {
        console.log("OK, numbers of " + proceedImages.length + " images has proceeded.");
        //send list of resizes to User service
        options.body = JSON.stringify({"avatar":{"OK":proceedImages}});
        var s = Request(options);
        //tell lambda OK
        context.succeed("OK: " + JSON.stringify(proceedImages) + "\nwith: " + JSON.stringify(options));
    })
    .catch((messages) => {
        if ( messages === "Object was already processed." ) {
            console.log("Image already processed");
            context.succeed("Image already processed");
        } else {
            //send error message to User service
            options.body = JSON.stringify({"avatar":{"ERROR":messages}});
            var s = Request(options);
            //tell lambda fail
            context.fail("Woops, image process failed: " + messages);
        }
    });
};
