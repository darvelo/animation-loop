var chai = require('chai');
var expect = chai.expect;
var AnimationLoop = require('../.tmp/animation-loop');

chai.should();

describe('AnimationLoop', function () {
    it('starts a test', function () {
        expect(1);
    });

    it('fails a test', function () {
        var one = 2;
        one.should.equal(1);
    });
});
