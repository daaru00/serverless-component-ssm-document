const path = require('path')
const { Component } = require('@serverless/core')
const {
  log,
  getClients,
  getSSMDocument,
  prepareInputs,
  createSSMDocument,
  updateSSMDocument,
  deleteDocument,
  getDocumentAccountPermissions,
  modifyDocumentAccountPermissions
} = require('./utils')

class AwsSSMDocument extends Component {
  /**
   * Deploy
   * @param {*} inputs
   */
  async deploy(inputs = {}) {
    // Get AWS clients
    const { ssm } = getClients(this.credentials.aws, inputs.region)

    // Throw error on name change
    if (this.state.name && inputs.name !== undefined && this.state.name !== inputs.name) {
      throw new Error(
        `Changing the name from ${this.state.name} to ${inputs.name} will delete the AWS SSM document.  Please remove it manually, change the name, then re-deploy.`
      )
    }

    // Throw error on region change
    if (this.state.region && this.state.region !== inputs.region) {
      throw new Error(
        `Changing the region from ${this.state.region} to ${inputs.region} will delete the AWS SSM document.  Please remove it manually, change the region, then re-deploy.`
      )
    }

    // Prepare inputs
    if (inputs.file) {
      const filesPath = await this.unzip(inputs.src, true)
      inputs.file = path.join(filesPath, inputs.file)
    }
    inputs = prepareInputs(inputs, this.state, this)

    // Check previous document
    let prevDocument = null
    log(`Checking if an AWS SSM Document has already been created with name: ${inputs.name}`)
    prevDocument = await getSSMDocument(ssm, inputs.name, inputs.format)

    // Deploy
    if (prevDocument === null) {
      log(`Creating new SSM Document..`)
      await createSSMDocument(ssm, inputs)
      log(`Document ${inputs.name} created successfully!`)
    } else {
      log(`Updating existing SSM Document..`)
      await updateSSMDocument(ssm, inputs.name, inputs)
      log(`Document ${inputs.name} updated successfully!`)
    }

    // Check permissions
    inputs.accountIds = inputs.accountIds || []
    inputs.accountIds = inputs.accountIds.map((accountId) => accountId.toString())
    if (inputs.accountIds.length > 0) {
      log(
        `Checking document ${inputs.name} permissions for ${inputs.accountIds.length} provided accounts ids..`
      )
      const currentAccountIds = await getDocumentAccountPermissions(ssm, inputs.name)

      // Calculate Delta
      const accountIdsToAdd = inputs.accountIds.filter(
        (accountId) => !currentAccountIds.includes(accountId)
      )
      const accountIdsToRemove = currentAccountIds.filter(
        (accountId) => !inputs.accountIds.includes(accountId)
      )

      // Apply Delta
      if (accountIdsToAdd.length !== 0 || accountIdsToRemove.length !== 0) {
        log(
          `Modifying document ${inputs.name} permissions: adding ${accountIdsToAdd.length} and removing ${accountIdsToRemove.length}..`
        )
        await modifyDocumentAccountPermissions(
          ssm,
          inputs.name,
          accountIdsToAdd,
          accountIdsToRemove
        )
        log(`Document ${inputs.name} permissions updated successfully!`)
      } else {
        log(`Document ${inputs.name} permissions are already in sync.`)
      }
    }

    // Update state
    this.state = await getSSMDocument(ssm, inputs.name, inputs.format)
    delete this.state.content // too long
    this.state.region = inputs.region
    this.state.accountIds = await getDocumentAccountPermissions(ssm, inputs.name)

    // Export outputs
    return this.state
  }

  /**
   * Remove
   * @param {*} inputs
   */
  async remove() {
    const documentName = this.state.name
    if (!documentName) {
      log(`No components found. Components seems already removed.`)
      return {}
    }

    // Retrieve data
    const { ssm } = getClients(this.credentials.aws, this.state.region)

    // Remove all permissions
    const currentAccountIds = await getDocumentAccountPermissions(ssm, documentName)
    if (currentAccountIds.length !== 0) {
      log(`Removing AWS SSM Document ${documentName} permissions..`)
      await modifyDocumentAccountPermissions(ssm, documentName, [], currentAccountIds)
      log(`Successfully remove AWS SSM Document ${documentName} permissions!`)
    }

    // Delete document
    log(`Removing AWS SSM Document ${documentName}..`)
    await deleteDocument(ssm, documentName)
    log(`Successfully removed AWS SSM Document ${documentName}!`)
    this.state = {}
    return {}
  }
}

module.exports = AwsSSMDocument
