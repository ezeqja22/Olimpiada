import React from 'react';
import { beforeEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import ThreadPage from './ThreadPage';
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn(),delete:vi.fn()}}));
vi.mock('./components/Header',()=>({default:()=>null}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
const reply={id:4,author_id:2,content:'Reasoning $x^2$',author:{username:'Student'},created_at:'2026-01-01T12:00:00Z'};
function setup(role='member'){
 axios.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/me')?{id:1}:url.endsWith('/members')?[{user_id:1,role}]:url.endsWith('/replies')?[reply]:url.endsWith('/messages')?[{id:3,content:'Original question',author:{username:'Tutor'},created_at:reply.created_at}]:{title:'Algebra'}}));
 render(<MemoryRouter initialEntries={['/forum/2/thread/3']}><Routes><Route path='/forum/:forumId/thread/:messageId' element={<ThreadPage/>}/></Routes></MemoryRouter>);
}
beforeEach(()=>{vi.clearAllMocks();Element.prototype.scrollIntoView=vi.fn();localStorage.setItem('token','local-test');});
test('failed replies preserve text and can be retried without exposing moderation controls to regular members',async()=>{
 setup();await screen.findByLabelText('Your reply');expect(screen.queryByRole('button',{name:'Delete reply'})).not.toBeInTheDocument();
 axios.post.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({data:{}});
 fireEvent.change(screen.getByLabelText('Your reply'),{target:{value:'A reasoned answer'}});fireEvent.click(screen.getByRole('button',{name:'Reply',exact:true}));
 await screen.findByRole('alert');expect(screen.getByLabelText('Your reply')).toHaveValue('A reasoned answer');
 fireEvent.click(screen.getByRole('button',{name:'Reply',exact:true}));await waitFor(()=>expect(screen.getByLabelText('Your reply')).toHaveValue(''));expect(axios.post).toHaveBeenCalledTimes(2);
});
test('moderators retain labeled reply deletion and mathematical content renders',async()=>{
 setup('moderator');const button=await screen.findByRole('button',{name:'Delete reply'});expect(document.querySelector('.thread-reply .katex')).toBeTruthy();axios.delete.mockResolvedValue({data:{}});fireEvent.click(button);await waitFor(()=>expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/forums/2/replies/4'),expect.any(Object)));
});
