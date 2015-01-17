// for running tests in node on the command-line
if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    var chai = require('chai');
    var AnimationLoop = require('../.tmp/test/node/animation-loop');
}

var expect = chai.expect;
chai.should();

describe('AnimationLoop Creation', function () {
    it('creates an AnimationLoop without the `new` operator', function () {
        var a = AnimationLoop();
        expect(a).to.be.an.instanceof(AnimationLoop);
    });
});

describe('Options Scrubbing', function () {
    var scrub;

    before(function () {
        scrub = AnimationLoop.prototype.getScrubbedOptions;
    });

    it('turns a function into an options object', function () {
        var options = function () {};
        var obj = scrub(options);
        expect(obj).to.be.an('object');
        obj.should.have.property('render');
        expect(obj.render).to.equal(options);
    });

    it('throws when not given a render function', function () {
        expect(function () { scrub({}); }).to.throw(Error);
    });

    it('throws when not given a function or object', function () {
        expect(function () { scrub();      }).to.throw(Error);
        expect(function () { scrub(1);     }).to.throw(Error);
        expect(function () { scrub([]);    }).to.throw(Error);
        expect(function () { scrub(null);  }).to.throw(Error);
        expect(function () { scrub('str'); }).to.throw(Error);
    });

    it('scrubs non-whitelisted properties', function () {
        var options = {
            a: 1,
            b: 2,
            c: 3,
            render: function () {},
        };

        var obj = scrub(options);
        expect(obj).to.deep.equal({ render: options.render });
    });

    it('passes whitelisted properties through', function () {
        var options = {
            before: function () {},
            render: function () {},
            done: function () {},
            args: [1],
            duration: 5000,
            paused: true,
            pauseThreshold: 50,
            autonomous: true,
        };

        var obj = scrub(options);
        expect(obj).to.not.equal(options);
        expect(obj).to.deep.equal(options);
    });

    it('ensures args property becomes an array', function () {
        var options = {
            render: function () {},
            args: [1],
        };

        var obj = scrub(options);
        expect(obj).to.not.equal(options);
        expect(obj).to.deep.equal(options);
        expect(obj).to.have.ownProperty('args');
        expect(obj.args).to.deep.equal([1]);

        options.args = 1;
        obj = scrub(options);
        expect(obj).to.not.equal(options);
        expect(obj).to.not.deep.equal(options);
        expect(obj).to.have.ownProperty('args');
        expect(obj.args).to.deep.equal([1]);
    });
});
