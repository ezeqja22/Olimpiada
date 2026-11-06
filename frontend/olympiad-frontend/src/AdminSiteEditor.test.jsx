import React from "react";
import { beforeEach, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminSiteEditor from "./AdminSiteEditor";
vi.mock("axios",()=>({default:{get:vi.fn(),put:vi.fn(),post:vi.fn()}}));
vi.mock("./context/AuthContext",()=>({useAuth:()=>({currentUser:{role:"admin"},authLoading:false})}));

beforeEach(()=>{
  vi.clearAllMocks();
  axios.get.mockResolvedValue({data:{}});
  axios.put.mockResolvedValue({data:{ok:true}});
});

test("admin can edit and save bilingual homepage copy",async()=>{
  render(<MemoryRouter><AdminSiteEditor/></MemoryRouter>);
  expect(await screen.findByRole("heading",{name:"Përmbajtja e Website-it"})).toBeInTheDocument();
  await waitFor(()=>expect(axios.get).toHaveBeenCalled());
  const sqTitle = screen.getByLabelText(/Titulli \(SQ\)/);
  fireEvent.change(sqTitle,{target:{value:"Titull provë"}});
  fireEvent.click(screen.getByRole("button",{name:"EN"}));
  fireEvent.change(screen.getByLabelText(/Titulli \(EN\)/),{target:{value:"Test heading"}});
  fireEvent.click(screen.getByRole("button",{name:"Ruaj ndryshimet"}));
  await waitFor(()=>expect(axios.put).toHaveBeenCalledWith(
    expect.stringContaining("/experience/admin/content/hero"),
    expect.objectContaining({title_sq:"Titull provë",title_en:"Test heading"}),
    expect.any(Object)
  ));
});

test("editor uses the same grouped sidebar and can select inner pages",async()=>{
  render(<MemoryRouter><AdminSiteEditor/></MemoryRouter>);
  await waitFor(()=>expect(axios.get).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button",{name:"Pyetjet e shpeshta"}));
  expect(screen.getByText(/Seksioni: page_faq/)).toBeInTheDocument();
});
