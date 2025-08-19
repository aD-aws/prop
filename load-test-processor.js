const jwt = require('jsonwebtoken');

module.exports = {
  generateAuthToken,
  generateBuilderToken,
  createTestProject,
  createTestSoW
};

function generateAuthToken(context, events, done) {
  const token = jwt.sign(
    { 
      userId: `load-test-user-${Math.random().toString(36).substr(2, 9)}`,
      userType: 'homeowner'
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  context.vars.authToken = token;
  return done();
}

function generateBuilderToken(context, events, done) {
  const token = jwt.sign(
    { 
      userId: `load-test-builder-${Math.random().toString(36).substr(2, 9)}`,
      userType: 'builder'
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  context.vars.builderToken = token;
  return done();
}

function createTestProject(context, events, done) {
  // Generate a mock project ID for testing
  context.vars.projectId = `load-test-project-${Math.random().toString(36).substr(2, 9)}`;
  return done();
}

function createTestSoW(context, events, done) {
  // Generate a mock SoW ID for testing
  context.vars.sowId = `load-test-sow-${Math.random().toString(36).substr(2, 9)}`;
  return done();
}