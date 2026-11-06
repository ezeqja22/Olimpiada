import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import VisualMathEditor from "./VisualMathEditor";

function EditorHarness({ initial = "" }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <VisualMathEditor value={value} onChange={setValue} />
      <output data-testid="serialized">{value}</output>
    </>
  );
}

test("inserts a visual symbol but retains LaTeX text for the existing API", () => {
  render(<EditorHarness />);
  fireEvent.click(screen.getByRole("button", { name: "π" }));
  expect(screen.getByTestId("serialized")).toHaveTextContent("$\\pi$");
  expect(document.querySelector(".vme-formula")?.dataset.math).toBe("\\pi");
});

test("restores stored formulas and removes them on double click", () => {
  render(<EditorHarness initial="Formula: $x^2$" />);
  const formula = document.querySelector(".vme-formula");
  expect(formula).toBeTruthy();
  fireEvent.doubleClick(formula);
  expect(screen.getByTestId("serialized")).toHaveTextContent("Formula:");
  expect(screen.getByTestId("serialized")).not.toHaveTextContent("$x^2$");
});

test("creates fractions without requiring users to type LaTeX", () => {
  render(<EditorHarness />);
  fireEvent.click(screen.getByRole("button", { name: /Thyesë/ }));
  fireEvent.change(screen.getByLabelText("Vlera e parë"), { target: { value: "x" } });
  fireEvent.change(screen.getByLabelText("Emëruesi"), { target: { value: "y" } });
  fireEvent.click(screen.getByRole("button", { name: "Shto formulën" }));
  expect(screen.getByTestId("serialized")).toHaveTextContent("$\\frac{x}{y}$");
});
