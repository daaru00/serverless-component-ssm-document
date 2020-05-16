const fs = require('fs')
const path = require('path')
const { randomId, getSSMDocument, getClients } = require('../src/utils')
const { getServerlessSdk, getCredentials } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// configurations
const documentFile = path.join(__dirname, 'document.yml')
const documentFileChanged = path.join(__dirname, 'document-changed.yml')
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
    src: __dirname,
    file: 'document.yml',
    region: process.env.AWS_DEFAULT_REGION
  }
}

// we need to keep the initial instance state after first deployment
// to validate removal later
let firstInstanceState

// get aws credentials from env
const credentials = getCredentials()
const { ssm } = getClients(credentials.aws, process.env.AWS_DEFAULT_REGION)

// get serverless access key from env and construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

// clean up the instance after tests
afterAll(async () => {
  await sdk.remove(instanceYaml, credentials)
})

it('should successfully deploy ssm document', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)

  // store the initial state for removal validation later on
  firstInstanceState = instance.state
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, '$LATEST', 'YAML')
  expect(document.name).toEqual(instance.outputs.name)
  expect(document.content).toEqual(fs.readFileSync(documentFile).toString())
})

it('should successfully update content', async () => {
  instanceYaml.inputs.file = 'document-changed.yml'

  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  firstInstanceState = instance.state

  const document = await getSSMDocument(ssm, instance.outputs.name, '$LATEST', 'YAML')
  expect(document.content).toEqual(fs.readFileSync(documentFileChanged).toString())
})

it('should successfully remove document', async () => {
  await sdk.remove(instanceYaml, credentials, slsConfig)

  const document = await getSSMDocument(ssm, firstInstanceState.name)
  expect(document).toBeNull()
})
