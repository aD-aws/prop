// TypeScript declarations for AWS Amplify
declare module 'aws-amplify' {
  export interface AmplifyConfig {
    Auth?: any;
    API?: any;
    Storage?: any;
    [key: string]: any;
  }
  
  export default class Amplify {
    static configure(config: AmplifyConfig): void;
  }
  
  export class Auth {
    static signIn(username: string, password: string): Promise<any>;
    static signOut(): Promise<void>;
    static signUp(params: {
      username: string;
      password: string;
      attributes?: { [key: string]: string };
    }): Promise<any>;
    static confirmSignUp(username: string, code: string): Promise<any>;
    static currentAuthenticatedUser(): Promise<any>;
    static currentSession(): Promise<any>;
  }
}