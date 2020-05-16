const path = require('path')
const { ServerlessSDK } = require('@serverless/platform-client')
const dotenv =
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }).parsed || {}

/**
 * Sleep for a certain amount of seconds
 * @param {number} seconds
 */
const sleep = async (seconds = 1) =>
  new Promise((resolve) => setTimeout(() => resolve(), seconds * 1000))

/**
 * Initializes and returns an instance of the serverless sdk
 * @param {string} orgName - the serverless org name. Must correspond to the access key in the env
 */
const getServerlessSdk = (orgName) => {
  const sdk = new ServerlessSDK({
    accessKey: process.env.SERVERLESS_ACCESS_KEY || dotenv.SERVERLESS_ACCESS_KEY,
    context: {
      orgName: orgName || process.env.SERVERLESS_ORG
    }
  })
  return sdk
}

/*
 * Fetches AWS credentials from the current environment
 * either from env vars, or .env file in the /tests directory
 */
const getCredentials = () => {
  const credentials = {
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || dotenv.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || dotenv.AWS_SECRET_ACCESS_KEY
    }
  }

  if (!credentials.aws.accessKeyId || !credentials.aws.accessKeyId) {
    throw new Error('Unable to run tests. AWS credentials not found in the envionrment')
  }

  return credentials
}

/**
 * Exports
 */
module.exports = {
  sleep,
  getServerlessSdk,
  getCredentials
}
