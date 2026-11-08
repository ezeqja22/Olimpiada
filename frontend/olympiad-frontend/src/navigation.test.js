import { expect, test } from "vitest";
import { loginDestination, loginIntent } from "./navigation";
test("normal and logout login land on homepage", () => {
  expect(loginDestination(null)).toBe("/homepage");
  expect(loginDestination({})).toBe("/homepage");
});
test("protected route preserves explicit query destination", () => {
  const intent = loginIntent("/forums?tab=mine");
  expect(loginDestination(intent)).toBe("/forums?tab=mine");
});
test("stale or old courses state cannot hijack login", () => {
  expect(loginDestination({ redirectTo: "/courses" })).toBe("/homepage");
  expect(
    loginDestination({ redirectTo: "/courses", loginIntentAt: 1 }, 10000000),
  ).toBe("/homepage");
});
test("unsafe and authentication destinations are rejected", () => {
  for (const to of [
    "https://evil.test",
    "//evil.test",
    "/login",
    "/signup",
    "/\\evil.test",
  ])
    expect(loginDestination(loginIntent(to))).toBe("/homepage");
});

test("logout invalidates an earlier intended route", () => {
  expect(
    loginDestination({ redirectTo: "/courses", loginIntentAt: 100 }, 150, 120),
  ).toBe("/homepage");
});
