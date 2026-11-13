import React from 'react';
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RouteLoadBoundary from './RouteLoadBoundary';
vi.mock('../context/LanguageContext', () => ({useLanguage:()=>({lang:'en'})}));
test('a failed page exposes recovery instead of a blank screen', () => {
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 function Broken() {throw new Error('Failed to fetch dynamically imported module');}
 try {
  render(<MemoryRouter><RouteLoadBoundary><Broken/></RouteLoadBoundary></MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent('This page could not open');
  expect(screen.getByRole('button',{name:'Reload page'})).toBeInTheDocument();
 } finally {log.mockRestore();}
});
