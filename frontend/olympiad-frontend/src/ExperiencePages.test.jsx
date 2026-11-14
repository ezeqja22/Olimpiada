import React from 'react';
import {beforeEach,expect,test,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import {TeacherWorkspace} from './ExperiencePages';
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>({currentUser:{role:'teacher'}})}));
beforeEach(()=>{
 vi.clearAllMocks();
 axios.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/submissions')?[{attempt_id:7,student_id:2,answers:'Reasoning',score:60,feedback:'Keep this feedback'}]:url.endsWith('/courses')?[{id:4,title:'Algebra'}]:[]}));
 axios.post.mockResolvedValue({data:{}});
});
test('changing only a score preserves the saved feedback',async()=>{
 render(<MemoryRouter><TeacherWorkspace/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'View submissions'}));
 fireEvent.change(await screen.findByLabelText('Score /100'),{target:{value:'80'}});
 fireEvent.click(screen.getByRole('button',{name:'Save assessment'}));
 await waitFor(()=>expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/submissions/7/grade'),{score:80,feedback:'Keep this feedback'},expect.anything()));
});
