# AWS System Manager Document Component 

This component create an [AWS System Manager Document](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-ssm-docs.html),
also update the latest version during change apply.

## Before Starting

This repository is not part of official [Serverless Components repository](https://github.com/serverless/components).
This is an experimental component built following "Building Components" section guide.

## Getting Started

For more information about Serverless Components follow [official guide](https://github.com/serverless/components).

### 1. Install

To get started with component, install the latest version of the Serverless Framework:

```
$ npm install -g serverless
```

### 2. Credentials

Create a new `.env` file in the root of the `aws-ssm-document` directory right next to `serverless.yml`, and add your AWS access keys:

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

### 3. Configure

Here's a complete reference of the `serverless.yml` file for the `aws-ssm-document` component:

```yml
# serverless.yml

component: aws-ssm-document      # (required) name of the component. In that case, it's aws-ssm-document.
name: my-document                # (required) name of your component instance.
org: daaru                       # (optional) serverless dashboard org. default is the first org you created during signup.
app: myApp                       # (optional) serverless dashboard app. default is the same as the name property.
stage: dev                       # (optional) serverless dashboard stage. default is dev.

inputs:
  name: my-document-name         # (optional) name of the document. default is auto-generated prepending stage name.
  type: Command                  # (optional) SSM document type. default it "Command".
  region: us-east-1              # (optional) aws region to deploy to. default is us-east-1.
  content:                       # (required if file is not set) document content.
    schemaVersion: "2.2"
    description: "Example document"
    parameters:
      Message:
        type: "String"
        description: "Example parameter"
        default: "Hello World"
    mainSteps:
      - action: "aws:runShellScript"
        name: "example"
        inputs:
          runCommand:
            - "echo {{Message}}"
  accountIds:
    - '123456789123'             # (optional) id of aws accounts to share document to
```

Can be configure to use a content file:

```yml
# serverless.yml

component: aws-ssm-document
name: my-document
org: daaru
app: myApp
stage: dev

inputs:
  src: '.'                       # (required if file is set) document file directory.
  name: my-document-name         # (optional) name of the document. default is auto-generated prepending stage name.
  type: Command                  # (optional) SSM document type. default it "Command".
  region: us-east-1              # (optional) aws region to deploy to. default is us-east-1.
  format: YAML                   # (optional) will check file extension (.json|.yml|.yaml|.txt|.text).
  file: ./document.yml           # (required if content is not set) document file content.
```

Then create SSM Document file `document.yml`:

```yml
# document.yml

schemaVersion: "2.2"
description: A description of the document.
parameters:
  parameter 1:
    property 1: "value"
    property 2: "value"
  parameter 2:
    property 1: "value"
    property 2: "value"
mainSteps:
  - action: Plugin name
    name: A name for the step.
    inputs:
      input 1: "value"
      input 2: "value"
      input 3: "{{ parameter 1 }}"
```
For more details about SSM Document syntax check [AWS Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-doc-syntax.html)

Additionally can be configured a short-hand config for Shell scripts:

```yml
# serverless.yml

component: aws-ssm-document
name: my-document
org: daaru
app: myApp
stage: dev

inputs:
  src: '.'                       # (required if file is set) document file directory.
  region: us-east-1              # (optional) aws region to deploy to. default is us-east-1.
  format: SHELL                  # (required) special document format (not a real SSM Document format, will be use JSON).
  name: my-document-name         # (optional) name of the document. default is auto-generated prepending stage name.
  description: "My Document"     # (optional) SSM document description. will be set into document definition.
  parameters:                    # (optional) SSM document parameters. will be set into document definition.
    parameter 1:
      property 1: "value"
      property 2: "value"
    parameter 2:
      property 1: "value"
      property 2: "value"
  file: ./my-command.sh          # (required) Shell file command.
```
can also automatically detect shell script from file extension:
```yml
# serverless.yml

component: aws-ssm-document
name: my-document
org: daaru
app: myApp
stage: dev

inputs:
  src: '.'
  region: us-east-1
  name: my-document-name
  description: "My Document"
  file: ./my-command.sh          # (required) Shell file command.
```

Then create the shell command file `my-command.sh`:

```bash
#!/bin/bash

echo "{{ parameter 1 }}"
```

### 4. Deploy

Once you have the directory set up, you're now ready to deploy. Just run the following command from within the directory containing the `serverless.yml` file:

```
$ serverless deploy
```

Your first deployment might take a little while, but subsequent deployment would just take few seconds. For more information on what's going on during deployment, you could specify the `--debug` flag, which would view deployment logs in realtime:

```
$ serverless deploy --debug
```

### 5. Info

Anytime you need to know more about your created `aws-ssm-document` instance, you can run the following command to view the most info. 

```
$ serverless info
```

### 6. Remove

If you wanna tear down your entire `aws-ssm-document` infrastructure that was created during deployment, just run the following command in the directory containing the `serverless.yml` file. 
```
$ serverless remove
```
