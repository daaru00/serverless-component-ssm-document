const path = require('path')
const { randomId, getClients, getDocumentAccountPermissions } = require('../src/utils')
const { getServerlessSdk, getCredentials } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// configurations
const srcPath = path.join(__dirname, 'src')
const documentFile = 'document.yml'
const slsConfig = {
  debug: true
}
const testAccountPermissions = '123456789123'
const testAccountPermissions2 = '123456789124'

// the yaml file we're testing against
const instanceYaml = {
  org: 'daaru' || process.env.SERVERLESS_ORG,
  app: 'ssm' || process.env.SERVERLESS_APP,
  component: 'aws-ssm-document@dev',
  name: `my-document-${randomId()}`,
  stage: 'test',
  inputs: {
    src: srcPath,
    file: documentFile,
    region: process.env.SERVERLESS_REGION,
    accountIds: [testAccountPermissions]
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

it('should successfully create with permissions', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  const permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)

  expect(instance.outputs.accountIds).toBeDefined()
  expect(instance.outputs.accountIds).toEqual(instanceYaml.inputs.accountIds)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)
})

it('should successfully add permissions', async () => {
  instanceYaml.inputs.accountIds = []

  let permissions
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)
  expect(instance.outputs.accountIds).toBeDefined()
  expect(instance.outputs.accountIds).toEqual(instanceYaml.inputs.accountIds)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)

  instanceYaml.inputs.accountIds = [testAccountPermissions]

  await sdk.deploy(instanceYaml, credentials, slsConfig)
  permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)
})

it('should successfully remove permissions', async () => {
  instanceYaml.inputs.accountIds = [testAccountPermissions]

  let permissions
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)

  instanceYaml.inputs.accountIds = []

  await sdk.deploy(instanceYaml, credentials, slsConfig)
  permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)
})

it('should successfully edit permissions', async () => {
  instanceYaml.inputs.accountIds = [testAccountPermissions]

  let permissions
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)

  instanceYaml.inputs.accountIds = [testAccountPermissions, testAccountPermissions2]

  await sdk.deploy(instanceYaml, credentials, slsConfig)
  permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)

  instanceYaml.inputs.accountIds = [testAccountPermissions2]

  await sdk.deploy(instanceYaml, credentials, slsConfig)
  await sdk.deploy(instanceYaml, credentials, slsConfig)
  permissions = await getDocumentAccountPermissions(ssm, instance.outputs.name)
  expect(permissions).toEqual(instanceYaml.inputs.accountIds)
})
