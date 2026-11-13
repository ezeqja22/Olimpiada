import React from 'react';
import { beforeEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Homepage from './Homepage';
import { LanguageProvider, LanguageSwitch } from './context/LanguageContext';
import { SITE_SECTIONS } from './siteContentConfig';
vi.mock('axios', () => ({ default: { get: vi.fn() } }));
vi.mock('./components/Header', () => ({ default: () => <LanguageSwitch /> }));
vi.mock('./hooks/useSiteSettings', () => ({ useSiteSettings: () => ({ siteSettings: { site_name: 'Olimpiada' } }) }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); axios.get.mockResolvedValue({data: {}}); });
const mount = () => render(<MemoryRouter><LanguageProvider><Homepage /></LanguageProvider></MemoryRouter>);
test('homepage has real learning destinations and no founder section', async () => {
  mount();
  expect(screen.getByRole('link', {name: /Shfleto problemet/})).toHaveAttribute('href', '/feed');
  expect(screen.getByRole('link', {name: 'Matematikë'})).toHaveAttribute('href', '/subject/mathematics');
  expect(screen.queryByText('Klevisa Zeqja')).not.toBeInTheDocument();
  expect(screen.queryByText('Enio Zeqja')).not.toBeInTheDocument();
  expect(SITE_SECTIONS.some(s => s.key.startsWith('home_founder'))).toBe(false);
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
});
test('practice explanation toggles and follows the selected language', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', {name: /Shiko shpjegimin/}));
  expect(screen.getByText(/48 cm²/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: /EN/}));
  expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Problems, solutions and discussion.');
  expect(screen.getByText(/BM and MC are equal/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: /Hide explanation/}));
  expect(screen.queryByText(/BM and MC are equal/)).not.toBeInTheDocument();
});
test('saved bilingual CMS copy, images and CTA destination override defaults', async () => {
  axios.get.mockImplementation(url => Promise.resolve({data: url.endsWith('/content') ? {
    hero: {title_sq:'Titull i ruajtur',title_en:'Saved title',image_url:'/hero.jpg'},
    competition: {title_sq:'Gara e ruajtur',image_url:'/competition.jpg'},
    cta: {title_sq:'Materialet tona',button_url:'/courses'},
  } : []}));
  mount();
  expect(await screen.findByRole('heading', {name:'Titull i ruajtur'})).toBeInTheDocument();
  expect(document.querySelector('img[src="/hero.jpg"]')).not.toBeNull();
  expect(document.querySelector('img[src="/competition.jpg"]')).not.toBeNull();
  expect(screen.getByRole('link', {name:/Eksploro platformën/})).toHaveAttribute('href','/courses');
  fireEvent.click(screen.getByRole('button', {name:/EN/}));
  expect(screen.getByRole('heading', {level:1})).toHaveTextContent('Saved title');
});
test('content service failure leaves usable navigation and default content', async () => {
  axios.get.mockRejectedValue(new Error('offline'));
  mount();
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('heading', {level:1})).toHaveTextContent('Probleme, zgjidhje dhe diskutime.');
  expect(screen.getByRole('link', {name:/Kontakto suportin/})).toHaveAttribute('href','/support');
});
