if ( !global.CURL ) global.CURL = require("http");
if ( !global.URL ) global.URL = require("url");
class Curl {
	post(url,post,fn) {
		if ( typeof post == "function" ) {
			fn = post;
			post = "";
		}
		if ( !fn ) return;
		if ( typeof post == "object" ) {
			let arr = [];
			for ( let [key,item] of entries(post) ) {
				arr.push(`${key}=${item}`);
			}
			post = arr.join("&");
		}
		url = URL.parse(url);
		let options = {
			hostname : url.hostname,
			port : url.port ? url.port : 80,
			path : url.path,
			method : "POST",
			headers : {
				"Content-Type" : "application/x-www-form-urlencoded",
				"Content-Length" : Buffer.byteLength(post)
			}
		};
		for ( let [key,item] of entries(this.options) ) {
			options[key] = item;
		}
		let req = CURL.request(options, res => {
			res.setEncoding("utf8");
			res.on("data", chunk => {
				chunk = chunk.isJSON() ? JSON.parse(chunk) : chunk;
				fn(chunk);
			} );
		} );
		req.on("error", e => {
			fn( {
				status : 0,
				msg : e.message
			} );
		} );
		req.write(post);
		req.end();
	}
	get(url,post,fn) {
		if ( typeof post == "function" ) {
			fn = post;
			post = "";
		}
		if ( !fn ) return;
		if ( typeof post == "object" ) {
			let arr = [];
			for ( let [key,item] of entries(post) ) {
				arr.push(`${key}=${item}`);
			}
			post = arr.join("&");
		}
		url = URL.parse(url);
		let options = {
			hostname : url.hostname,
			port : url.port ? url.port : 80,
			path : url.path,
			method : "GET",
			headers : {
				"Content-Type" : "application/x-www-form-urlencoded",
				"Content-Length" : Buffer.byteLength(post)
			}
		};
		for ( let [key,item] of entries(this.options) ) {
			options[key] = item;
		}
		let req = CURL.request(options, res => {
			res.setEncoding("utf8");
			res.on("data", chunk => {
				chunk = chunk.isJSON() ? JSON.parse(chunk) : chunk;
				fn(chunk);
			} );
		} );
		req.on("error", e => {
			fn( {
				status : 0,
				msg : e.message
			} );
		} );
		req.write(post);
		req.end();
	}
	option(o) {
		this.options = o;
		return this;
	}
}
Curl.options = {};
module.exports = Curl;