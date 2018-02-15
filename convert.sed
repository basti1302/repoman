/var referee/d
/var assert/d
s/^var buster.*$/'use strict';var mocha = require('mocha'); var chai = require('chai'); var sinon = require('sinon'); var assert = chai.assert;/g
s/buster.testCase(\(.*\), {/describe(\1, function() {/g

s/  \('should.*\):/  it(\1,/g
s/  setUp: /  beforeEach(/g

s/assert.defined/assert.isDefined/g
s/assert.equals/assert.equal/g
s/assert.equal(\(.*\), \[\])/assert.isEmpty(\1)/g
s/assert.equal(\(.*\), \(\[.*\]\))/assert.sameMembers(\1, \2)/g

s/^  },$/  });/g
s/^  }$/  });/g

s/this.stub(bag, 'command', mockCommand);/sinon.stub(bag, 'command').callsFake(mockCommand);/g

s/this.mock(/sinon.mock(/g
s/this.stub(/sinon.stub(/g

/sinon.mock({});/d

s/this.mockProcess[[:space:]]*=.*/sinon.stub(process, 'exit');/g
s/this.mockProcess.expects('exit').once().withExactArgs(\([[:digit:]]\))/sinon.assert.calledWith(process.exit, \1);/g

s/this.mockConsole = sinon.mock(console);/sinon.spy(console, 'log');/g
s/this.mockConsole.expects('log').once().withExactArgs(\(.*\));/sinon.assert.calledWith(console.log, \1);/g
s/this.mockConsole.expects('log').withExactArgs(\(.*\));/sinon.assert.calledWith(console.log, \1);/g

s/this.//g
s/mock\([[:upper:]]\)\([[:alpha:]]*\)/\l\1\2Mock/g

s/assert.equal(\(.*\), {});/assert.isEmpty(\1)/g

# afterEach(function () {
#   process.exit.restore();
# });
