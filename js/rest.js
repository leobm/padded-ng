// simple rest client

require('core/object');
require('core/string');
include('js/helper');

export('RestClient');

var RestClient = function() {

	import('helma/httpclient');
	var client = new helma.httpclient.Client();
	
	var request = function(method) {
		return function(url, options) {
			var opt = Object.merge({
				headers: {},
				user_agent: '',
				binary_mode: false,
				max_response_size: null,
				proxy: null,
				content: null,
				cookies: null,
				connect_timeout: 0,
				socket_timeout: 0,
				follow_redirects: true,
				response_handler: client.getResponseHandler()
			}, options || {});
			with(client) {
				for (var name in opt.headers)
					setHeader(name, opt.headers[name]);			
				setUserAgent(opt.user_agent);
				setBinaryMode(opt.binary_mode);
				setMaxResponseSize(opt.max_response_size);
				if (opt.proxy) setProxy(opt.proxy);
				setContent(opt.content);
				setCookies(opt.cookies);
				setTimeout(opt.connect_timeout);
				setReadTimeout(opt.socket_timeout);
				setFollowRedirects(opt.follow_redirects);
				setResponseHandler(opt.response_handler);
				setMethod(method);
				return getUrl(url);
			}
		};
	};
	this.request = function(method, url, options) {
		var req_fn = request(method);
		return req_fn(url, options);
	};
	this.$get = request('GET');
	this.$post = request('POST');
	this.$put = request('PUT');
	this.$delete = request('DELETE');
	var self = this;
	this.resource = function(resource_url,user,pw) {
		return new function() {
			this.__defineGetter__("url", function() { return resource_url; });
			this.__noSuchMethod__ = function(name, args) {
				if (name in set('$get','$post','$put','$delete')) {
					var [sub_url, options] = [args[0] ||'', args[1]];
					var url = resource_url+sub_url;
					return self[name](url, options);
				}
			};
			this.request = function(method, sub_url, options) {
				return self.request(method, resource_url+sub_url, options);
			};
		};
	}
};
