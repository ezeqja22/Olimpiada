import React from 'react';
import {test,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import {AdminFAQ,AdminSupport} from './AdminHelp';
vi.mock('axios',()=>{const fn=vi.fn();fn.get=vi.fn();fn.put=vi.fn();return {default:fn};});
beforeEach(()=>vi.clearAllMocks());
test('FAQ editor retains both languages and publishing visibility',async()=>{
 axios.get.mockResolvedValue({data:[]});axios.mockResolvedValue({data:{}});
 render(<MemoryRouter><AdminFAQ/></MemoryRouter>);await screen.findByText('Existing entries (0)');
 for(const [label,value] of [['Question (Albanian)','Pyetje prove'],['Answer (Albanian)','Pergjigje prove'],['Question (English)','Test question'],['Answer (English)','Test answer']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Save FAQ'}));await waitFor(()=>expect(axios).toHaveBeenCalledWith(expect.objectContaining({method:'post',data:expect.objectContaining({question_sq:'Pyetje prove',answer_en:'Test answer',active:true})})));
});
test('failed support update retains the reply and exposes failure',async()=>{
 axios.get.mockResolvedValue({data:[{id:7,subject:'Synthetic request',message:'Please help',name:'Example',email:'synthetic@example.org',status:'open'}]});axios.put.mockRejectedValue(new Error('offline'));
 render(<MemoryRouter><AdminSupport/></MemoryRouter>);const reply=await screen.findByLabelText('Reply (optional — new/changed text is emailed)');fireEvent.change(reply,{target:{value:'Keep this draft'}});fireEvent.click(screen.getByRole('button',{name:'Save ticket'}));await screen.findByText('Could not update ticket #7.');expect(reply).toHaveValue('Keep this draft');
});

vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
