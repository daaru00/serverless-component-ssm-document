const fs = require('fs')
const path = require('path')
const { getSSMDocument, getClients } = require('../src/utils')
const { getServerlessSdk, getCredentials, getCommonConfig } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// configurations
const srcPath = path.join(__dirname, 'src')
const documentFile = 'document.yml'
const documentFileChanged = 'document-changed.yml'
const slsConfig = {
  debug: true
}

// the yaml file we're testing against
const instanceYaml = getCommonConfig()
const instanceYamlPre = {
  ...instanceYaml,
  inputs: {
    src: srcPath,
    file: documentFile,
    region: process.env.SERVERLESS_REGION
  }
}
const instanceYamlPost = {
  ...instanceYaml,
  inputs: {
    src: srcPath,
    file: documentFileChanged,
    region: process.env.SERVERLESS_REGION
  }
}

// get aws credentials from env
const credentials = getCredentials()
const { ssm } = getClients(credentials.aws, process.env.SERVERLESS_REGION)

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

it('should successfully update content from file', async () => {
  let instance, document

  instance = await sdk.deploy(instanceYamlPre, credentials, slsConfig)
  document = await getSSMDocument(ssm, instance.outputs.name, 'YAML', '$LATEST')
  expect(document.content).toEqual(fs.readFileSync(path.join(srcPath, documentFile)).toString())

  instance = await sdk.deploy(instanceYamlPost, credentials, slsConfig)
  document = await getSSMDocument(ssm, instance.outputs.name, 'YAML', '$LATEST')
  expect(document.content).toEqual(
    fs.readFileSync(path.join(srcPath, documentFileChanged)).toString()
  )
})
