# Contributing to Shikho Teacher Portal

Thank you for your interest in contributing to the Shikho Teacher Portal! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Feature Ideas](#feature-ideas)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions professional

## Getting Started

### Prerequisites

- Node.js 18.17+
- Git
- VS Code (recommended) with extensions:
  - ESLint
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

### Setup

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/teacher-portal.git
cd teacher-portal

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/teacher-portal.git

# Install dependencies
npm install

# Start development server
npm run dev
```

## Development Workflow

### Branch Naming

Use descriptive branch names:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/add-student-search` |
| Bug Fix | `fix/description` | `fix/login-validation` |
| Improvement | `improve/description` | `improve/dashboard-loading` |
| Documentation | `docs/description` | `docs/api-readme` |

### Creating a Feature

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes**
   - Write code
   - Test locally
   - Run lint: `npm run lint`

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add student search functionality"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Project Architecture

### Directory Structure

```
src/
├── app/          # Pages (Next.js App Router)
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
├── lib/          # Business logic & utilities
└── middleware.ts # Request middleware
```

### Key Patterns

#### Components

Create components in `src/components/`:

```tsx
// src/components/MyComponent.tsx
"use client";

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <h2 className="font-bold text-slate-800">{title}</h2>
      {onAction && (
        <button onClick={onAction} className="btn-primary mt-4">
          Action
        </button>
      )}
    </div>
  );
}
```

Export from `src/components/index.ts`:

```ts
export { default as MyComponent } from "./MyComponent";
```

#### Hooks

Create hooks in `src/hooks/`:

```tsx
// src/hooks/useMyHook.ts
"use client";

import { useState, useEffect } from "react";

export function useMyHook(initialValue: string) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    // Side effects
  }, []);

  return { value, setValue };
}
```

#### Pages

Create pages in `src/app/`:

```tsx
// src/app/my-page/page.tsx
"use client";

import { useAuth } from "@/hooks";
import { LoadingSpinner } from "@/components";

export default function MyPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Page content */}
    </div>
  );
}
```

### Styling Guidelines

We use Tailwind CSS. Follow these patterns:

```tsx
// Colors (use CSS variables)
className="bg-[#354894]"        // Brand blue
className="text-slate-800"      // Primary text
className="text-slate-500"      // Secondary text

// Spacing
className="p-4"                 // Standard padding
className="gap-4"               // Standard gap
className="space-y-4"           // Vertical spacing

// Cards
className="bg-white rounded-2xl shadow-md p-5"

// Buttons
className="bg-[#354894] text-white py-3 px-6 rounded-xl font-medium"

// Use global classes from globals.css
className="btn-primary"
className="btn-secondary"
className="input-field"
className="animate-fadeIn"
```

### Bengali Text

All user-facing text should be in Bengali:

```tsx
// Good
<p>শিক্ষার্থী যোগ করুন</p>

// Avoid (unless technical)
<p>Add Student</p>
```

## Coding Standards

### TypeScript

- Use proper types, avoid `any`
- Define interfaces for props and data
- Use type imports when possible

```tsx
// Good
interface Student {
  id: string;
  name: string;
  rollNumber: string;
}

// Avoid
const student: any = { ... };
```

### React

- Use functional components
- Use hooks for state and effects
- Prefer composition over inheritance

```tsx
// Good
export default function MyComponent({ data }: Props) {
  const [state, setState] = useState(initialState);
  // ...
}

// Avoid
class MyComponent extends React.Component { ... }
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `LoadingSpinner.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Pages | lowercase with dashes | `my-page/page.tsx` |

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(students): add bulk import functionality
fix(auth): resolve login redirect loop
docs(readme): update installation steps
refactor(dashboard): extract stats into component
```

## Pull Request Process

1. **Before submitting**
   - Run `npm run lint` and fix errors
   - Run `npm run build` to verify build
   - Test your changes manually
   - Update documentation if needed

2. **PR Title**
   - Use conventional commit format
   - Be descriptive: `feat(reports): add PDF export for attendance`

3. **PR Description**
   - Describe what changes were made
   - Explain why (link to issue if applicable)
   - Include screenshots for UI changes
   - List any breaking changes

4. **Review Process**
   - Address review comments
   - Keep the PR focused (one feature per PR)
   - Squash commits if requested

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Screenshots (if applicable)

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed the code
- [ ] Tested locally
- [ ] Updated documentation
```

## Feature Ideas

Looking to contribute but not sure what? Here are some ideas:

### Easy (Good First Issues)
- [ ] Add loading skeletons to more pages
- [ ] Improve form validation messages
- [ ] Add keyboard navigation support
- [ ] Translate remaining English text to Bengali

### Medium
- [ ] Student search and filter
- [ ] Export reports to PDF
- [ ] Dark mode support
- [ ] Notification preferences

### Advanced
- [ ] Backend API integration
- [ ] Real-time collaboration
- [ ] Offline-first architecture
- [ ] Multi-language support

---

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Email: support@example.com

Thank you for contributing!
