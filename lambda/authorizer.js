// lambda/authorizer.js
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  // 認証ヘッダーの取得
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.log('Unauthorized: No Basic auth header');
    return generatePolicy('user', 'Deny', event.methodArn);
  }
  
  // Basic 認証情報のデコード
  try {
    const encodedCredentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    // 環境変数から認証情報を取得（または固定値を使用）
    const validUsername = process.env.AUTH_USERNAME || 'admin';
    const validPassword = process.env.AUTH_PASSWORD || 'password';
    
    if (username === validUsername && password === validPassword) {
      console.log('Authorized');
      return generatePolicy(username, 'Allow', event.methodArn);
    } else {
      console.log('Unauthorized: Invalid credentials');
      return generatePolicy(username, 'Deny', event.methodArn);
    }
  } catch (error) {
    console.log('Error:', error);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};

// IAM ポリシードキュメントの生成
const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {
    principalId: principalId
  };
  
  if (effect && resource) {
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource
      }]
    };
    authResponse.policyDocument = policyDocument;
  }
  
  return authResponse;
};
