# UK Home Improvement Platform - Frontend

A React-based frontend application for the UK Home Improvement Platform, featuring AI-powered guided user experience for home improvement project planning.

## Features

- **AI-Powered Guidance**: Real-time AI assistance throughout the user journey
- **Guided Onboarding**: Step-by-step introduction to the platform
- **Project Creation Wizard**: Multi-step form with validation and AI guidance
- **Responsive Design**: Optimized for desktop and mobile devices
- **Accessibility**: WCAG 2.1 compliant with screen reader support
- **Material-UI Components**: Consistent, professional design system
- **Real-time Chat**: AI assistant available on all pages
- **Progressive Enhancement**: Works without JavaScript for basic functionality

## Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for components and theming
- **React Router** for navigation
- **React Query** for API state management
- **React Hook Form** with Yup validation
- **Axios** for HTTP requests
- **Socket.io** for real-time features
- **React Dropzone** for file uploads

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API running on port 3001

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The application will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WEBSOCKET_URL=http://localhost:3001
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AIAssistant/    # AI chat and guidance components
│   ├── Auth/           # Authentication components
│   ├── Layout/         # Layout components (Header, Footer)
│   └── ProjectCreation/ # Project creation wizard steps
├── contexts/           # React contexts for state management
├── pages/              # Page components
├── services/           # API service layer
├── theme.ts            # Material-UI theme configuration
└── types/              # TypeScript type definitions
```

## Key Components

### AI Assistant Chat
- Floating action button for easy access
- Real-time chat interface with AI
- Context-aware responses
- Quick action buttons for common questions

### Project Creation Wizard
- Multi-step form with progress tracking
- Real-time validation and AI guidance
- Address validation with council data lookup
- Document upload with drag-and-drop
- Project type selection with educational content

### Responsive Layout
- Mobile-first design approach
- Collapsible navigation for mobile
- Adaptive component layouts
- Touch-friendly interactions

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and roles
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user motion preferences
- **Focus Management**: Clear focus indicators
- **Skip Links**: Skip to main content functionality

## Testing

### Unit Tests
```bash
npm test
```

### Component Tests
```bash
npm run test:coverage
```

### End-to-End Tests
```bash
# Install Cypress
npm install cypress --save-dev

# Run Cypress tests
npx cypress open
```

## API Integration

The frontend communicates with the backend API through:

- **Authentication**: JWT-based auth with automatic token refresh
- **Project Management**: CRUD operations for projects
- **AI Services**: Real-time AI assistance and guidance
- **File Upload**: Secure document upload with progress tracking
- **WebSocket**: Real-time notifications and updates

## Performance Optimization

- **Code Splitting**: Lazy loading of route components
- **Image Optimization**: Responsive images with lazy loading
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Caching**: Service worker for offline functionality
- **Compression**: Gzip compression for production builds

## Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
# Build Docker image
docker build -t uk-home-improvement-frontend .

# Run container
docker run -p 3000:80 uk-home-improvement-frontend
```

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new components and features
3. Ensure accessibility compliance
4. Test on multiple devices and browsers
5. Update documentation as needed

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - see LICENSE file for details