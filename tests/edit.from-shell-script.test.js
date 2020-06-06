const os = require('os')
const fs = require('fs')
const path = require('path')
const { getSSMDocument, getClients } = require('../src/utils')
const { getServerlessSdk, getCredentials, getCommonConfig } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// configurations
const srcPath = path.join(__dirname, 'src')
const shellFile = 'script.sh'
const shellFileChanged = 'script-changed.sh'
const slsConfig = {
  debug: true
}

// get aws credentials from env
const credentials = getCredentials()
const { ssm } = getClients(credentials.aws, process.env.SERVERLESS_REGION)

// the yaml file we're testing against
const instanceYaml = getCommonConfig()
const instanceYamlPre = {
  ...instanceYaml,
  inputs: {
    src: srcPath,
    format: 'SHELL',
    file: shellFile,
    parameters: {
      Message: {
        type: 'String',
        description: 'Example parameter',
        default: 'Hello World!'
      }
    },
    region: process.env.SERVERLESS_REGION
  }
}
const instanceYamlPost = {
  ...instanceYaml,
  inputs: {
    src: srcPath,
    format: 'SHELL',
    file: shellFileChanged,
    parameters: {
      Message: {
        type: 'String',
        description: 'Example parameter changed',
        default: 'Hello World!'
      }
    },
    region: process.env.SERVERLESS_REGION
  }
}

// get serverless access key from env and construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

// clean up the instance after tests
afterAll(async () => {
  try {
    await sdk.remove(instanceYaml, credentials)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
  }
})

/**
 * Tests
 */

it('should successfully update content from shell script', async () => {
  let instance, document, parsedContent, mainStep

  instance = await sdk.deploy(instanceYamlPre, credentials, slsConfig)
  document = await getSSMDocument(ssm, instance.outputs.name, 'JSON', '$LATEST')

  parsedContent = JSON.parse(document.content)
  mainStep = parsedContent.mainSteps[0]
  expect(mainStep.inputs.runCommand).toEqual(
    fs
      .readFileSync(path.join(srcPath, shellFile))
      .toString()
      .split(os.EOL)
  )

  instance = await sdk.deploy(instanceYamlPost, credentials, slsConfig)
  document = await getSSMDocument(ssm, instance.outputs.name, 'JSON', '$LATEST')

  parsedContent = JSON.parse(document.content)
  mainStep = parsedContent.mainSteps[0]
  expect(mainStep.inputs.runCommand).toEqual(
    fs
      .readFileSync(path.join(srcPath, shellFileChanged))
      .toString()
      .split(os.EOL)
  )
})
