var {TestSuite} = require('helma/unittest');

function run() {
	var suite = new TestSuite('Padded-ng');
	suite.addTest('test/server');
	suite.addTest('test/database');
	suite.addTest('test/document');
	suite.addTest('test/view');
  suite.run();
}

if (__name__ == "__main__") {
    run();
}
