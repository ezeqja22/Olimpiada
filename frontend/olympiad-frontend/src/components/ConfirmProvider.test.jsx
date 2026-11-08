import React from "react";
import { expect, test } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConfirmProvider, { useConfirm } from "./ConfirmProvider";
function Example() {
  const { confirm } = useConfirm();
  return (
    <button onClick={() => confirm({ title: "Remove test record?" })}>
      Open confirmation
    </button>
  );
}
test("confirmation focuses the safe action, traps focus, and restores its trigger", async () => {
  render(
    <ConfirmProvider>
      <Example />
    </ConfirmProvider>,
  );
  const trigger = screen.getByRole("button", { name: "Open confirmation" });
  trigger.focus();
  fireEvent.click(trigger);
  const cancel = screen.getByRole("button", { name: "Cancel" }),
    confirm = screen.getByRole("button", { name: "Confirm" });
  expect(cancel).toHaveFocus();
  fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
  expect(confirm).toHaveFocus();
  fireEvent.keyDown(confirm, { key: "Tab" });
  expect(cancel).toHaveFocus();
  fireEvent.keyDown(cancel, { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
});
