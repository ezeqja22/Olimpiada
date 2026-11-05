import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import {vi, test, expect, afterEach} from 'vitest';
import axios from 'axios';
import App from './App';
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
afterEach(cleanup);
test('homepage offers learning navigation without subscriptions', async () => {
  localStorage.clear();
  window.history.replaceState({}, '', '/homepage');
  axios.get.mockImplementation(async url => ({data: url.endsWith('/experience/teachers') ? [] : url.endsWith('/site-info') ? {site_name:'Olimpiada',maintenance_mode:false} : {}}));
  render(<App />);
  expect(await screen.findByRole('heading',{level:1})).toBeInTheDocument();
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')==='/library')).toBe(true);
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')==='/pricing')).toBe(false);
  expect(screen.queryByText(/Basic|Premium|Abonimet/)).not.toBeInTheDocument();
});
