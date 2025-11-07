# Ludora Frontend

The React frontend for the Ludora educational gaming platform. Built with Vite, React 18, and modern development tools.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Access the application at `http://localhost:5173`

## Development Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Check code style
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Radix-based)
│   ├── auth/           # Authentication components
│   └── shared/         # Shared business components
├── pages/              # Route-level page components
├── contexts/           # React Context providers
├── services/           # API communication layer
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── lib/                # Library configurations
```

## Key Technologies

- **React 18** - Modern React with hooks and concurrent features
- **Vite** - Fast build tool and development server
- **React Router v7** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible, unstyled UI primitives
- **React Hook Form** - Form handling with validation
- **Zod** - Runtime type validation
- **Vitest** - Fast unit testing framework

## Environment Configuration

Create a `.env` file with:

```bash
# API Configuration
VITE_API_PORT=3000

# Firebase Authentication
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Architecture Highlights

### Component System
- **Design System**: Consistent UI components with Tailwind CSS
- **Accessibility**: Radix UI primitives for screen reader support
- **Responsive**: Mobile-first design with RTL support for Hebrew
- **Type Safety**: Zod validation for runtime type checking

### State Management
- **Authentication**: UserContext for app-wide auth state
- **Local State**: React hooks for component-level state
- **Server State**: Custom hooks for API data management
- **Form State**: React Hook Form for complex form handling

### API Integration
- **Service Layer**: Entity-based API clients (workshopService, gameService, etc.)
- **Error Handling**: Structured error responses with user feedback
- **Authentication**: Automatic JWT token handling
- **Caching**: Intelligent data caching and invalidation

## Development Guidelines

### Component Patterns
- Use functional components with hooks
- Implement loading and error states
- Follow accessibility best practices
- Support RTL (Hebrew) layouts

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Support both LTR and RTL text directions
- Use design tokens for consistency

### Testing Strategy
- Unit tests for components and hooks
- Integration tests for user workflows
- Mock API calls with MSW
- Test accessibility compliance

## Features

### Educational Gaming
- Multiple game types (Memory, Scatter, Wisdom Maze, etc.)
- Rich content management (Hebrew/English)
- Progress tracking and analytics
- Rule-based content selection

### User Management
- Multi-role authentication (Student, Teacher, Admin)
- Profile management with avatars
- School and classroom organization
- Parent consent workflow

### Content Creation
- Visual game builder interface
- Content upload and management
- Template-based game configuration
- Preview and testing tools

### Business Operations
- Product catalog (Workshops, Courses, Files, Tools)
- Purchase and subscription management
- Payment processing integration
- Creator revenue tracking

## Performance Optimizations

- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Tree shaking and dependency optimization
- **Asset Optimization**: Image optimization and lazy loading
- **Caching**: Browser caching for static assets

## Accessibility Features

- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant color schemes
- **RTL Support**: Right-to-left layout for Hebrew content

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Documentation

For detailed documentation, see:

- **[Component Guide](../docs/frontend/components.md)** - Reusable component patterns
- **[API Integration](../docs/frontend/api-integration.md)** - Service layer and data fetching
- **[State Management](../docs/frontend/state-management.md)** - Context and state patterns
- **[Styling Guide](../docs/frontend/styling-guide.md)** - Tailwind CSS and design system
- **[Testing Patterns](../docs/frontend/testing-patterns.md)** - Testing strategies and examples

## Contributing

1. Follow the established component patterns
2. Write tests for new features
3. Update documentation for changes
4. Ensure accessibility compliance
5. Test on both LTR and RTL layouts

## Deployment

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to staging/production
# (Follow your deployment process)
```

The build output will be in the `dist/` directory, ready for deployment to any static hosting service.

---

**Note**: This project was migrated from Base44 to a custom architecture for enhanced control and scalability.# Test deployment with clean env script - Fri Nov  7 19:37:09 +07 2025
