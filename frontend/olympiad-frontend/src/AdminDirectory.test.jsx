import React from "react";
import {expect,test,vi} from "vitest";
import {render,screen,fireEvent,within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {AdminDirectory} from "./AdminDashboard";
const language=vi.hoisted(()=>({lang:"en"}));
vi.mock("./context/LanguageContext",()=>({useLanguage:()=>language}));
test("admin directory exposes Olympiads and Library and supports bilingual search",()=>{
 language.lang="en";
 const view=render(<MemoryRouter><AdminDirectory role="admin"/></MemoryRouter>);
 expect(screen.getByRole("link",{name:"Olympiads"})).toHaveAttribute("href","/admin/olympiads");
 expect(screen.getByRole("link",{name:"Online library"})).toHaveAttribute("href","/admin/library");
 fireEvent.change(screen.getByRole("searchbox",{name:"Find a section"}),{target:{value:"biblioteka"}});
 expect(screen.getByRole("link",{name:"Online library"})).toBeInTheDocument();
 expect(screen.queryByRole("link",{name:"Olympiads"})).not.toBeInTheDocument();
 language.lang="sq";view.rerender(<MemoryRouter><AdminDirectory role="admin"/></MemoryRouter>);
 expect(screen.getByRole("link",{name:"Biblioteka online"})).toBeInTheDocument();
});
test("directory never exposes admin-only links to moderators",()=>{
 language.lang="en";
 render(<MemoryRouter><AdminDirectory role="moderator"/></MemoryRouter>);
 const directory=screen.getByRole("region",{name:"Administration tools"});
 expect(within(directory).queryByRole("link",{name:"Settings"})).not.toBeInTheDocument();
 expect(within(directory).queryByRole("link",{name:"Email"})).not.toBeInTheDocument();
 expect(within(directory).getByRole("link",{name:"Olympiads"})).toBeInTheDocument();
});
