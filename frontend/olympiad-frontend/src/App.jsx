/* eslint-disable no-unused-vars */
import React, { useEffect } from "react";
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
import PublicForums from "./PublicForums";
import {useAuth} from "./context/AuthContext";
import {Link,useLocation} from "react-router-dom";
import LandingPage from "./LandingPage";
import Signup from "./Signup";
import Login from "./Login";
import Homepage from "./Homepage";
import Feed from "./Feed";
import CreateProblem from "./CreateProblem";
import ProtectedRoute from "./ProtectedRoute";
import { Explore, Learning, Tutoring } from "./AccessPages";
import { AdminTutoring } from "./AdminPhase1";
import AdminContent from "./AdminContent";
import AnalyticsConsent from "./AnalyticsConsent";
import WeeklyPage, {AdminWeekly} from "./WeeklyPage";
import CourseHub, {AdminCourses} from "./CourseHub";
import ForumCatalogue from "./ForumCatalogue";
import { TeacherApplicationPage, TeacherWorkspace } from "./ExperiencePages";
import { AdminTeachers, AdminParents } from "./AdminExperience";
import AdminSiteEditor from "./AdminSiteEditor";
import FamilyPage from "./FamilyPage";
import ProblemDetail from "./ProblemDetail";
import UserProfile from "./UserProfile";
import PublicUserProfile from "./PublicUserProfile";
import EmailVerification from "./EmailVerification";
import SearchResults from "./SearchResults";
import Forums from "./Forums";
import ForumDetail from "./ForumDetail";
import ThreadPage from "./ThreadPage";
import SubjectPage from "./SubjectPage";
import Settings from "./Settings";
import ResetPassword from "./ResetPassword";
import FollowersFollowing from "./components/FollowersFollowing";
import AdminLayout from "./AdminLayout";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminForums from "./AdminForums";
import AdminReports from "./AdminReports";
import AdminUserHistory from "./AdminUserHistory";
import AdminSettings from "./AdminSettings";
import AdminEmail from "./AdminEmail";
import AdminAnalytics from "./AdminAnalytics";
import ForgotPassword from "./ForgotPassword";
import ToastProvider from "./components/ToastProvider";
import ConfirmProvider from "./components/ConfirmProvider";
import { FAQPage, SupportPage } from "./HelpPages";
import { AdminFAQ, AdminSupport } from "./AdminHelp";
import "./ux-foundations.css";

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
            <Routes>
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
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
