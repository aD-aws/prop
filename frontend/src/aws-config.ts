// AWS Amplify Configuration for UK Home Improvement Platform

const awsConfig = {
  Auth: {
    region: process.env.REACT_APP_AWS_REGION || 'eu-west-2',
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'eu-west-2_Fg4odAsgl',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'ii7s4encarvofbm65lgr5sv7',
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID || 'eu-west-2:847a1bb4-3c31-432d-9fce-9b9bcc673b9f',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
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
    passwordPolicy: {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },
  },
  API: {
    endpoints: [
      {
        name: 'api',
        endpoint: process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production',
        region: process.env.REACT_APP_AWS_REGION || 'eu-west-2',
      },
    ],
  },
};

export default awsConfig;