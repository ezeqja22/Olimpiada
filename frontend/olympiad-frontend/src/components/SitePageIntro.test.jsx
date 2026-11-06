import React from "react";
import { beforeEach, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import SitePageIntro from "./SitePageIntro";

vi.mock("axios",()=>({default:{get:vi.fn()}}));
vi.mock("../context/LanguageContext",()=>({useLanguage:()=>({lang:"en"})}));
beforeEach(()=>{vi.clearAllMocks();});

test("page header falls back to English site copy when no edit exists",async()=>{
  axios.get.mockResolvedValue({data:{}});
  render(<MemoryRouter><SitePageIntro contentKey="page_faq" kicker="FAQ"
    title="Pyetje të shpeshta" subtitle="Përshkrimi" /></MemoryRouter>);
  expect(await screen.findByRole("heading",{name:"Frequently asked questions"})).toBeInTheDocument();
});

test("saved bilingual title and image appear on the public page",async()=>{
  axios.get.mockResolvedValue({data:{page_faq:{title_en:"Questions & answers",
    subtitle_en:"Welcome to [support](/support).",image_url:"https://example.com/photo.jpg"}}});
  render(<MemoryRouter><SitePageIntro contentKey="page_faq" title="FAQ"
    subtitle="Default" /></MemoryRouter>);
  expect(await screen.findByRole("heading",{name:"Questions & answers"})).toBeInTheDocument();
  expect(screen.getByRole("img",{name:"Questions & answers"})).toHaveAttribute("src","https://example.com/photo.jpg");
  expect(screen.getByRole("link",{name:"support"})).toHaveAttribute("href","/support");
});
