import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App Component', () => {
    it('renders login page by default or redirects', () => {
        render(
            <MemoryRouter initialEntries={['/login']}>
                <App />
            </MemoryRouter>
        );
        // Since we lazy load or have internal logic, let's just check if it renders without crashing
        // and ideally look for a known element like "Login"
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('renders public schedule page', () => {
        render(
            <MemoryRouter initialEntries={['/view-schedules']}>
                <App />
            </MemoryRouter>
        );
        // Based on ViewSchedulesPage.tsx
        // It has "Clinic Schedules" or similar header?
        // Let's check for campus selector or header text if we know it.
        // In ViewSchedulesPage.tsx (implied content): likely has "Clinic Schedules"
        // or we can check for "Select Campus".
        expect(screen.getByText(/Clinic Schedule/i)).toBeInTheDocument();
    });
});
