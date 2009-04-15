include("helma/unittest");
require('core/JSON');
export('testCase');
var config = require("config/test");

include("padded");
var couch = new Couch(config.options);

var testCase = new TestCase('server');

testCase.testInfo = function() {
	var info = couch.info();
	assertEqual(typeof info, 'object');
	assertTrue(typeof info.couchdb!= 'undefined');
	assertTrue(typeof info.version!= 'undefined');
};

testCase.testConfig = function () {
	var info = couch.config();
	assertEqual(typeof info, 'object');
};

testCase.testDatabases = function () {
	var dbs = couch.databases();
	assertEqual(typeof dbs, 'object');
	assertEqual(dbs.constructor, Array);
	return;
};

testCase.testNextUUID = function () {
	var uuid = couch.nextUUID(10);
	assertNotNaN(parseInt(uuid, 16));
};

testCase.testGetDb = function () {
	var db = couch.db(config.database);
	assertEqual(typeof db, 'object');
};

testCase.testCreateDb = function () {
	try {
		var db = couch.createDb(config.database);
		assertEqual(typeof db, 'object');
	} catch(ex) {
		assertEqual(ex.constructor, CouchDbError);
		assertEqual(ex.error, 'file_exists');
	}
};



