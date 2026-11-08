import React from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CourseHub from "./CourseHub";
vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("./components/SitePageIntro", () => ({
  default: ({ title }) => <h1>{title}</h1>,
}));
vi.mock("./MathRenderer", () => ({ default: ({ text }) => <div>{text}</div> }));
const item = {
  id: 8,
  title: "Timed reasoning",
  kind: "test",
  subject: "Mathematics",
  instructions: "Explain",
  duration_minutes: 30,
};
beforeEach(() => {
  vi.clearAllMocks();
  axios.get.mockResolvedValue({ data: [item] });
});
test("viewing a test does not start it; the server clock controls the countdown", async () => {
  render(
    <MemoryRouter>
      <CourseHub />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "View test" }));
  expect(axios.post).not.toHaveBeenCalled();
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  axios.post.mockResolvedValue({
    data: {
      server_now: "2020-01-01T12:00:00",
      deadline: "2020-01-01T12:30:00",
      body: "Question",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start timed test" }));
  expect(await screen.findByRole("timer")).toHaveTextContent("30:00");
  expect(
    screen.getByRole("button", { name: "Submit answer" }),
  ).not.toBeDisabled();
});
test("failed submission keeps the answer and allows retry", async () => {
  axios.get.mockResolvedValue({
    data: [{ ...item, kind: "homework", body: "Question" }],
  });
  render(
    <MemoryRouter>
      <CourseHub />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "View homework" }));
  fireEvent.change(screen.getByLabelText("Your answer"), {
    target: { value: "My reasoning" },
  });
  axios.post.mockRejectedValue(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
  await screen.findByText(/Your answer is still here/);
  expect(screen.getByLabelText("Your answer")).toHaveValue("My reasoning");
});
test("reviewed work displays the learner feedback without starting a new attempt", async () => {
  axios.get.mockResolvedValue({
    data: [
      {
        ...item,
        my_attempt: {
          submitted_at: "2020-01-01",
          graded_at: "2020-01-02",
          score: 85,
          feedback: "Good explanation",
        },
      },
    ],
  });
  render(
    <MemoryRouter>
      <CourseHub />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "View test" }));
  expect(screen.getByText(/85\/100 · Good explanation/)).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});
