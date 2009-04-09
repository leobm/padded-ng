var {TestSuite} = require('helma.unittest');

function run() {
	var suite = new TestSuite('Padded-ng');
	suite.addTest('test.server');
  suite.run();
}

if (__name__ == "__main__") {
    run();
}
