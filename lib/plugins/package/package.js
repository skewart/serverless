'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');
const path = require('path');
const validate = require('../lib/validate');
const zipService = require('./lib/zipService');
const packageService = require('./lib/packageService');

class Package {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.servicePath = this.serverless.config.servicePath || '';
    this.packagePath = this.options.package ||
      this.serverless.service.package.path ||
      path.join(this.servicePath || '.', '.serverless');

    Object.assign(
      this,
      validate,
      packageService,
      zipService
    );

    this.commands = {
      package: {
        usage: 'Packages a Serverless service',
        lifecycleEvents: [
          'cleanup',
          'initialize',
          'setupProviderConfiguration',
          'createDeploymentArtifacts',
          'compileFunctions',
          'compileEvents',
          'finalize',
        ],
        options: {
          stage: {
            usage: 'Stage of the service',
            shortcut: 's',
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r',
          },
          package: {
            usage: 'Output path for the package',
            shortcut: 'p',
          },
        },
        commands: {
          function: {
            type: 'entrypoint',
            lifecycleEvents: [
              'package',
            ],
          },
        },
      },
    };

    this.hooks = {
      'before:package:cleanup': () => BbPromise.bind(this)
        .then(this.validate),

      'package:createDeploymentArtifacts': () => BbPromise.bind(this)
        .then(this.packageService),

      'before:package:compileFunctions': () => BbPromise.bind(this)
        .then(this.deleteNullEnvVars),

      'package:function:package': () => {
        if (this.options.function) {
          this.serverless.cli.log(`Packaging function: ${this.options.function}...`);
          return BbPromise.resolve(this.packageFunction(this.options.function));
        }
        return BbPromise.reject(new Error('Function name must be set'));
      },
    };
  }

  deleteNullEnvVars() {
    const providerEnv = this.serverless.service.provider.environment;
    if (providerEnv) {
      this.serverless.service.provider.environment = _.omitBy(providerEnv, _.isNull);
    }
    for (const funcName of Object.keys(this.serverless.service.functions)) {
      const env = this.serverless.service.functions[funcName].environment;
      if (env) {
        this.serverless.service.functions[funcName].environment = _.omitBy(env, _.isNull);
      }
    }
  }
}

module.exports = Package;
