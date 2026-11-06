import React from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { FAQPage, SupportPage } from "./HelpPages";

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("./components/Layout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("./context/AuthContext", () => ({ useAuth: () => ({ currentUser: null }) }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

test("FAQ displays approved API questions and switches languages", async () => {
  axios.get.mockResolvedValue({ data: [{ id: 42, question_sq: "Si hyj?", answer_sq: "Hyr në llogari.", question_en: "How do I log in?", answer_en: "Use your account." }] });
  render(<MemoryRouter><FAQPage /></MemoryRouter>);
  const question = await screen.findByRole("button", { name: /Si hyj/ });
  fireEvent.click(question);
  expect(screen.getByText("Hyr në llogari.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "EN" }));
  expect(screen.getByText("How do I log in?")).toBeInTheDocument();
  expect(screen.getByText("Use your account.")).toBeInTheDocument();
});

test("FAQ with no reviewed entries links to support", async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<MemoryRouter><FAQPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/Po përditësojmë përgjigjet/)).toBeInTheDocument());
  expect(screen.getByRole("link", { name: /Kontakto suportin/ }).getAttribute("href")).toBe("/support");
});

test("Support form sends a ticket and acknowledges its ID", async () => {
  axios.post.mockResolvedValue({ data: { ticket_id: 17, status: "open" } });
  render(<MemoryRouter><SupportPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Emri"), { target: { value: "Sample User" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sample@example.com" } });
  fireEvent.change(screen.getByLabelText("Subjekti"), { target: { value: "Login issue" } });
  fireEvent.change(screen.getByLabelText("Mesazhi"), { target: { value: "Please help me log in." } });
  fireEvent.click(screen.getByRole("button", { name: "Dërgo kërkesën" }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/experience/support/tickets"), expect.objectContaining({ email: "sample@example.com" })));
  expect(await screen.findByRole("status")).toHaveTextContent("#17");
});
