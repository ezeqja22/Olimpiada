import React from 'react';
import {Link} from 'react-router-dom';
import '../PublishingWorkspace.css';
export function PublishingHeader({eyebrow='Administration',title,description,to,linkLabel}){
 return <header className="publishing-heading"><div><p className="publishing-eyebrow">{eyebrow}</p><h1>{title}</h1>{description&&<p className="publishing-description">{description}</p>}</div>{to&&<Link to={to}>{linkLabel} <span aria-hidden="true">↗</span></Link>}</header>;
}
export function PublishingSection({id,title,description,children,className=''}){
 return <section id={id} className={'publishing-section '+className}><header><h2>{title}</h2>{description&&<p>{description}</p>}</header>{children}</section>;
}
