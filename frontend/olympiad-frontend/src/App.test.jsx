import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import {vi, test, expect, afterEach} from 'vitest';
import axios from 'axios';
import App from './App';
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
afterEach(cleanup);
test('homepage offers learning navigation without subscriptions or library', async () => {
  localStorage.clear();
  window.history.replaceState({}, '', '/homepage');
  axios.get.mockImplementation(async url => ({data: url.endsWith('/experience/teachers') ? [] : url.endsWith('/site-info') ? {site_name:'Olimpiada',maintenance_mode:false} : {}}));
  render(<App />);
  expect(await screen.findByRole('heading',{level:1})).toBeInTheDocument();
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')==='/forum-catalog')).toBe(true);
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')==='/pricing')).toBe(false);
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')==='/library')).toBe(false);
  expect(screen.queryByText(/Basic|Premium|Abonimet|Biblioteka/)).not.toBeInTheDocument();
});

test.each(['/library','/library/1'])('retired library link %s redirects to Explore',async path=>{
  localStorage.clear();
  window.history.replaceState({},'',path);
  axios.get.mockImplementation(async url=>({data:url.endsWith('/public/forums')?[]:{}}));
  render(<App/>);
  expect(await screen.findByRole('heading',{name:'Eksploro Olimpiada'})).toBeInTheDocument();
  expect(window.location.pathname).toBe('/explore');
});
