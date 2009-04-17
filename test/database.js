include("helma/unittest");
require('core/JSON');
export('testCase');
var config = require("config/test");

include("padded");
var couch = new Couch(config.options);
var db = couch.db(config.database);

var testCase = new TestCase('database'); 

testCase.setUp = function() {
	db.drop(); db.create();
}

testCase.testName = function () {
	assertEqual(db.name(), config.database);
};

testCase.testInfo = function () {
	var info = db.info();
	assertEqual(typeof info, 'object');
	assertEqual(info.db_name, config.database);
};

testCase.testSaveAndGetDoc = function () {
	var doc = db.saveDoc({
			_id: "1",
			text: "Hello Test Document!"
	});
	assertEqual(typeof doc, 'object');
	var [save_doc_id, save_doc_rev] = [doc.id(), doc.rev()];
	assertNotNull(save_doc_id);
	assertNotNull(save_doc_rev);
	delete doc;
	var doc = db.get("1");
	assertEqual(typeof doc, 'object');
	assertEqual(doc.id(), save_doc_id);
	assertEqual(doc.rev(),save_doc_rev);
};

testCase.testDocuments = function () {
	db.saveDoc({
		_id: "1",
		text: "AAAAAAAA"
	});
  db.saveDoc({
		_id: "2",
		text: "BBBBBB"
	});
	var all_docs = db.documents();
	for each(doc in all_docs)
		assertEqual(typeof doc, 'object');
	assertEqual(2, all_docs.toArray().length);
	var all_doc_as_set = db.documentsAsResultSet();
	for each(row in all_doc_as_set) {
		assertEqual(typeof row, 'object');
		assertNotNull(row.id);
		assertNotNull(row.key);
		assertNotNull(row.doc);
	}
	assertEqual(2,all_doc_as_set.toArray().length);
};

