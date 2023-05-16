# DR Architecture for Amazon Cognito

This project shows how to do a near-RealTime, cross-region backup of a user pool using Amazon Cognito.

## Restrictions
- Backups cannot be performed using this solution in the following cases
    - Multi-factor authentication is enabled in the user pool.
    - Both email and phone numbers are allowed as [aliases allowed for login](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/user-pool-settings-attributes.html). If both email and phone numbers are allowed as [aliases that can be used for login] ().
- Other limitations
    - For security reasons, Amazon Cognito does not provide the ability to export user passwords, so passwords are not backed up. When using a restored user pool, you can use [reset password for user](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-pools-using- import-tool-password-reset.html).
    - The *sub* attribute of each user changes between the backup source and restore destination user pools. If your application logic uses the *sub* attribute as a unique ID, the *sub* attribute must correspond in the backup source and restore destination user pools. In this case, you can copy the *sub* attribute as a custom attribute in the backup source user pool so that it can be backed up to a DynamoDB table, which can then be used to check the *sub* attribute correspondence in the restored user pool.
    - Only user information registered via Amazon Cognito can be backed up. Information for users registered using third-party authentication (social login) will not be backed up. Users registered via social login will be asked to log in again once they have switched to the restored user pool. Also, since ID provider settings are not inherited, please configure them in the user pool at the restore destination in the same manner as the backup source.
    - If you are using the Advanced Security feature of the user pool, login history will not be backed up.
    - Information on IAM roles associated with groups will not be backed up.
    - Information on stored devices will not be backed up.
    - Since backups are not performed using transactions, there is no guarantee that backups are completely synchronized even if a user creation, modification, or deletion operation succeeds.

## Installation

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


## License

This project is licensed under the terms of the MIT license and is available for free.

