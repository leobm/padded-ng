var {TestSuite} = require('helma.unittest');

function run() {
	var suite = new TestSuite('Coucher-ng');
	suite.addTest('test.server');
  suite.run();
}

if (__name__ == "__main__") {
    run();
}
