

<h1>Quick Start:</h1> 
<h2>Examples</h2>

<b>example 1</b>
<pre>
	var couch = new Couch({
		host: 'localhost',
		port: 5984
	});
	var db = couch.db('test');
	db.create();
	
	try {
		var doc = db.saveDoc({
			_id: "1",
			text: "Hello Document!"
		});
		
		var doc1 = db.get("1");
		print(doc1);
		doc1.destroy();
	} catch(ex) {
			if (ex.constructor == CouchDbError)
				print("error:"+ex.error + " reason:"+ex.reason);
			else throw ex;
	}
</pre>

<b>example 2</b>
<pre>
try {
	var db = couch.db('test');
	db.drop();
	db.create();
	db.bulkSave([
		{"a":  "AAAA"},
		{"b": "BBBB"},
		{"c": [1,2,3]}
	]);
} catch(ex) {
	print("error:"+ex.error + "# reason:"+ex.reason);
}
</pre>

<b>example 3</b>
<pre>
var db = couch.db('test');
db.drop();
db.create().transaction(function() {
	Array.every("ABCDEFGHIJKLMNOPQRSTUVWXYZ", bind(function(c) {				
			return this.saveDoc({
				character: c, 
			}, true);
	},this));
});

var view = db.view('chars/by_char').create({
		map: function(doc) {
			emit(doc.character, doc);
		}
});

// fetch all
var chars_set = view.fetchAll();
for each(let c in chars_set) {
	print(c);
};

// fetch paged

var pager = view.fetchPageable(2);

for each (let chars_set in pager) {
	for each (let c in chars_set)
		print(c);
		
	print("nextStartKey:"+chars_set.nextStartkey());
	print("nextStartkeyDocId:"+chars_set.nextStartkeyDocId());	
	print("-----------------------------");
}

// fetch streamed
var streamer = view.fetchStreamed();
for each (let c in streamer) {
	print(c);
}
</pre>