const AWS = require('aws-sdk')

/**
 * Generate a random ID
 */
const randomId = (length = 6) =>
  Math.random()
    .toString(36)
    .substring(length)

/**
 * Console log replacement
 * @param {*} msg
 */
const log = (msg) => console.log(msg) // eslint-disable-line

/**
 * Console error replacement
 * @param {*} msg
 */
const logError = (msg) => console.error(msg) // eslint-disable-line

/**
 * Get AWS SDK Clients
 * @param {object} credentials
 * @param {string} region
 */
const getClients = (credentials, region) => {
  // this error message assumes that the user is running via the CLI though...
  if (Object.keys(credentials).length === 0) {
    const msg = `Credentials not found. Make sure you have a .env file in the cwd. - Docs: https://git.io/JvArp`
    throw new Error(msg)
  }

  const ssm = new AWS.SSM({ credentials, region, logger: log })
  return { ssm }
}

/**
 * Get SSM Document
 * @param {AWS.SSM} ssm
 * @param {string} documentName
 * @param {string} documentVersion
 * @returns {object|null}
 */
const getSSMDocument = async (ssm, documentName, documentVersion) => {
  if (!documentName) {
    return null
  }
  try {
    const res = await ssm
      .getDocument({
        Name: documentName,
        DocumentVersion: documentVersion
      })
      .promise()

    return {
      format: res.DocumentFormat,
      type: res.DocumentType,
      name: res.Name,
      description: res.DocumentVersion,
      timeout: res.VersionName,
      runtime: res.Status,
      content: res.Content
    }
  } catch (e) {
    if (e.code === 'DocumentNotFoundException') {
      return null
    }
    throw e
  }
}

/**
 * Prepare inputs
 * @param {object} inputs
 * @param {object} state
 * @param {string} stage
 */
const prepareInputs = (inputs, state, stage) => {
  return {
    name: inputs.name || state.name || `aws-document-${stage}-${randomId()}`
  }
}

/**
 * Create a new SSM document
 * @param {AWS.SSM} ssm
 * @param {object} inputs
 * @returns {AWS.SSM.CreateDocumentResult}
 */
const createSSMDocument = async (ssm, inputs) => {
  const res = await ssm
    .createDocument({
      Name: inputs.name,
      DocumentType: inputs.type,
      Content: inputs.content
    })
    .promise()

  return {
    name: res.DocumentDescription.Name,
    versionName: res.DocumentDescription.VersionName,
    defaultVersion: res.DocumentDescription.DefaultVersion,
    latestVersion: res.DocumentDescription.LatestVersion,
    createdDate: res.DocumentDescription.CreatedDate,
    hashType: res.DocumentDescription.HashType,
    hash: res.DocumentDescription.Hash
  }
}

/**
 * Update existing SSM document
 * @param {AWS.SSM} ssm
 * @param {string} documentName
 * @param {object} inputs
 * @returns {AWS.SSM.CreateDocumentResult}
 */
const updateSSMDocument = async (ssm, documentName, inputs) => {
  const res = await ssm
    .updateDocument({
      Name: documentName,
      Content: inputs.content
    })
    .promise()

  return {
    name: res.DocumentDescription.Name,
    versionName: res.DocumentDescription.VersionName,
    defaultVersion: res.DocumentDescription.DefaultVersion,
    latestVersion: res.DocumentDescription.LatestVersion,
    createdDate: res.DocumentDescription.CreatedDate,
    hashType: res.DocumentDescription.HashType,
    hash: res.DocumentDescription.Hash
  }
}

/**
 * Delete existing SSM document
 * @param {AWS.SSM} ssm
 * @param {string} documentName
 */
const deleteDocument = async (ssm, documentName) => {
  await ssm
    .deleteDocument({
      Name: documentName
    })
    .promise()
}

/**
 * Exports
 */
module.exports = {
  log,
  logError,
  randomId,
  getClients,
  getSSMDocument,
  prepareInputs,
  createSSMDocument,
  updateSSMDocument,
  deleteDocument
}
