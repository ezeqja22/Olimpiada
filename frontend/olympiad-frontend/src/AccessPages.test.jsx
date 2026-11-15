import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { Tutoring, Learning } from './AccessPages';
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('./components/SitePageIntro',()=>({default:()=>null}));
test('choosing a tutor sets subject and teacher in one action, and changing subject clears the teacher',async()=>{
 axios.get.mockResolvedValue({data:[{teacher_id:7,teacher:'Test Tutor',subject:'Mathematics'}]});
 render(<MemoryRouter><Tutoring/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:/Test Tutor/}));
 await waitFor(()=>expect(screen.getByLabelText('Profesori')).toHaveValue('7'));
 expect(screen.getByLabelText('Lënda')).toHaveValue('Mathematics');
 expect(screen.getByRole('button',{name:'Dërgo kërkesë te administratori'})).toBeEnabled();
 fireEvent.change(screen.getByLabelText('Lënda'),{target:{value:'Physics'}});
 expect(screen.getByLabelText('Profesori')).toHaveValue('');
});
test('resource reader preserves full content and restricts meeting links to Google Meet',async()=>{
 axios.get.mockResolvedValue({data:[{id:1,kind:'material',title:'Proof',subject:'Mathematics',body:'Full proof text'},{id:2,kind:'meet',title:'Meeting',subject:'Physics',body:'https://meet.google.com/abc-defg-hij'},{id:3,kind:'meet',title:'Other',subject:'Physics',body:'https://example.org/'}]});
 render(<MemoryRouter><Learning/></MemoryRouter>);
 expect(await screen.findByText('Full proof text')).toBeInTheDocument();
 const meetings=screen.getAllByRole('link',{name:/Bashkohu/,hidden:true});expect(meetings).toHaveLength(1);expect(meetings[0]).toHaveAttribute('href','https://meet.google.com/abc-defg-hij');
 expect(screen.getByText('https://example.org/')).toBeInTheDocument();
});
