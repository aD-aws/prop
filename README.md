# UK Home Improvement Platform

A comprehensive web application that streamlines the process of planning, scoping, and contracting home improvement projects in the UK. The platform uses AI-powered analysis to generate detailed Scopes of Work (SoW) that comply with UK building regulations and industry standards.

## Features

- **AI-Powered Document Analysis**: Uses AWS Bedrock (Claude 3.5 Sonnet) to analyze structural drawings and extract specifications
- **Intelligent SoW Generation**: Generates detailed, compliant Scopes of Work following RICS, NRM1/NRM2, RIBA Plan of Work, and NHBC standards
- **Council Data Integration**: Automatically checks for conservation areas, listed building status, and planning restrictions
- **Multi-User Workflows**: Separate interfaces for homeowners, builders, and administrators
- **Quote Management**: Facilitates quote collection and comparison from multiple builders
- **Contract Generation**: Creates legally compliant contracts with digital signature support

## Technology Stack

- **Backend**: Node.js with TypeScript and Express.js
- **Database**: AWS DynamoDB with single-table design
- **AI/ML**: AWS Bedrock (Claude 3.5 Sonnet, Amazon Titan)
- **File Storage**: AWS S3
- **Document Processing**: AWS Textract
- **Caching**: Redis
- **Infrastructure**: AWS Lambda, API Gateway, ECS/Fargate
- **Monitoring**: AWS CloudWatch, X-Ray

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- AWS CLI configured (for production)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd uk-home-improvement-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development services**
   ```bash
   docker-compose up -d
   ```

5. **Set up DynamoDB table**
   ```bash
   node scripts/setup-dynamodb.js
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at:
- API: http://localhost:3000
- DynamoDB Admin: http://localhost:8001
- Redis: localhost:6379

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## API Documentation

### Health Check
- `GET /health` - Application health status

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects` - List user projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project

## Architecture

The application follows a microservices architecture with the following key components:

- **User Management Service**: Handles authentication and user profiles
- **Project Management Service**: Manages project lifecycle and requirements
- **Document Processing Service**: Processes uploaded documents using AI
- **SoW Generation Service**: Creates compliant Scopes of Work
- **Quote Management Service**: Handles builder quotes and comparisons
- **Contract Generation Service**: Creates and manages contracts
- **Council Data Integration**: Fetches planning and regulatory data

## Industry Standards Compliance

The platform ensures compliance with:

- **RICS**: Royal Institution of Chartered Surveyors professional standards
- **NRM1/NRM2**: New Rules of Measurement for cost estimation
- **RIBA Plan of Work**: Structured project phases and deliverables
- **NHBC**: National House Building Council standards for residential projects
- **UK Building Regulations**: Current building standards and requirements

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.