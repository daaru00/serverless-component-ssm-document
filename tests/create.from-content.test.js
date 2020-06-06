const { getSSMDocument, getClients } = require('../src/utils')
const { getServerlessSdk, getCredentials, getCommonConfig } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// configurations
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
const instanceYamlContent = {
  ...instanceYaml,
  inputs: {
    region: process.env.SERVERLESS_REGION,
    content: {
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

it('should successfully deploy ssm document using content', async () => {
  const instance = await sdk.deploy(instanceYamlContent, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const document = await getSSMDocument(ssm, instance.outputs.name, 'JSON', '$LATEST')
  expect(document.name).toEqual(instance.outputs.name)
  expect(document.content).toEqual(JSON.stringify(instanceYamlContent.inputs.content))
})
