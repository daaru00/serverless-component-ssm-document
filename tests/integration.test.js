const fs = require('fs')
const path = require('path')
const {
  randomId,
  getSSMDocument,
  getClients,
  getDocumentAccountPermissions
} = require('../src/utils')
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
    region: process.env.SERVERLESS_REGION
  }
}

// get aws credentials from env
const credentials = getCredentials()
const { ssm } = getClients(credentials.aws, process.env.AWS_DEFAULT_REGION)

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

it('should successfully deploy ssm document', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, 'YAML', '$LATEST')
  expect(document.name).toEqual(instance.outputs.name)
  expect(document.content).toEqual(fs.readFileSync(path.join(srcPath, documentFile)).toString())
})

it('should successfully update content from file', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  instanceYaml.inputs.file = documentFileChanged

  await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, 'YAML', '$LATEST')
  expect(document.content).toEqual(
    fs.readFileSync(path.join(srcPath, documentFileChanged)).toString()
  )
})

it('should successfully update content', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  delete instanceYaml.inputs.file
  instanceYaml.inputs.content = {
    schemaVersion: '2.2',
    description: 'Example document with other changes',
    parameters: {
      Message: {
        type: 'String',
        description: 'Example parameter changed',
        default: 'Hello World!'
      }
    },
    mainSteps: [
      {
        action: 'aws:runShellScript',
        name: 'exampleWithChanges',
        inputs: {
          runCommand: ['echo {{Message}}']
        }
      }
    ]
  }
  await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, 'JSON', '$LATEST')
  expect(document.content).toEqual(JSON.stringify(instanceYaml.inputs.content))
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

it('should successfully remove document', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  await sdk.remove(instanceYaml, credentials, slsConfig)

  const document = await getSSMDocument(ssm, instance.outputs.name)
  expect(document).toBeNull()
})
