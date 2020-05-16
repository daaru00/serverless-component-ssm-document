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

module.exports = class AwsSSMDocument extends Component {
  /**
   * Deploy
   * @param {*} inputs
   */
  async deploy(inputs = {}) {
    // Get AWS clients
    const { ssm } = getClients(this.credentials.aws, inputs.region)

    // Throw error on name change
    if (this.state.name && this.state.name !== inputs.name) {
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
    inputs = prepareInputs(inputs, this.state, this.stage)

    // Check previous document
    log(`Checking if an AWS SSM Document has already been created with name: ${inputs.name}`)
    let prevDocument = null
    if (!this.state || !this.state.name) {
      prevDocument = await getSSMDocument(ssm, inputs.name)
    }

    // Deploy
    let output = {}
    if (!prevDocument) {
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
   */
  async remove() {
    if (!this.state.name) {
      log(`No state found.  Function appears removed already.  Aborting.`)
      return
    }

    // Retrieve data
    const { name, region } = this.state
    const { ssm } = getClients(this.credentials.aws, region)

    // Delete document
    log(`Removing AWS SSM Document ${name} from the ${region} region.`)
    await deleteDocument(ssm, name)
    log(`Successfully removed AWS SSM Document ${name} from the ${region} region.`)
    this.state = {}
    return {}
  }
}
