import React from "react";
import {render, screen, cleanup} from "@testing-library/react";
import {MemoryRouter, Routes, Route} from "react-router-dom";
import {afterEach, test, expect, vi} from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import {useAuth} from "./context/AuthContext";
vi.mock("./context/AuthContext",()=>({useAuth:vi.fn()}));
vi.mock("./components/AnimatedLoader",()=>({default:()=> <p>Checking session</p>}));
afterEach(cleanup);
function show(){render(<MemoryRouter initialEntries={["/feed"]}><Routes>
  <Route path="/feed" element={<ProtectedRoute><h1>Feed content</h1></ProtectedRoute>}/>
  <Route path="/login" element={<h1>Login</h1>}/>
</Routes></MemoryRouter>);}
test("signed-in free account opens protected content without entitlement response",()=>{
  useAuth.mockReturnValue({currentUser:{id:1},authLoading:false,accessInfo:null});
  show(); expect(screen.getByRole("heading",{name:"Feed content"})).toBeInTheDocument();
});
test("guest still needs login",()=>{
  useAuth.mockReturnValue({currentUser:null,authLoading:false});
  show(); expect(screen.getByRole("heading",{name:"Login"})).toBeInTheDocument();
});
test("session verification completes before content is displayed",()=>{
  useAuth.mockReturnValue({currentUser:null,authLoading:true});
  show(); expect(screen.getByText("Checking session")).toBeInTheDocument();
  expect(screen.queryByRole("heading",{name:"Feed content"})).not.toBeInTheDocument();
});
