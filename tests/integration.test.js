const fs = require('fs')
const path = require('path')
const { randomId, getSSMDocument, getClients } = require('../src/utils')
const { getServerlessSdk, getCredentials } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// configurations
const documentFile = path.join(__dirname, 'document.yml')
const documentFileChanged = path.join(__dirname, 'document-changed.yml')

// the yaml file we're testing against
const instanceYaml = {
  org: 'daaru' || process.env.SERVERLESS_ORG,
  app: 'test-ssm-document' || process.env.SERVERLESS_APP,
  component: 'aws-ssm-document@dev',
  name: `aws-lambda-integration-tests-${randomId()}`,
  stage: 'dev',
  inputs: {
    file: documentFile
  }
}

// we need to keep the initial instance state after first deployment
// to validate removal later
let firstInstanceState

// get aws credentials from env
const credentials = getCredentials()
const { ssm } = getClients(credentials, process.env.AWS_DEFAULT_REGION)

// get serverless access key from env and construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

// clean up the instance after tests
afterAll(async () => {
  if (!firstInstanceState || !firstInstanceState.name) {
    return
  }
  await sdk.remove(instanceYaml, credentials)
})

it('should successfully deploy ssm document', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  // store the initial state for removal validation later on
  firstInstanceState = instance.state

  expect(instance.outputs.name).toBeDefined()
  expect(instance.outputs.content).toEqual(fs.readFileSync(documentFile))
})

it('should successfully update content', async () => {
  instanceYaml.inputs.file = documentFileChanged

  await sdk.deploy(instanceYaml, credentials)

  const document = await getSSMDocument(ssm, firstInstanceState.name)
  expect(document.content).toEqual(fs.readFileSync(documentFileChanged))
})

it('should successfully remove document', async () => {
  await sdk.remove(instanceYaml, credentials)

  const document = await getSSMDocument(ssm, firstInstanceState.name)
  expect(document).toBeNull()
})
