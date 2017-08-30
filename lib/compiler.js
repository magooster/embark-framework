var shelljs = require('shelljs');
var shelljs_global = require('shelljs/global');
var web3 = require('web3');
var fs = require('fs');
var solc = require('solc');

Compiler = function(blockchainConfig) {
  this.blockchainConfig = blockchainConfig;
};

Compiler.prototype.init = function(env) {
  var config = this.blockchainConfig.config(env);
};

Compiler.prototype.compile_solidity = function(contractFiles) {

  var input = {}

  for (var i = 0; i < contractFiles.length; i++){
    //console.log(contractFiles[i]);
    input[contractFiles[i].split('/')[contractFiles[i].split('/').length - 1]] = fs.readFileSync(contractFiles[i]).toString();
  }

  var output = solc.compile({sources: input}, 1);

  var errors = [];
  if (!output) {
    throw new Error ("No output from Solidity compiler");
  } else if (output['errors']) {
    for (var error in output['errors']) {
      if (output['errors'][error].indexOf('Error:') !== -1) {
        errors.push(output['errors'][error]);
      }
    }
  }

  if (errors.length > 0)
    throw new Error ("Solidity compiler errors:" + errors);

  var json = output.contracts;

  compiled_object = {}

  for (var className in json) {
    var contract = json[className];

    compiled_object[className] = {};
    compiled_object[className].code = contract.bytecode;
    compiled_object[className].runtimeBytecode = contract.runtimeBytecode;
    compiled_object[className].info = {};
    compiled_object[className].info.abiDefinition = JSON.parse(contract.interface);
  }

  return compiled_object;
};

Compiler.prototype.compile_serpent = function(contractFiles) {
  var cmd, result, output, json, compiled_object;

  //TODO: figure out how to compile multiple files and get the correct json
  var contractFile = contractFiles[0];

  cmd = "serpent compile " + contractFile;

  result = exec(cmd, {silent: true});
  code = result.output;

  if (result.code === 1) {
    throw new Error(result.output);
  }

  cmd = "serpent mk_full_signature " + contractFile;
  result = exec(cmd, {silent: true});

  if (result.code === 1) {
    throw new Error(result.output);
  }

  json = JSON.parse(result.output.trim());
  className = contractFile.split('.')[0].split("/").pop();

  for (var i=0; i < json.length; i++) {
    var elem = json[i];

    if (elem.outputs.length > 0) {
      elem.constant = true;
    }
  }

  compiled_object = {}
  compiled_object[className] = {};
  compiled_object[className].code = code.trim();
  compiled_object[className].info = {};
  compiled_object[className].info.abiDefinition = json;

  return compiled_object;
}

Compiler.prototype.compile = function(contractFiles) {
  var solidity = [], serpent = [];

  for (var i = 0; i < contractFiles.length; i++) {
    var extension = contractFiles[i].split('.')[1];
    if (extension === 'sol') {
      solidity.push(contractFiles[i]);
    }
    else if (extension === 'se') {
      serpent.push(contractFiles[i]);
    }
    else {
      throw new Error("extension not known, got " + extension);
    }
  }
  //TODO: Get these compiling and returning together...problem might come with the JSON objects
  if (solidity.length > 0) return this.compile_solidity(solidity);
  if (serpent.length > 0) return this.compile_serpent(serpent);
};

module.exports = Compiler;
