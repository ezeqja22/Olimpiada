import React from 'react';
import {render, screen, cleanup, act, fireEvent} from '@testing-library/react';
import {vi, test, expect, afterEach} from 'vitest';
import axios from 'axios';
import App from './App';
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
afterEach(cleanup);
test('homepage offers both catalogues without subscriptions', async () => {
  localStorage.clear();
  window.history.replaceState({}, '', '/homepage');
  axios.get.mockImplementation(async url => ({data: url.endsWith('/experience/teachers') ? [] : url.endsWith('/site-info') ? {site_name:'Olimpiada',maintenance_mode:false} : {}}));
  render(<App />);
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(await screen.findByRole('heading',{level:1})).toBeInTheDocument();
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')==='/forums')).toBe(true);
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')==='/pricing')).toBe(false);
  expect(screen.getByRole('link',{name:'Biblioteka online'})).toHaveAttribute('href','/library');
  expect(screen.getByRole('link',{name:'Olimpiadat'})).toHaveAttribute('href','/olympiads');
  expect(screen.queryByText(/Basic|Premium|Abonimet/)).not.toBeInTheDocument();
});

test.each(['/library','/library/1'])('library route %s opens the library directly',async path=>{
  localStorage.clear();
  window.history.replaceState({},'',path);
  axios.get.mockImplementation(async url=>({data:url.endsWith('/public/library')?[]:{}}));
  render(<App/>);
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(await screen.findByRole('heading',{name:'Biblioteka online'})).toBeInTheDocument();
  expect(window.location.pathname).toBe(path);
});

test('olympiad search filters by subject and opens the participation steps', async () => {
  localStorage.clear();
  window.history.replaceState({}, '', '/olympiads');
  axios.get.mockImplementation(async url => ({data: url.endsWith('/public/olympiads') ? [
    {id:1,slug:'imo',name:'Olimpiada Ndërkombëtare e Matematikës',acronym:'IMO',
      subject:'Matematikë',scope:'international',audience:'Gjimnaz',importance:'Gara botërore.',
      history:'Edicioni i parë në Rumani.',steps:['Kalo testet seleksionuese.'],
      source_url:'https://www.imo-official.org/'},
    {id:2,slug:'ioi',name:'Olimpiada Ndërkombëtare e Informatikës',acronym:'IOI',
      subject:'Informatikë',scope:'international',importance:'Programim algoritmik.'},
  ] : {}}));
  render(<App/>);
  await act(async () => { await vi.dynamicImportSettled(); });
  const search = await screen.findByRole('searchbox',{name:'Kërko olimpiadat'});
  fireEvent.change(search,{target:{value:'matematikes'}});
  expect(screen.queryByRole('link',{name:/IOI/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link',{name:/IMO/}));
  expect(await screen.findByText('Kalo testet seleksionuese.')).toBeInTheDocument();
  expect(window.location.pathname).toBe('/olympiads/imo');
});
