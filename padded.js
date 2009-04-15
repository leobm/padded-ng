require('core/object');
require('core/string');
require('core/JSON');
include('core/json2');
require('helper');
include('helma/file');
include('helma/functional');

addToClasspath('lib/jackson-core-lgpl-0.9.9-3.jar');

export("Couch", "CouchDbError");

var CouchDbError = function(error, reason) {
	this.__defineGetter__("error", function() {
			return error;
	})
	this.__defineGetter__("reason", function() {
			return reason;
	})
	return Object.merge(this, new Error(reason));
};
	
function Couch(options) {
	var opt = Object.merge(options || {}, {
		host: 'localhost',
		port: 5984,
		uuid_batch_count: 100
	});
	var server = "http://"+opt.host+":"+opt.port;
	var _uuids = [];
	
	import('helma/httpclient');
	var h = new helma.httpclient.Client();
  var couch = this;
	
	var response =function(res, ok) {
		/*print("----------------------");
		print("Response code:"+res.code);
		print("Response content:"+res.content);
		print("----------------------");*/
		//if (res.code==404) return null;
		var result = res.content.parseJSON();
		if (res.code != ok) {
			if (result && result['error'])
				throw new CouchDbError(result['error'], result['reason'] );
		}
		return result;
	}
	
	this.info = function() {
		h.setMethod('GET');
		h.setContent(null);
		var res = h.getUrl(server);
		return response(res, 200);
	};
	
	this.config = function() {
		h.setMethod('GET');
		h.setContent(null);
		var res = h.getUrl(server+'/_config');
		return response(res, 200);
	};
	
	this.db = function(name) {
		return new Database(name);
	};
	
	this.databases = function() {
		h.setMethod('GET');
		h.setContent(null);
		var res = h.getUrl(server+'/_all_dbs');
		return response(res,200);
	};
	
	this.replicate = function(source, target, options) {
		h.setMethod('POST');
		h.setHeader('Content-Type','application/json');
		h.setContent({source: source, target: target }.toJSON());
		return response(res, 200);
	};
	
	this.nextUUID = function(count) {
		var count = count || opt['uuid_batch_count'];
		if (_uuids.length == 0) {
			h.setMethod('GET');
			h.setContent(null);
			var res = h.getUrl(server+'/_uuids'+ encodeOptions({count: count}));
			var result = response(res, 200);
			if (!result['uuids']) 
				return result;
			_uuids = result['uuids'];
		}
		return _uuids.pop();
	}
	
	this.createDb = function(name) {
		h.setMethod('PUT');
		h.setContent(null);
		var res = h.getUrl(server+'/'+name);
		var result = response(res, 201);
		if (result['ok'])
			return this.db(name);
		return result;
	};
	
	this.restart = function() {
		h.setMethod('POST');
		h.setContent(null);
		var res = h.getUrl(server+'/_restart');
		return response(res, 200);
	};
	
	var Database = function(name, options ) {
		var _url = server +"/" + encodeURIComponent(name);
		var _db = this;
		var _bulk_save_cache = [];
		var opt = Object.merge(options || {}, {
			bulk_save_cache_limit: 500
		});
		
		var Document = function(doc) {
			this.toString = function() {
				return this.toJSON();
			};
			this.__noSuchMethod__ = function(name, args) {
				return Document.prototype[name].apply(this, args);
			};
			return Object.merge(this, doc);
		};
		Document.prototype = {
			isNew: function() {
				return (typeof this._rev == 'undefined');
			},
			id: function() { return this._id || null; },
			rev: function() { return this._rev || null; },
			save: function(bulk) {
				return _db.saveDoc(this, bulk || false);
			},
			destroy: function(bulk) {
				return _db.deleteDoc(this, bulk || false);
			},
			uri: function(append_rev) {
				var append_rev = append_rev || false;
				if(this.isNew()) return null;
				var uri = _url+'/'+encodeURIComponent(this._id);
				if (append_rev)
					uri += encodeOptions({
						rev: (typeof append_rev == 'boolean') ? this.rev() : append_rev
					});
				return uri;
			},
			attachment: function() {
				
			},
			attach: function(file, options) {
				return _db.attachFile(this, file, options);
			},
			detach: function() {
			},
			revisions: function() {
				return (this._revs_info) 
					? this._revs_info 
					: (bindThisObject(function() {
						var doc = _db.get(this.id(), {revs_info: 'true' });
						return (doc && doc.constructor == Document)
						? this.revisions() : null;
					},this))();
			},
			rollback: function() {
				var revs = this.revisions();
				if (revs && revs.constructor == Array) {
					
				}	
			}
		};
		
		var View = function(name) {
			
			var [dname, vname] = name.split('/');
			var _view_url = _url+"/_design/"+encodeURIComponent(dname)+"/_view/"+encodeURIComponent(vname);
			
			this.name = function() { return name || 'no_name'; }
			
			this.create = function(funcs) {
				for (let f in funcs) {
					if (typeof funcs[f] == 'function')
						funcs[f] = funcs[f].toString();
				}
				var views = {};
				views[vname] = funcs;
				var design_id = "_design/"+dname;
				try {
					var doc = _db.get(design_id);
					// view available ? 
					if (doc && doc.views && doc.views[vname] 
						&& doc.views[vname].toJSON() == views[vname].toJSON()) 
						return this;
				} catch(err) {
					if (err.constructor != CouchDbError && err.error != 'not_found') 
						throw err;
				}
				var design = (function() { 
					if (doc) {
						doc.views = Object.merge(doc.views, views, true);
						return doc;
					} else {
						return {
							_id: design_id,
							language: "javascript",
							views: views	
						};
					}
				})();
				var result = _db.saveDoc(design);
				return (result.constructor == Document) ? this : result;
			};
			
			this.fetchAll = function(options) {
				h.setMethod('GET');	
				if (options && options['keys']) {
					h.setMethod('POST');	
					h.setContent({ keys: options['keys'] }.toJSON());
					delete options['keys'];
				}
				var res = h.getUrl(_view_url + encodeOptions(options));
				var result = response(res, 200);
				return (result) ? new View.ResultSet(result) : result;
			};
			
			this.fetchStreamed = function() {
				var url = new java.net.URL(_view_url + encodeOptions(options));
				var conn = url.openConnection();
				conn.setRequestMethod('GET');
				var input = conn.getInputStream();
				var jsonFactory = new org.codehaus.jackson.JsonFactory();
				var parser = jsonFactory.createJsonParser(input);
				var T = org.codehaus.jackson.JsonToken
				var _fill = function(token, i, obj) {
					switch(token) {
						case T.VALUE_TRUE: obj[i] = true; break;
						case T.VALUE_FALSE: obj[i] = false; break;
						case T.VALUE_NULL: obj[i] = null; break;
						case T.VALUE_NUMBER_INT: obj[i] = parser.getIntValue();
						case T.VALUE_NUMBER_FLOAT: obj[i] = parser.getFloatValue();
						case T.VALUE_STRING: obj[i] = parser.getText(); break;
					};
				};
				var _info = {};
				var streamer = Iterator({
						__iterator__: function() {
							var token = parser.nextToken();
							if (token  != T.START_OBJECT) 
								throw StopIteration;
							while (parser.nextToken() != T.START_ARRAY) {
								var token = parser.getCurrentToken();
								var i = ( token == T.FIELD_NAME) ? parser.getCurrentName() : i;
								if ( token == T.FIELD_NAME) continue;
								_fill(token,i,_info);
							}
							while (parser.nextToken() != T.END_ARRAY) {
								var doc = {};
								var walk = function(obj) {
									var obj = obj || {};
									do {
										var token = parser.nextToken();
										var i = (function() {
											return (obj.constructor == Array)
											 ?  obj.length
											 : (( token == T.FIELD_NAME && obj.constructor == Object) ? parser.getCurrentName() : i )
										})();
										if ( token == T.FIELD_NAME) continue;
										switch(token) {
											case T.START_ARRAY: obj[i] = walk(new Array()); break;
											case T.START_OBJECT: obj[i] = walk(new Object()); break;
											case T.END_ARRAY: case T.END_OBJECT:
												return obj; break;
											default: 
												_fill(token, i, obj);
										}
									} while(token);
								};
								yield new View.ResultRow(walk());
							}
							input.close();
						}
				});
				streamer.__defineGetter__('totalRows', function() { return _info.total_rows; });
				streamer.__defineGetter__('offset', function() { return _info.offset; });
				return streamer;
			};
			
			this.fetchPageable = function(docs_per_page, firstkey_docid, firstkey, lastkey) {
				var _view = this;
				
				var Pager = function(startkey, startkey_docid) {
						var self = this;
						var _result_set = null;
						var _startkey  = startkey;
						var _startkey_docid = startkey_docid;
						var _descending = false;
						var _prev_startkey = _startkey;
						var _prev_startkey_docid = _startkey_docid;
						var _page = 0;
						this.firstkey = function() { return firstkey; };
						this.lastkey = function() { return lastkey; };
						this.firstkeyDocId = function() { return firstkey_docid; };
						this.docsPerPage = function() { return docs_per_page || 10 };
						this.descending = function() { return _descending; };

						this.page = function() { return _page; };
						this.pages = function() {
							return (_result_set) ? 
								Math.round(_result_set.count()/this.docsPerPage()) : 1; 
						};	
						this.hasPrevious = function() { return (_page>=1); };
						this.hasNext = function() {
							//print("page:"+_page+"##pages:"+self.pages());
							return (_page<=self.pages()) 
						};
						var pagerIterator = Iterator({
							__iterator__: function() {
								while (true) {
									if ( !((_descending) ? self.hasPrevious() : self.hasNext()))
										throw StopIteration;
									if (_descending)
										[_startkey, _startkey_docid] = [_prev_startkey, _prev_startkey_docid]
									var options = {
										limit: self.docsPerPage(),
										skip: (_startkey_docid) ? 1 : 0,
										startkey:  _startkey,
										startkey_docid:  _startkey_docid,
										endkey: lastkey,
										descending: _descending
									};
									_result_set = _view.fetchAll(options);
									if (!_result_set.hasRows()) 
										throw StopIteration;

									if (_descending) _result_set.reverse();	
									var prs  = new View.PagedResultSet(_result_set);
	
									[_prev_startkey, _prev_startkey_docid] = [prs.previousStartkey(), prs.previousStartkeyDocId()];
									[_startkey, _startkey_docid] = [prs.nextStartkey(), prs.nextStartkeyDocId()];
									yield prs;
								} 
							}
						});
						var _org_next = pagerIterator.next;
						
						this.previous = function() {
							return this.next(true);
						};
						
						this.next = function(descending) {
							_descending = descending || false;
							(_descending) ? _page-- : _page++;
							return _org_next.apply(this);
						};
						
						return Object.merge(pagerIterator, self);
				}; // end Pager
				
				return new Pager(firstkey, firstkey_docid);
			}; // end fetchPaged
			
			View.ResultRow = function(row) {
				this.toString = function() {
					return row.toJSON();
				};
				return Object.merge(row,this);
			};
			View.ResultSet = function(result) {
				this.hasRows = function() { return (result.rows && result.rows.length>0); };
				this.count = function() { return result.total_rows; };
				this.offset = function() { return result.offset;  };
				
				this.__iterator__ = function() {
					for ( let i = 0; i < result.rows.length; i++ ) {
						yield new View.ResultRow(result.rows[i]);
					}
				};
				
				this.toString = function() {
					return result.toJSON();
				};
				this.pop = function() { return result.rows.pop(); };
				this.shift = function() { return result.rows.shift(); };
				this.reverse = function() {	result.rows = result.rows.reverse(); return result.rows; }; 
				this.toArray = function() {
					return result.rows;
				};
			};
			
			View.PagedResultSet = function(result_set) {
				var rows = result_set.toArray();
				var first_row  = rows[0];
				var [_prev_startkey, _prev_startkey_docid] = [first_row.key, first_row.id];
				
				var last_row = rows[rows.length-1];
				var [_next_startkey, _next_startkey_docid] = [ last_row.key, last_row.id];

				this.previousStartkey = function() { return _prev_startkey; };
				this.previousStartkeyDocId = function() {	return  _prev_startkey_docid;	};
				
				this.nextStartkey = function() { return _next_startkey; 	}; 	
				this.nextStartkeyDocId = function() { return  _next_startkey_docid;	};
	
				return Object.merge(result_set, this);				
			};
		};
		
		this.name = function() {
			return name;
		};
		
		this.info = function() {
			h.setMethod('GET');
			h.setContent(null);
			var res = h.getUrl(_url);
			return response(res, 200);
		};
		
		this.create = function() {
			h.setMethod('PUT');
			h.setContent(null);
			var res = h.getUrl(_url);
			var result = response(res, 201);
			if (result['ok'])
				return this;
			return result;
		};
		
		this.drop = function() {
			h.setMethod('DELETE');
			h.setContent(null);
			var res = h.getUrl(_url);
			try {
				return response(res, 200);
			} catch(err) {
				return false;
			}
		};
			
		this.transaction = function(block) {
			try {
				var tx = {
					saveDoc: function(doc) {
						return _db.saveDoc(doc, true);
					}
				}
				var fn = bindThisObject(block,tx);
				fn();
				_db.bulkCommit();
			} catch(ex) {
				print(ex);
			}
		};

		this.saveDoc = function(doc, bulk, options) {		
			var bulk = bulk || false;
			if (bulk) {
        _bulk_save_cache.push(doc);
        if (_bulk_save_cache.length >= opt['bulk_save_cache_limit']) 
					return this.bulkSave(); 
        return { ok: true };
      } 
			var method = (doc._id == undefined) ? 'POST' : 'PUT';
			h.setMethod(method);
			h.setContent(doc.toJSON());
			var res = h.getUrl((method == 'POST') 
				? _url + encodeOptions(options)
				: _url + '/'+encodeURIComponent(doc._id) + encodeOptions(options)
			);
			var result = response(res, 201);
			if (result['ok']) {
				doc._id = result.id;
				doc._rev = result.rev;
				return new Document(doc);
			}
			return result;
		};
		
		this.get = function(doc_id, options) {
			doc_id += ''; 
			h.setMethod('GET');
			h.setContent(null);
			var res = h.getUrl(_url+ '/'+encodeURIComponent(doc_id) + encodeOptions(options));
			var result = response(res, 200);
			return (result && result['_id']) ? new Document(result) : result;
		};
		
		this.documents = function(doc_ids, options) {
			options = Object.merge(options || {}, {
				include_docs: 'true'
			});
			h.setMethod('POST');
			h.setHeader('Content-Type','application/json');
			h.setContent({ keys: doc_ids }.toJSON());
			var res = h.getUrl(_url+'/_all_docs' + encodeOptions(options));
			return response(res, 200);
		};
		
		this.compact = function() {
			h.setMethod('POST');
			h.setHeader('Content-Type','application/json');
			h.setContent(null);
			var res = h.getUrl(_url+'/_compact');
			return response(res, 202);
		};
		
		this.deleteDoc = function(doc, bulk) {
			var bulk = bulk || false;
			if (bulk) {
        _bulk_save_cache.push({ _id: doc['_id'], _rev: doc['_rev'], _deleted: true });
				if (_bulk_save_cache.length >= opt['bulk_save_cache_limit']) 
					return this.bulkSave(); 
				return { ok: true };
			}
			
			h.setMethod('DELETE');
			h.setContent(null);
			var res = h.getUrl(_url+ '/'+encodeURIComponent(doc._id) + "?rev=" + doc._rev);
			var result = response(res, 200);
			doc._rev = result.rev;
			doc._deleted = true;
			return result;
		};
		
		this.bulkSave = function(docs, useUUIDs, atomic) {
			var useUUIDs = useUUIDs || true;
			var atomic = atomic || false;
			if (!docs) { 
        docs = _bulk_save_cache;
        _bulk_save_cache = [];
			}
			if (!docs.length)
					return false;
			if (useUUIDs) {
				var [docs_with_ids, docs_with_noids] = docs.partition(function(doc) {
						return (doc['_id'] || false);
				});
				var uuid_count = [docs_with_noids.length, opt['uuid_batch_count']].max();
				for each (var doc in docs_with_noids) {
					nextid = couch.nextUUID(uuid_count);
					if (nextid) doc['_id'] = nextid;
				}
      }
			h.setMethod('POST');
			h.setHeader('Content-Type','application/json');
			var content = { docs: docs};
			if (atomic) content['all_or_nothing']  = true;
			h.setContent(content.toJSON());
			var res = h.getUrl(_url+'/_bulk_docs');
			return response(res, 201);
		};
		this.bulkDelete = this.bulkSave;
		
		this.bulkCommit = function() { 
			this.bulkSave(false, true, true);
		};
		
		this.view = function(name) {
			return new View(name);
		};
		
		// One-off queries (eg. views you don't want to save in the CouchDB database)
		// Temporary views are only good during development.
		this.slowView = function(funcs, options) {
			h.setMethod('POST');	
			h.setHeader('Content-Type','application/json');
			for (let f in funcs) {
				if (typeof funcs[f] == 'function')
					funcs[f] = funcs[f].toString(); 
			}
			if (options && options['keys']) {
				funcs['keys'] = options['keys'];
				delete options['keys'];
			}
			h.setContent(funcs.toJSON());
			var res = h.getUrl(_url+'/_temp_view' + encodeOptions(options));
			var result = response(res, 200);
			return (result) ? new View.ResultSet(result) : result;
		}
		
		this.export = function() {
		};
		
		this.import = function() {
		};
		
		
		this.attachFile = function(doc, file, options) {
			if (typeof file != 'object' || file.constructor != File)
				throw "No File";
			var file_name = file.getName();
			var data = file.readAll();
			var opt = Object.merge(options || {}, {
				content_type: 'text/plain',
			});
			h.setMethod('PUT');
			h.setHeader('Content-Type',opt.content_type);
			h.setContent(data.enbase64());
			var res = h.getUrl(_url+'/'+encodeURIComponent(doc._id)+'/'
				+encodeURIComponent(file_name)
				+encodeOptions({rev:doc._rev})
			);
			var result = response(res, 201);
			doc._id = result.id;
			doc._rev = result.rev;
			doc._attachments = {};
			doc._attachments[file_name] = {
				'content_type': opt.content_type,
				'length': data.length,
				'stub': true
			};
			return result;
		};
		
		this.detach = function(doc, file_name, options) {
			h.setMethod('DELETE');
			var res = h.getUrl(_url+'/'+encodeURIComponent(doc._id)+'/'
				+encodeURIComponent(file_name)
				+encodeOptions({rev:doc._rev})
			);
			var result = response(res, 200);
			doc._id = result.id;
			doc._rev = result.rev;
      delete doc._attachments[file_name];
			return result;
		};
				
		/*this.copyDoc = function(doc, dest) {
			if (!doc['_id']) 
				throw new Error("A Document with an _id attribute is required for copying!");
			var destionation = (typeof dest == 'object' && dest._id && dest._rev) 
				?  encodeURIComponent(dest._id)+encodeOptions({rev:dest._rev})
				:  dest;
			h.setRequestSpecialMethod('COPY');
			h.setContent({ Destination: destionation }.toJSON());
			var res = h.getUrl(_url+encodeURIComponent(doc._id));
			return response(res, 201);
		};*/

		this.replicateFrom = function(otherdb) {
			if (typeof otherdb != 'object' || otherdb.constructor != Database)
				throw new Error("Not a Database!");
			couch.replicate(otherdb.name(), this.name());
		};
		
		this.replicateTo = function(otherdb) {
			if (typeof otherdb != 'object' || otherdb.constructor != Database)
				throw new Error("Not a Database!");
			couch.replicate(this.name(), otherdb.name());
		};

	};
	
	// Convert a options object to an url query string.
	// ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
	function encodeOptions(options) {
		var buf = []
		if (typeof options == "object" && options !== null) {
			for (var name in options) {
				if (!options.hasOwnProperty(name)) continue;
				var value = options[name];
				if (value == undefined) continue;
				if (name == "key" || name == "startkey" || name == "endkey" ) {
					value = JSON.stringify(value);
				}
				buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
			}
		}
		return (!buf.length) 
			? '' : '?' + buf.join("&");
	}
}

if (__name__ == "__main__") {

}

