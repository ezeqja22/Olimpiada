import React, { Component, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import AnimatedLoader from './AnimatedLoader';

class PageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="p1-wrap" role="alert">
      <h1>{this.props.sq ? 'Faqja nuk u hap' : 'This page could not open'}</h1>
      <p>{this.props.sq ? 'Provo ta ngarkosh përsëri. Puna e paruajtur mund të humbasë.' : 'Try reloading the page. Unsaved work may be lost.'}</p>
      <button className="p1-btn" onClick={() => window.location.reload()}>{this.props.sq ? 'Ringarko' : 'Reload page'}</button>
    </main>;
    return this.props.children;
  }
}

export default function RouteLoadBoundary({ children }) {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  return <PageBoundary key={pathname} sq={lang === 'sq'}>
    <Suspense fallback={<AnimatedLoader message={lang === 'sq' ? 'Duke ngarkuar…' : 'Loading page…'} />}>
      {children}
    </Suspense>
  </PageBoundary>;
}
