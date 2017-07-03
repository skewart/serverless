/* eslint-disable no-unused-expressions */
'use strict';

const chai = require('chai');
const Package = require('./package');
const Serverless = require('../../../lib/Serverless');
const sinon = require('sinon');

// Configure chai
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const expect = require('chai').expect;

describe('Package', () => {
  let serverless;
  let options;
  let pkg;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.init();
    options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    pkg = new Package(serverless, options);
  });

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(pkg.serverless).to.equal(serverless);
    });

    it('should set the options', () => {
      expect(pkg.options).to.equal(options);
    });

    it('should have commands', () => expect(pkg.commands).to.be.not.empty);

    it('should have hooks', () => expect(pkg.hooks).to.be.not.empty);
  });

  describe('hooks', () => {
    let validateStub;
    let packageServiceStub;
    let packageFunctionStub;

    beforeEach(() => {
      validateStub = sinon.stub(pkg, 'validate');
      packageServiceStub = sinon.stub(pkg, 'packageService');
      packageFunctionStub = sinon.stub(pkg, 'packageFunction');
    });

    afterEach(() => {
      pkg.validate.restore();
      pkg.packageService.restore();
      pkg.packageFunction.restore();
    });

    it('should implement the before:package:cleanup event',
      () => expect(pkg.hooks).to.have.property('before:package:cleanup'));

    it('should implement the package:createDeploymentArtifacts event',
      () => expect(pkg.hooks).to.have.property('package:createDeploymentArtifacts'));

    it('should implement the before:package:compileFunctions event',
      () => expect(pkg.hooks).to.have.property('before:package:compileFunctions'));

    it('should implement the package:function:package event',
      () => expect(pkg.hooks).to.have.property('package:function:package'));

    describe('before:package:cleanup', () => {
      it('should call validate', () =>
        expect(pkg.hooks['before:package:cleanup']()).to.be.fulfilled
        .then(() => expect(validateStub).to.be.calledOnce)
      );
    });

    describe('package:createDeploymentArtifacts', () => {
      it('should call packageService', () =>
        expect(pkg.hooks['package:createDeploymentArtifacts']()).to.be.fulfilled
        .then(() => expect(packageServiceStub).to.be.calledOnce)
      );
    });

    describe('before:package:compileFunctions', () => {
      beforeEach(() => {
        pkg.serverless.service.provider.environment = {
          SOME_VAR: 'some-value',
          OTHER_VAR: null,
        };
        pkg.serverless.service.functions = {
          hello: {
            handler: 'hello.js',
            environment: {
              VAR_ONE: 'one',
              VAR_TWO: null,
            },
          },
        };
      });

      it('should delete null environment variables', () => {
        expect(pkg.hooks['before:package:compileFunctions']()).to.be.fulfilled
        .then(() => {
          expect(pkg.serverless.service.provider.environment.SOME_VAR).to.equal('some-value');
          expect(pkg.serverless.service.provider.environment.OTHER_VAR).to.be.undefined;
          expect(pkg.serverless.service.functions.hello.environment.VAR_ONE).to.equal('one');
          expect(pkg.serverless.service.functions.hello.environment.VAR_TWO).to.be.undefined;
        });
      });
    });

    describe('package:function:package', () => {
      it('should call packageFunction', () => {
        pkg.options.function = 'myFunction';

        return expect(pkg.hooks['package:function:package']()).to.be.fulfilled
        .then(() => expect(packageFunctionStub).to.be.calledOnce);
      });

      it('should fail without function option', () => {
        pkg.options.function = false;

        return expect(pkg.hooks['package:function:package']())
          .to.be.rejectedWith('Function name must be set')
        .then(() => expect(packageFunctionStub).to.be.not.called);
      });
    });
  });
});
