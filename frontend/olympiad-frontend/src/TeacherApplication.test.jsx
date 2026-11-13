import React from 'react';
import {test,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import {TeacherApplicationPage} from './ExperiencePages';
const user={id:1,email:'test@example.org'};
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>({currentUser:user})}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
vi.mock('./components/SitePageIntro',()=>({default:()=>null}));
test('application read failure does not offer a duplicate application and can retry',async()=>{
 axios.get.mockRejectedValueOnce(new Error('offline'));
 render(<MemoryRouter><TeacherApplicationPage/></MemoryRouter>);
 await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Dërgo aplikimin'})).not.toBeInTheDocument();
 axios.get.mockResolvedValueOnce({data:{status:'pending'}});
 fireEvent.click(screen.getByRole('button',{name:'Retry'}));await screen.findByText('Statusi: pending');
 expect(axios.post).not.toHaveBeenCalled();
});
