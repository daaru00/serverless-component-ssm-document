const fs = require('fs')
const os = require('os')
const path = require('path')
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

  const ssm = new AWS.SSM({ credentials, region })
  return { ssm }
}

/**
 * Get SSM Document
 * @param {AWS.SSM} ssm
 * @param {string} documentName
 * @param {string} documentFormat
 * @param {string} documentVersion
 * @returns {object|null}
 */
const getSSMDocument = async (ssm, documentName, documentFormat, documentVersion) => {
  if (!documentName) {
    return null
  }
  try {
    const res = await ssm
      .getDocument({
        Name: documentName,
        DocumentVersion: documentVersion || '$LATEST',
        DocumentFormat: documentFormat
      })
      .promise()

    return {
      format: res.DocumentFormat,
      type: res.DocumentType,
      name: res.Name,
      version: res.DocumentVersion,
      timeout: res.VersionName,
      runtime: res.Status,
      content: res.Content
    }
  } catch (e) {
    if (e.code === 'InvalidDocument') {
      return null
    }
    throw e
  }
}

/**
 * Get shell document definition
 * @param {string} scriptFile
 * @param {object} parameters
 * @param {string} description
 * @returns {string}
 */
const getShellDocument = (scriptFile, parameters = {}, description = '') => {
  if (fs.existsSync(scriptFile) == false) {
    throw new Error(
      `Cannot find input shell script file '${scriptFile}'. Check if file path is relative to src input settings.`
    )
  }
  const scriptFileContent = fs.readFileSync(scriptFile).toString()

  return JSON.stringify({
    schemaVersion: '2.2',
    description,
    parameters,
    mainSteps: [
      {
        action: 'aws:runShellScript',
        name: 'RunShellScript',
        inputs: {
          runCommand: scriptFileContent.split(os.EOL)
        }
      }
    ]
  })
}

/**
 * Prepare inputs
 * @param {object} inputs
 * @param {object} state
 * @param {object} instance
 */
const prepareInputs = (inputs, state, instance) => {
  let content = ''
  let format = inputs.format || state.format
  if (format === 'SHELL') {
    format = 'JSON'
    if (!inputs.file || inputs.file.trim() === '') {
      throw new Error(
        `File property is required when using SHELL format, it should point to a Shell script (.sh).`
      )
    }
    content = getShellDocument(inputs.file, inputs.parameters || {}, inputs.description || '')
  } else if (inputs.content && typeof inputs.content === 'string') {
    content = inputs.content.trim()
  } else if (inputs.content && typeof inputs.content === 'object') {
    format = 'JSON'
    content = JSON.stringify(inputs.content)
  } else if (inputs.file) {
    if (fs.existsSync(inputs.file) == false) {
      throw new Error(
        `Cannot find input file '${inputs.file}'. Check if file path is relative to src input settings.`
      )
    }
    content = fs.readFileSync(inputs.file).toString()
    format = path
      .extname(inputs.file)
      .slice(1)
      .toUpperCase()
    // normalize format names
    format = format === 'YML' ? 'YAML' : format
    format = format === 'TXT' ? 'TEXT' : format
  }
  return {
    name: inputs.name || state.name || `${instance.app}-${instance.stage}-${instance.name}`,
    type: inputs.type || state.type || 'Command',
    format,
    content,
    file: inputs.file,
    accountIds: inputs.accountIds
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
      DocumentFormat: inputs.format,
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
  let res
  try {
    res = await ssm
      .updateDocument({
        Name: documentName,
        Content: inputs.content,
        DocumentVersion: '$LATEST'
      })
      .promise()

    await ssm
      .updateDocumentDefaultVersion({
        Name: documentName,
        DocumentVersion: res.DocumentDescription.DocumentVersion
      })
      .promise()

    res.DocumentDescription.DefaultVersion = res.DocumentDescription.DefaultVersion
  } catch (e) {
    if (e.code !== 'DuplicateDocumentContent') {
      throw e
    } else {
      res = {
        DocumentDescription: await ssm
          .getDocument({
            Name: documentName,
            DocumentVersion: '$LATEST'
          })
          .promise()
      }
    }
  }

  return {
    name: res.DocumentDescription.Name,
    versionName: res.DocumentDescription.VersionName,
    defaultVersion: res.DocumentDescription.DocumentVersion,
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
  try {
    await ssm
      .deleteDocument({
        Name: documentName
      })
      .promise()
  } catch (e) {
    if (e.code !== 'InvalidDocument') {
      throw e
    }
  }
}

/**
 * Get account IDs that has share permissions
 * @param {AWS.SSM} ssm
 * @param {string} documentName
 * @returns {string[]}
 */
const getDocumentAccountPermissions = async (ssm, documentName) => {
  const { AccountIds } = await ssm
    .describeDocumentPermission({
      Name: documentName,
      PermissionType: 'Share'
    })
    .promise()
  return AccountIds
}

/**
 * Modify account IDs that has share permissions
 * @param {AWS.SSM} ssm
 * @param {string} documentName
 * @param {string[]} accountIdsToAdd
 * @param {string[]} accountIdsToRemove
 */
const modifyDocumentAccountPermissions = async (
  ssm,
  documentName,
  accountIdsToAdd = [],
  accountIdsToRemove = []
) => {
  await ssm
    .modifyDocumentPermission({
      Name: documentName,
      PermissionType: 'Share',
      AccountIdsToAdd: accountIdsToAdd,
      AccountIdsToRemove: accountIdsToRemove
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
  deleteDocument,
  getDocumentAccountPermissions,
  modifyDocumentAccountPermissions
}
