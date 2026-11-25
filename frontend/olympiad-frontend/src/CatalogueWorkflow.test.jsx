import React from 'react';
import {beforeEach, expect, test, vi} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {MemoryRouter, Routes, Route} from 'react-router-dom';
import axios from 'axios';
import {AdminLibrary} from './AdminCatalogues';
import {Library} from './CompetitionLibrary';
const language = vi.hoisted(() => ({lang:'en'}));
const auth = vi.hoisted(() => ({currentUser:{id:1},authLoading:false}));
vi.mock('./context/LanguageContext', () => ({useLanguage: () => language}));
vi.mock('./context/AuthContext', () => ({useAuth: () => auth}));
vi.mock('./components/SitePageIntro', () => ({default: () => null}));
vi.mock('axios', () => ({default:{get:vi.fn(),post:vi.fn(),put:vi.fn()}}));
beforeEach(() => {vi.clearAllMocks();language.lang='en';});

test('English admin form retries a failed catalogue load without losing edits', async () => {
 axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({data:[]});
 render(<MemoryRouter><AdminLibrary/></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('The list could not be loaded.');
 fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Keep this draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Reload list'}));
 await waitFor(()=>expect(axios.get).toHaveBeenCalledTimes(2));
 expect(screen.getByLabelText('Title')).toHaveValue('Keep this draft');
 expect(screen.getByLabelText('PDF file')).toBeRequired();
});

test('Albanian catalogue editor retains existing field labels', async () => {
 language.lang='sq';axios.get.mockResolvedValue({data:[]});
 render(<MemoryRouter><AdminLibrary/></MemoryRouter>);
 expect(await screen.findByLabelText('Titulli')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Ruaj'})).toBeInTheDocument();
});

test('reader zoom is local, retries failed pages and revokes private image URLs', async () => {
 URL.createObjectURL=vi.fn(()=> 'blob:synthetic');URL.revokeObjectURL=vi.fn();
 const doc={id:1,title:'Synthetic training',kind:'training',page_count:2,available:true};
 let fail=true;
 axios.get.mockImplementation(url=>url.endsWith('/public/library')?Promise.resolve({data:[doc]}):fail?Promise.reject(new Error('busy')):Promise.resolve({data:new Blob(['image'])}));
 const view=render(<MemoryRouter initialEntries={['/library/1']}><Routes><Route path='/library/:id' element={<Library/>}/></Routes></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('The page failed to load.');
 fail=false;fireEvent.click(screen.getByRole('button',{name:'Retry'}));
 const img=await screen.findByRole('img');
 const before=axios.get.mock.calls.length;
 fireEvent.change(screen.getByLabelText('Zoom'),{target:{value:'3'}});
 expect(img).toHaveStyle({width:'300%'});expect(axios.get).toHaveBeenCalledTimes(before);
 view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
});
