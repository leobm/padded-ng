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

testCase.tearDown = function() {
	db.drop();
};

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
	assertEqual(typeof all_docs, 'object');
	assertEqual(all_docs.total_rows, 2);
	
	/*print("#################");
	print(docs.toJSON());
	print("#################");*/
};

