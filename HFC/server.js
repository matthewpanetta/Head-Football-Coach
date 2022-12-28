const fs = require("fs");
const path = require("path");

const express = require("express");
const app = express();

const cache_time = 1;

const port = 5515;

const mimeTypes = {
	".bmp": "image/bmp",
	".css": "text/css",
	".gif": "image/gif",
	".html": "text/html",
	// ".ico": "image/x-icon",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".js": "text/javascript",
	".json": "application/json",
	".map": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webmanifest": "application/manifest+json",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

const static_suffix = new Set([
	'.json',
	'.css',
	'.js',
	'.png',
	'.njk',
	'.css',
	'.woff',
	'.woff2',
	'.eot',
	'.ttf',
]);

const send_file = (res, filename) => {
	// const filePath = path.join("build", filename);
	const filePath = filename;
	// console.log('filename', filename)
	if (fs.existsSync(filePath)) {
		const ext = path.extname(filename);
		if (mimeTypes[ext]) {
			res.writeHead(200, { "Content-Type": mimeTypes[ext] });
		} else {
			console.log(`Unknown mime type for extension ${ext}`);
		}

		fs.createReadStream(filePath).pipe(res);
	} else {
		console.log(`404 ${filename}`);
		res.writeHead(404, {
			"Content-Type": "text/plain",
		});
		res.end("404 Not Found");
	}
};

const send_url = (req, res) => {
	res.set("Cache-Control", `public, max-age=${cache_time}`);
	send_file(res, __dirname + "/frontend/" + req.url.substr(1));
};
const send_index = (req, res) => {
	send_file(res, __dirname + "/frontend/static/html_templates/index/index/base.html");
};

app.get('*', (req, res) => {
	console.log('req.url', req.url)
	
	let url_suffix_list = [3,4,5,6].map(len => req.url.substring(req.url.length - len))

	if (url_suffix_list.some(suffix_option => static_suffix.has(suffix_option))) {
		send_url(req, res);
	} else {
		send_index(req, res);
	}
});

app.listen(process.env.PORT || 5515, () =>
  console.log("Server running on port", process.env.PORT || 5515, " from ", __dirname)
);