include("helma/unittest");
require('core/JSON');
export('testCase');
var config = require("config/test");

include("padded");
var couch = new Couch(config.options);
var db = couch.db(config.database);

var testCase = new TestCase('document'); 

testCase.setUp = function() {
	db.drop(); db.create();
}

testCase.testPropertyHasSameNameLikeDocMethod = function () {
	db.saveDoc({
		_id: "1",
		uri: "http://github.com/leobm"
	});
	var doc = db.get("1");
	assertEqual(doc.uri(), db.url()+"/1");
	assertEqual(doc.uri, "http://github.com/leobm");
};

testCase.testMisc = function () {
	var doc = db.saveDoc({
		_id: "1",
		title: "ABC"
	});
	
	doc.text = "Apache CouchDB";
	doc.save();
	assertEqual("Apache CouchDB", doc.text);
	var revs = doc.revisions();
	assertEqual(2, revs.length);
	assertNotUndefined(doc._revs_info);
	doc.revert();
	doc.remove();
	assertEqual(doc._deleted, true);
	assertTrue(doc.isDeleted());
	assertNull(doc.revisions());

};

