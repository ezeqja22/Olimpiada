/* eslint-disable no-unused-vars */
import React, { useEffect, lazy } from "react";
import { AuthProvider } from "./context/AuthContext";
import {LanguageProvider} from "./context/LanguageContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./theme.css";
// Removed WebSocket import
import Header from "./components/Header";
import {useAuth} from "./context/AuthContext";
import {Link,useLocation} from "react-router-dom";
import Homepage from "./Homepage";
import ProtectedRoute from "./ProtectedRoute";
import AnalyticsConsent from "./AnalyticsConsent";
import ToastProvider from "./components/ToastProvider";
import ConfirmProvider from "./components/ConfirmProvider";
import "./ux-foundations.css";
import PlatformSurface from "./components/PlatformSurface";

import RouteLoadBoundary from "./components/RouteLoadBoundary";
const PublicForums = lazy(() => import("./PublicForums"));
const Signup = lazy(() => import("./Signup"));
const Login = lazy(() => import("./Login"));
const Feed = lazy(() => import("./Feed"));
const CreateProblem = lazy(() => import("./CreateProblem"));
const Explore = lazy(() => import("./AccessPages").then(m => ({default:m.Explore})));
const Learning = lazy(() => import("./AccessPages").then(m => ({default:m.Learning})));
const Tutoring = lazy(() => import("./AccessPages").then(m => ({default:m.Tutoring})));
const AdminTutoring = lazy(() => import("./AdminPhase1").then(m => ({default:m.AdminTutoring})));
const AdminContent = lazy(() => import("./AdminContent"));
const WeeklyPage = lazy(() => import("./WeeklyPage"));
const AdminWeekly = lazy(() => import("./WeeklyPage").then(m => ({default:m.AdminWeekly})));
const CourseHub = lazy(() => import("./CourseHub"));
const AdminCourses = lazy(() => import("./CourseHub").then(m => ({default:m.AdminCourses})));
const TeacherApplicationPage = lazy(() => import("./ExperiencePages").then(m => ({default:m.TeacherApplicationPage})));
const TeacherWorkspace = lazy(() => import("./ExperiencePages").then(m => ({default:m.TeacherWorkspace})));
const AdminTeachers = lazy(() => import("./AdminExperience").then(m => ({default:m.AdminTeachers})));
const AdminParents = lazy(() => import("./AdminExperience").then(m => ({default:m.AdminParents})));
const AdminSiteEditor = lazy(() => import("./AdminSiteEditor"));
const FamilyPage = lazy(() => import("./FamilyPage"));
const ProblemDetail = lazy(() => import("./ProblemDetail"));
const UserProfile = lazy(() => import("./UserProfile"));
const PublicUserProfile = lazy(() => import("./PublicUserProfile"));
const EmailVerification = lazy(() => import("./EmailVerification"));
const SearchResults = lazy(() => import("./SearchResults"));
const Forums = lazy(() => import("./Forums"));
const ForumDetail = lazy(() => import("./ForumDetail"));
const ThreadPage = lazy(() => import("./ThreadPage"));
const SubjectPage = lazy(() => import("./SubjectPage"));
const Settings = lazy(() => import("./Settings"));
const ResetPassword = lazy(() => import("./ResetPassword"));
const FollowersFollowing = lazy(() => import("./components/FollowersFollowing"));
const AdminLayout = lazy(() => import("./AdminLayout"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminUsers = lazy(() => import("./AdminUsers"));
const AdminForums = lazy(() => import("./AdminForums"));
const AdminReports = lazy(() => import("./AdminReports"));
const AdminUserHistory = lazy(() => import("./AdminUserHistory"));
const AdminSettings = lazy(() => import("./AdminSettings"));
const AdminEmail = lazy(() => import("./AdminEmail"));
const AdminAnalytics = lazy(() => import("./AdminAnalytics"));
const ForgotPassword = lazy(() => import("./ForgotPassword"));
const FAQPage = lazy(() => import("./HelpPages").then(m => ({default:m.FAQPage})));
const SupportPage = lazy(() => import("./HelpPages").then(m => ({default:m.SupportPage})));
const AdminFAQ = lazy(() => import("./AdminHelp").then(m => ({default:m.AdminFAQ})));
const AdminSupport = lazy(() => import("./AdminHelp").then(m => ({default:m.AdminSupport})));

function ForumsEntry(){const {currentUser,authLoading}=useAuth();return authLoading?<p role="status">Loading…</p>:currentUser?<Forums/>:<PublicForums/>;}
function ConnectedPage({children}){return <><Header/>{children}</>;}
function RouteOrientation(){
 const {pathname}=useLocation();
 useEffect(()=>{
  let focused=false,frame;
  const orient=()=>{
   const main=document.querySelector('main');
   if(main){main.id='main-content';main.tabIndex=-1;if(!focused){main.focus({preventScroll:true});focused=true}}
   const title=document.querySelector('h1')?.textContent;
   document.title=title?title+' · Olimpiada':'Olimpiada';
  };
  const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(orient)});
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});orient();
  return()=>{observer.disconnect();cancelAnimationFrame(frame)};
 },[pathname]);
 return null;
}
function App() {
  // Removed WebSocket functionality

  return (
    <Router>
      <LanguageProvider>
      <AuthProvider>
        <AnalyticsConsent /><RouteOrientation/>
        <ToastProvider>
          <ConfirmProvider>
            <PlatformSurface><RouteLoadBoundary><Routes>
              <Route path="/" element={<Navigate to="/homepage" replace />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/homepage" element={<Homepage />} />
              <Route path="/pricing" element={<Navigate to="/explore" replace />} />
              <Route path="/explore" element={<ConnectedPage><Explore /></ConnectedPage>} />
              <Route path="/library" element={<Navigate to="/explore" replace />} />
              <Route path="/library/:id" element={<Navigate to="/explore" replace />} />
              <Route path="/courses" element={<ProtectedRoute><ConnectedPage><CourseHub /></ConnectedPage></ProtectedRoute>} />
              <Route path="/weekly" element={<ConnectedPage><WeeklyPage /></ConnectedPage>} />
              <Route path="/forum-catalog" element={<Navigate to="/forums" replace />} />
              <Route path="/teacher/apply" element={<ConnectedPage><TeacherApplicationPage /></ConnectedPage>} />
              <Route path="/teacher/workspace" element={<ProtectedRoute><ConnectedPage><TeacherWorkspace /></ConnectedPage></ProtectedRoute>} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/family" element={<ProtectedRoute><ConnectedPage><FamilyPage /></ConnectedPage></ProtectedRoute>} />
              <Route path="/teacher/courses" element={<ProtectedRoute><ConnectedPage><AdminCourses /></ConnectedPage></ProtectedRoute>} />
              <Route path="/tutoring" element={<ProtectedRoute><ConnectedPage><Tutoring /></ConnectedPage></ProtectedRoute>} />
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <Feed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-problem"
                element={
                  <ProtectedRoute>
                    <CreateProblem />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/problem/:id"
                element={
                  <ProtectedRoute>
                    <ProblemDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:username"
                element={
                  <ProtectedRoute>
                    <PublicUserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/:username"
                element={
                  <ProtectedRoute>
                    <PublicUserProfile />
                  </ProtectedRoute>
                }
              />
              <Route path="/verify-email" element={<ConnectedPage><EmailVerification /></ConnectedPage>} />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forums"
                element={
                  <ForumsEntry />
                }
              />
              <Route
                path="/forum/:forumId"
                element={
                  <ProtectedRoute>
                    <ForumDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forum/:forumId/info"
                element={
                  <ProtectedRoute>
                    <ForumDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forum/:forumId/thread/:messageId"
                element={
                  <ProtectedRoute>
                    <ThreadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subject/:subject"
                element={
                  <ProtectedRoute>
                    <SubjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/followers/:userId"
                element={
                  <ProtectedRoute>
                    <FollowersFollowing type="followers" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/following/:userId"
                element={
                  <ProtectedRoute>
                    <FollowersFollowing type="following" />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="forums" element={<AdminForums />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="user-history" element={<AdminUserHistory />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="email" element={<AdminEmail />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="tutoring" element={<AdminTutoring />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="weekly" element={<AdminWeekly />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="library" element={<Navigate to="/admin/content" replace />} />
                <Route path="teachers" element={<AdminTeachers />} />
                <Route path="site-content" element={<AdminSiteEditor />} />
                <Route path="branding" element={<Navigate to="/admin/site-content" replace />} />
                <Route path="faq" element={<AdminFAQ />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="parents" element={<AdminParents />} />
              </Route>
            <Route path="/learning-resources" element={<ProtectedRoute><ConnectedPage><Learning/></ConnectedPage></ProtectedRoute>}/><Route path="*" element={<ConnectedPage><main id="main-content" className="p1-wrap"><h1>Page not found</h1><p>This address does not match a page.</p><Link to="/homepage">Home</Link> · <Link to="/forums">Forums</Link> · <Link to="/feed">Problems</Link></main></ConnectedPage>}/>
            </Routes></RouteLoadBoundary></PlatformSurface>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
