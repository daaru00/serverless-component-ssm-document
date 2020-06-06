const fs = require('fs')
const path = require('path')
const { getSSMDocument, getClients } = require('../src/utils')
const { getServerlessSdk, getCredentials, getCommonConfig } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// configurations
const srcPath = path.join(__dirname, 'src')
const documentFile = 'document.yml'
const slsConfig = {
  debug: true
}

// get aws credentials from env
const credentials = getCredentials()
const { ssm } = getClients(credentials.aws, process.env.SERVERLESS_REGION)

/**
 * Initial component configuration
 */
const instanceYaml = getCommonConfig()
const instanceYamlFile = {
  ...instanceYaml,
  inputs: {
    src: srcPath,
    file: documentFile,
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

it('should successfully deploy ssm document using file as content', async () => {
  const instance = await sdk.deploy(instanceYamlFile, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, 'YAML', '$LATEST')
  expect(document.name).toEqual(instance.outputs.name)
  expect(document.content).toEqual(fs.readFileSync(path.join(srcPath, documentFile)).toString())
})
