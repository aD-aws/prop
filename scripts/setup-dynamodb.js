const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: 'eu-west-2',
  endpoint: 'http://localhost:8000',
});

const TABLE_NAME = 'uk-home-improvement-platform';

async function createTable() {
  try {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    
    if (TableNames.includes(TABLE_NAME)) {
      console.log(`Table ${TABLE_NAME} already exists`);
      process.exit(0);
    }

    await client.send(new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    }));

    console.log('Table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTable();
