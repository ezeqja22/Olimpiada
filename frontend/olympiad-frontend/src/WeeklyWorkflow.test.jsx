import React from 'react';
import { test,expect,vi,beforeEach } from 'vitest';
import { render,screen,fireEvent,waitFor,act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import WeeklyPage,{AdminWeekly} from './WeeklyPage';
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'sq'})}));
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>({currentUser:{id:1}})}));
vi.mock('./components/SitePageIntro',()=>({default:()=>null}));
vi.mock('./MathRenderer',()=>({default:({text})=><div>{text}</div>}));
beforeEach(()=>vi.clearAllMocks());
test('failed weekly submission keeps the answer and permits retry; pending submission cannot repeat',async()=>{
 axios.get.mockResolvedValue({data:{challenge:{id:1,status:'open',problem:{title:'Test',description:'Question'}}}});
 let reject;axios.post.mockImplementationOnce(()=>new Promise((_,r)=>{reject=r}));
 render(<MemoryRouter><WeeklyPage/></MemoryRouter>);
 const answer=await screen.findByLabelText('Zgjidhja jote');fireEvent.change(answer,{target:{value:'My reasoning'}});
 fireEvent.submit(answer.closest('form'));expect(screen.getByRole('button',{name:'Duke dërguar…'})).toBeDisabled();
 fireEvent.submit(answer.closest('form'));expect(axios.post).toHaveBeenCalledTimes(1);
 await act(async()=>reject(new Error('offline')));
 expect(answer).toHaveValue('My reasoning');expect(screen.getByRole('button',{name:'Dërgo zgjidhjen'})).toBeEnabled();
});
test('changing weekly review never shows submissions from an earlier request',async()=>{
 let resolveOld;
 axios.get.mockImplementation(url=>url.endsWith('/queue')?Promise.resolve({data:[{id:1,week_date:'Week 1'},{id:2,week_date:'Week 2'}]}):url.includes('/1/submissions')?new Promise(r=>{resolveOld=r}):Promise.resolve({data:[{id:22,answer:'Second week',status:'pending'}]}));
 render(<MemoryRouter><AdminWeekly/></MemoryRouter>);
 const buttons=await screen.findAllByRole('button',{name:/Shiko zgjidhjet/});
 fireEvent.click(buttons[0]);fireEvent.click(buttons[1]);await screen.findByText('Second week');
 await act(async()=>resolveOld({data:[{id:11,answer:'Old week',status:'pending'}]}));
 expect(screen.queryByText('Old week')).not.toBeInTheDocument();expect(screen.getByText('Second week')).toBeInTheDocument();
});

test('published rankings can be inspected by week while the current problem is open', async () => {
 axios.get.mockImplementation((url, config) => {
  if (url.endsWith('/rankings')) return Promise.resolve({data:{
   weeks:['2026-10-05'], rankings:[{rank:1,user_id:1,username:'Student',points:config.params.week?8:15}],
  }});
  return Promise.resolve({data:{challenge:{id:2,status:'open',problem:{title:'Test',description:'Question'}}}});
 });
 render(<MemoryRouter><WeeklyPage/></MemoryRouter>);
 expect(await screen.findByText('15')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Sipas javës'}));
 expect(screen.getByText('Pikët shfaqen kur publikohen rezultatet.')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Java'),{target:{value:'2026-10-05'}});
 expect(await screen.findByText('8')).toBeInTheDocument();
});
