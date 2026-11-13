import React from 'react';
import { useLocation } from 'react-router-dom';
import '../platform.css';
const core = /^\/(feed|search|subject|problem|create-problem|forums|forum|forum-catalog|weekly|courses|learning-resources|tutoring|explore)(\/|$)/;
export default function PlatformSurface({children}) {
  const {pathname} = useLocation();
  const kind = pathname === '/homepage' || pathname === '/' ? '' : pathname.startsWith('/admin') ? 'platform-admin' : core.test(pathname) ? 'platform-core' : 'platform-account';
  return <div className={kind ? `platform-surface ${kind}` : undefined}>{children}</div>;
}
