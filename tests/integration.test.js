const fs = require('fs')
const path = require('path')
const { randomId, getSSMDocument, getClients } = require('../src/utils')
const { getServerlessSdk, getCredentials } = require('./utils')

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
const instanceYaml = {
  org: 'daaru' || process.env.SERVERLESS_ORG,
  app: 'test-ssm-document' || process.env.SERVERLESS_APP,
  component: 'aws-ssm-document@dev',
  name: `aws-ssm-integration-tests-${randomId()}`,
  stage: 'dev',
  inputs: {
    src: srcPath,
    file: documentFile,
    region: process.env.AWS_DEFAULT_REGION
  }
}

// get aws credentials from env
const credentials = getCredentials()
const { ssm } = getClients(credentials.aws, process.env.AWS_DEFAULT_REGION)

// get serverless access key from env and construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

it('should successfully deploy ssm document', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, '$LATEST', 'YAML')
  expect(document.name).toEqual(instance.outputs.name)
  expect(document.content).toEqual(fs.readFileSync(path.join(srcPath, documentFile)).toString())

  await sdk.remove(instanceYaml, credentials)
})

it('should successfully update content', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  instanceYaml.inputs.file = documentFileChanged

  await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, '$LATEST', 'YAML')
  expect(document.content).toEqual(
    fs.readFileSync(path.join(srcPath, documentFileChanged)).toString()
  )

  await sdk.remove(instanceYaml, credentials)
})

it('should successfully remove document', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  await sdk.remove(instanceYaml, credentials, slsConfig)

  const document = await getSSMDocument(ssm, instance.outputs.name)
  expect(document).toBeNull()
})
