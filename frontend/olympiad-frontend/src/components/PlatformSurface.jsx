import React from 'react';
import { useLocation } from 'react-router-dom';
import '../platform.css';
const core = /^\/(feed|search|subject|problem|create-problem|forums|forum|forum-catalog|weekly|courses|learning-resources|tutoring|explore)(\/|$)/;
export default function PlatformSurface({children}) {
  const {pathname} = useLocation();
  return <div className={core.test(pathname) ? 'platform-surface platform-core' : undefined}>{children}</div>;
}
