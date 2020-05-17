const path = require('path')
const { Component } = require('@serverless/core')
const {
  log,
  getClients,
  getSSMDocument,
  prepareInputs,
  createSSMDocument,
  updateSSMDocument,
  deleteDocument
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
    inputs = prepareInputs(inputs, this.state, this.stage)

    // Check previous document
    let prevDocument = null
    log(`Checking if an AWS SSM Document has already been created with name: ${inputs.name}`)
    prevDocument = await getSSMDocument(ssm, inputs.name)

    // Deploy
    let output = {}
    if (prevDocument === null) {
      log(`Creating new SSM Document..`)
      output = await createSSMDocument(ssm, inputs)
      log(`Document ${inputs.name} created successfully!`)
    } else {
      log(`Updating existing SSM Document..`)
      output = await updateSSMDocument(ssm, inputs.name, inputs)
      log(`Document ${inputs.name} updated successfully!`)
    }

    // Update state
    this.state = output

    // Export outputs
    return output
  }

  /**
   * Remove
   * @param {*} inputs
   */
  async remove(inputs = {}) {
    const documentName = inputs.name || this.state.name
    if (!documentName) {
      throw new Error(`No components found. Components seems already removed`)
    }

    // Retrieve data
    const { ssm } = getClients(this.credentials.aws, inputs.region)

    // Delete document
    log(`Removing AWS SSM Document ${documentName} from the ${inputs.region} region.`)
    await deleteDocument(ssm, documentName)
    log(`Successfully removed AWS SSM Document ${documentName} from the ${inputs.region} region.`)
    this.state = {}
    return {}
  }
}

module.exports = AwsSSMDocument
