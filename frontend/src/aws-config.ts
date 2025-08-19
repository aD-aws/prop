// AWS Amplify Configuration for UK Home Improvement Platform

const awsConfig = {
  Auth: {
    Cognito: {
      region: 'eu-west-2',
      userPoolId: 'eu-west-2_Fg4odAsgl',
      userPoolClientId: 'ii7s4encarvofbm65lgr5sv7',
      identityPoolId: 'eu-west-2:847a1bb4-3c31-432d-9fce-9b9bcc673b9f',
      loginWith: {
        email: true,
        username: false,
        phone: false,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
        given_name: {
          required: true,
        },
        family_name: {
          required: true,
        },
        'custom:user_type': {
          required: false,
        },
        'custom:company_name': {
          required: false,
        },
      },
      allowGuestAccess: false,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },
    },
  },
  API: {
    REST: {
      api: {
        endpoint: 'https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production',
        region: 'eu-west-2',
      },
    },
  },
};

export default awsConfig;