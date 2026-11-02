import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RichInlineText } from "./RichInlineText";

function show(text) {
  return render(<MemoryRouter><p><RichInlineText text={text}/></p></MemoryRouter>);
}

test("renders a local markdown link as a real SPA route", () => {
  show("Our mentors [Seancat 1-to-1](http://127.0.0.1:5174/tutoring)");
  expect(screen.getByRole("link", { name: "Seancat 1-to-1" })).toBeInTheDocument();
  const link = screen.getByRole("link", { name: "Seancat 1-to-1" });
  expect(link).toHaveAttribute("href", "/tutoring");
});

test("renders formatting without writing raw html", () => {
  show("Learn **algebra** and `math`.");
  expect(screen.getByText("algebra").tagName).toBe("STRONG");
  expect(screen.getByText("math").tagName).toBe("CODE");
});

test("refuses script URLs, but preserves the label as text", () => {
  show("Open [unsafe](javascript:alert(1)) and [safe](https://example.com/a)");
  expect(screen.queryByRole("link", { name: "unsafe" })).not.toBeInTheDocument();
  expect(screen.getByText(/unsafe/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "safe" })).toHaveAttribute("rel", "noopener noreferrer");
});
