const fs = require("fs");
const path = require("path");

const express = require("express");
const college_app = express();
const pro_app = express();

let cache_time = 1;

const college_port = 5515;
const pro_port = 1151;

const mimeTypes = {
	".bmp": "image/bmp",
	".css": "text/css",
	".gif": "image/gif",
	".html": "text/html",
	".njk": "text/html",
	".ico": "image/x-icon",
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
	'.svg',
	'.woff',
	'.woff2',
	'.eot',
	'.ttf',
]);

const asset_suffix = [
	'png',
];

const send_file = (res, filename) => {
	// const filePath = path.join("build", filename);
	const filePath = filename;
	// console.log('filename', filename)
	if (fs.existsSync(filePath)) {
		const ext = path.extname(filename);
		if (mimeTypes[ext]) {
			// console.log('Mime type:', mimeTypes[ext])
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

const send_url = (req, res, level) => {
	// console.log('in send_url', level, 'req.url.substr(1)', req.url.substr(1))
	if (asset_suffix.some(suffix_option => req.url.substr(1).includes(suffix_option))) {
		cache_time = 60 * 60;
	}

	res.set("Cache-Control", `public, max-age=${cache_time}`);
	if (req.url.substr(1).includes('common/')){
		console.log('Sending file', __dirname + `/` + req.url.substr(1))
		send_file(res, __dirname + `/` + req.url.substr(1));
	}
	else {
		console.log('Sending file', `/${level}/frontend/` + req.url.substr(1))
		send_file(res, __dirname + `/${level}/frontend/` + req.url.substr(1));
	}
};
const send_index = (req, res, level) => {
	console.log('sending file', __dirname + `/${level}/frontend/static/html_templates/index/index/base.html`)
	send_file(res, __dirname + `/${level}/frontend/static/html_templates/index/index/base.html`);
};

pro_app.get('*', (req, res) => {
	console.log()
	console.log('req.url', req.url, 'from', __dirname)
	
	let url_suffix_list = [3,4,5,6].map(len => req.url.substring(req.url.length - len))

	if (url_suffix_list.some(suffix_option => static_suffix.has(suffix_option))) {
		send_url(req, res, 'pro');
	} else {
		send_index(req, res, 'pro');
	}
});

college_app.get('*', (req, res) => {
	console.log()
	console.log('req.url', req.url, 'from', __dirname)
	
	let url_suffix_list = [3,4,5,6].map(len => req.url.substring(req.url.length - len))

	if (url_suffix_list.some(suffix_option => static_suffix.has(suffix_option))) {
		send_url(req, res, 'college');
	} else {
		send_index(req, res, 'college');
	}
});

pro_app.listen(pro_port, () =>
  console.log("Pro server running on port", pro_port, " from ", __dirname)
);

college_app.listen(college_port, () =>
  console.log("College server running on port", college_port, " from ", __dirname)
);

fs.readdir(__dirname, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log(files);
});