# Circuit Infrastructure

We use [Terraform](https://www.terraform.io/) for the management of the infrastructure of the Circuit system. This includes most (ideally, we'll get to all) resources on AWS, as well as the DNS regions of ridecircuit.com and tfrholdingscorp.com on GoDaddy.

## Setup

### Requirements

#### Access

The first step to configuring this part of the project is making sure you have the proper access to required resources:

Ask some AWS account administrator to make sure you have the required IAM permissions to create/update/destroy the resources used in the project. One option is to make sure you're part of the `Administrators` IAM group, but other solutions exist. Ideally, just make sure we follow good practices, so avoid, for example, manually attaching all the required policies to your user one by one. Since this step will require the intervention of someone who already has some permissions on AWS, this responsibility relies on them more than on you.

Ask to be given access to the `circuit-terraform-state` S3 bucket. Someone will have to edit the Bucket policy to make sure the ARN of your IAM user is in the list of users that can read, edit and delete files in the bucket.

#### Configuring access from your machine

After making sure you have the required permissions, you need to actually configure the access from your machine to AWS.

First off, create an Access key. On AWS, go to the [IAM service](https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/home), then [Users](https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/users), then select your own user. Open the `Security credentials` tab, and scroll to Access keys. If you already have any access key that you use, for example, with AWS CLI, you might reuse it. If you see any Access key that you don't have access to anymore, or that hasn't been used in a long time, take this chance to delete it, or deactivate it. In any case, select `Create access key`, choose `Command Line Interface (CLI)` for the Use case, click the confirmation checkbox and click `Next`. Add any tags you think might be useful, and click `Create access key`. Make sure you copy the Secret, as you won't be able to retrieve it later.

Configure the AWS CLI. The [official documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) has a few options on how to do this. You'll need the Access key and Access key secret from the previous step. In the end, you'll have a file at `~/.aws/credentials`, with something similar to the following:

```
[default]
aws_access_key_id = <the ID from the access key you created>
aws_secret_access_key = <the secret from the access key you created>
```

Depending on your setup, you may end up with multiple blocks like the above. Each block will be associated with different AWS profiles, which happens, for example, if you have access to multiple AWS accounts. If that's the case, figure out what's the block corresponding to the access key you created above, and check what's the string within the square brackets. If it's not `default`, keep track of that string, as you'll need that profile name later on.

### Configuring the Terraform backend

Create a file `circuit.s3.tfbackend`. It should have the following contents:
```
bucket  = "circuit-terraform-state"
key     = "circuit.state"
region  = "us-east-1"
```

If you're using a profile other than the default one, add also a line like `profile = "<profile name>"`. In my case, I use a profile called `circuit`, so my backend file looks like:
```
bucket  = "circuit-terraform-state"
key     = "circuit.state"
region  = "us-east-1"
profile = "circuit"
```

Run `terraform init -backend-config=circuit.s3.tfbackend`. This command will install the used Terraform providers ([AWS](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) and [GoDaddy](https://registry.terraform.io/providers/n3integration/godaddy/latest/docs)). Also, thanks to the `-backend-config` flag you provided and the credentials you have set up, it'll configure Terraform to track the remote state file on S3. The state file is what Terraform uses to track what changes need to be made at any given time, if any. It has a list of what resources are being tracked by Terraform, as well as their status after the last time they were updated with Terraform (by any member of the team).

### Make sure you have a variables file

Ask someone in the team for a file called `terraform.tfvars`. It includes secrets and configurations required for managing some resources. In the future, we should try to figure out a way to more efficiently share this file across the team.

## Making changes

Check the documentations for the providers we use ([AWS](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) and [GoDaddy](https://registry.terraform.io/providers/n3integration/godaddy/latest/docs)) to see how to write the changes you want to make using HCL. When you make changes, you need to create a plan, and if that plan looks ok, you apply the plan. There are other ways to do things and to skip steps, but this is the recommended approach.

### Create a plan

Run `terraform plan -out tfplan`. This command will compare the configuration as it is written with the status of each resource tracked in the state file. If a resource is on the state but not in the code, Terraform will mark it as a resource to be deleted. If a resource is in the code but not in the state file, Terraform will attempt to create it. For other resources, Terraform will compare their current configuration with what's described in the code, and determine what changes need to be applied. Besides showing you a list of the changes to apply, the command will generate (or update) the `tfplan` file, which is in the `.gitignore` (it's encrypted, but the contents will change anytime you run the command since it stores information regarding current timestamp).

### Apply the plan

If you're happy with the list of changes listed by Terraform, you can run `terraform apply tfplan`. Terraformm will then apply said changes, using the appropriate API calls under the hood. Beware that while some changes take only a couple of seconds to run, others may take quite some time.

Sometimes it's useful to generate a new plan after applying changes, to make sure that everthing went as expected.

## Miscellaneous

### Updating providers

Every now and then, new versions of the Terraform providers are released, either to track changes to the underlying APIs or to add new functionality or security features. The file `main.tf` has a list of the used providers, and their versions.

After a provider version is changed in the `main.tf` file, you'll need to install the new version and update the state file to also reflect the change. If you didn't update the file yourself, and if you weren't warned of such changes, you'll probably find out when you try to create a plan and Terraform prints an output similar to the following:
```
│ Error: Inconsistent dependency lock file
│ 
│ The following dependency selections recorded in the lock file are inconsistent with the current configuration:
│   - provider registry.terraform.io/hashicorp/aws: locked version selection <X.xx.x> doesn't match the updated version constraints "~> <Y.yy.y>"
│ 
│ To update the locked dependency selections to match a changed configuration, run:
│   terraform init -upgrade
```

Well, just run the provided command: `terraform init -upgrade` and your setup will be up to date once again.

### A note on multiple AWS profiles

If you have multiple AWS profiles and are not using the default one for this project, you'll notice, for example, that when you try to create your first plan, Terraform will warn you that your user doesn't have access to some resources, and the plan will include the creation of over 100 resources.

One solution involves updating the `main.tf` file so that the `provider "aws"` blocks in lines 18 and 23 include `profile = "<profile name>"`. This solution only works if everyone in the team uses the same profile name, so if you use it, don't commit it.

A second solution involves changing your AWS configuration (in `~/.aws/credentials`) so that the default profile points to the Circuit account. The feasibility of this solution depends on your usage of the AWS CLI and similar resources, since access may become broken for other profiles.

A third solution involves using the `AWS_PROFILE` environment variable. This can be achieved in a few different ways:

1. Prepending your commands with `AWS_PROFILE=<profile name>`. For example, for a profile named `circuit`, to generate a plan, you could run `AWS_PROFILE=circuit terraform plan -out tfplan`.

2. Running `export AWS_PROFILE=<profile name>` when you start your working session. As long as you remain in the same console/terminal window/session, the environment variable will be set.

3. Adding the environment variable to your shell configuration. For example, adding `export AWS_PROFILE=<profile name>` to `~/.zshrc`, `~/.bashrc`, `~/.profile`, or other.

4. Use a tool like [direnv](https://direnv.net/) and create a file called `.envrc` (already in `.gitignore`) with the line `export AWS_PROFILE=<profile name>`. Whenever you enter the `terraform` directory, `direnv` will read the `.envrc` file, automatically loading the environment variable until you leave it.
