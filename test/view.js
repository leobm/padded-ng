include("helma/unittest");
require('core/JSON');
export('testCase');
var config = require("config/test");

include("padded");
var couch = new Couch(config.options);
var db = couch.db(config.database);

var testCase = new TestCase('view'); 

testCase.setUp = function() {
	db.drop(); db.create();
}

testCase.testMisc = function () {
	db.transaction(function() {
		var tx = this;
		Array.every("ABCDEFGHIJKLMNOPQRSTUVWXYZ", function(c) {				
			return tx.saveDoc({
				character: c, 
			}, true);
		});
	});
	
	var view = db.view('chars/by_char').create({
		map: function(doc) {
			emit(doc.character, doc);
		}
	});
	var chars_set_all = view.fetchAll();
	assertEqual(true, chars_set_all.hasRows());
	assertEqual(26, chars_set_all.count);
	assertEqual(26, chars_set_all.num_rows);
	assertEqual(0, chars_set_all.offset);
	var chars_set_by_keys = view.fetchAll({
			keys: ['A','B','C']
	});
	assertEqual(true, chars_set_by_keys.hasRows());
	assertEqual(3, chars_set_by_keys.num_rows);
	
};
