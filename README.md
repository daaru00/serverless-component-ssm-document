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
  file: ./document.yml           # (required) document file content.
```

Create SSM document file, configured in `file` inputs configuration:

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

For more details about SSM Document syntax check https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-doc-syntax.html

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
