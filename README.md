# Base44 App

A modern web application built with [React](https://react.dev/), [Vite](https://vitejs.dev/), and [Tailwind CSS](https://tailwindcss.com/). This project features a robust UI component library based on [Shadcn/UI](https://ui.shadcn.com/) and utilizes state-of-the-art libraries for data fetching, visualization, and interactivity.

## 🚀 Features & Tech Stack

- **Core**: React 18, Vite, TypeScript support (via JSDoc/JSConfig).
- **Styling**: Tailwind CSS, `clsx`, `tailwind-merge`, `tailwindcss-animate`.
- **UI Components**: Extensive integration of Radix UI primitives (Dialog, Select, Tabs, etc.) via Shadcn/UI patterns.
- **Icons**: [Lucide React](https://lucide.dev/).
- **State & Data**: [TanStack Query](https://tanstack.com/query/latest) (React Query) for async state management.
- **Routing**: [React Router DOM](https://reactrouter.com/) for client-side routing.
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation.
- **Visualization**: [Recharts](https://recharts.org/) for charts and `react-leaflet` for maps.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for complex animations.
- **Utilities**: `date-fns`, `lodash`, `jspdf`, `xlsx` (implied by typical export needs or similar if present).

## 🛠️ Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Ensure you have Node.js installed on your machine.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd axayak
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

### Development server

Start the development server with hot module replacement:

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in your terminal) to view the app.

## 📜 Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run lint:fix`: Runs ESLint and automatically fixes fixable issues.
- `npm run typecheck`: Runs TypeScript type checking based on `jsconfig.json`.

## 📂 Project Structure

- `src/components`: Reusable UI components (buttons, dialogs, charts, etc.).
- `src/pages`: Application views/routes.
- `src/lib`: Utility functions and configuration (e.g., `utils.js`).
- `src/hooks`: Custom React hooks.
- `src/api`: API integration and services.
- `src/assets`: Static assets like images and global styles.

## 📄 License

[Add License Information Here]
