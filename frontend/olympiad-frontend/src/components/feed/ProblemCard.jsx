import React from "react";
import { Link } from "react-router-dom";
import { InlineMath, BlockMath } from "react-katex";
import { Bookmark, ThumbsUp, ThumbsDown, MessageSquare, ArrowUpRight } from "lucide-react";
import "katex/dist/katex.min.css";
import FollowButton from "../FollowButton";
import { getDisplayName } from "../../utils";
import { useLanguage } from "../../context/LanguageContext";
import "./ProblemEntry.css";
const renderMathContent = (text) => {
  if (!text) return "";

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const content = part.slice(2, -2);

      return (
        <div
          key={index}
          style={{
            textAlign: "left",
            margin: "10px 0",
            overflowX: "auto",
          }}
        >
          <BlockMath math={content} />
        </div>
      );
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      const content = part.slice(1, -1);
      return <InlineMath key={index} math={content} />;
    }

    return <span key={index}>{part}</span>;
  });
};


export default function ProblemCard({problem,activeTab,currentUser,voteData,bookmarkData,followStatus,onVote,onBookmark,onFollow,onUnfollow,problemHref,showFollow=true}) {
 const {lang}=useLanguage(), sq=lang==='sq';
 const href=problemHref||`/problem/${problem.id}?from=feed&tab=${activeTab}`;
 const vote=voteData[problem.id]||{}, saved=!!bookmarkData[problem.id]?.isBookmarked;
 return <article className="problem-entry">
  <div className="problem-entry__index"><span>{problem.subject|| (sq?'Problem':'Problem')}</span><span>{problem.level}</span>{problem.year&&<span>{problem.year}</span>}</div>
  <div className="problem-entry__body">
   <header><h2><Link to={href}>{renderMathContent(problem.title)}</Link></h2><button className="problem-entry__save" aria-label={saved?(sq?'Hiq nga të ruajturat':'Remove bookmark'):(sq?'Ruaj problemin':'Bookmark problem')} aria-pressed={saved} onClick={()=>onBookmark(problem.id)}><Bookmark size={19} fill={saved?'currentColor':'none'}/></button></header>
   <div className="problem-entry__statement">{renderMathContent(problem.description)}</div>
   {problem.tags && <div className="problem-entry__tags">{problem.tags.split(',').map(tag=>tag.trim()).filter(Boolean).map((tag,index)=><span key={`${tag}-${index}`}>{tag}</span>)}</div>}
   <footer>
    <div className="problem-entry__reactions">
     <button aria-label={sq?'Pëlqej':'Like'} aria-pressed={vote.user_vote==='like'} onClick={()=>onVote(problem.id,'like')}><ThumbsUp size={15}/><span>{vote.like_count||0}</span></button>
     <button aria-label={sq?'Nuk më pëlqen':'Dislike'} aria-pressed={vote.user_vote==='dislike'} onClick={()=>onVote(problem.id,'dislike')}><ThumbsDown size={15}/><span>{vote.dislike_count||0}</span></button>
     <Link to={href+'#discussion'}><MessageSquare size={15}/>{problem.comment_count||0}<span>{sq?'diskutime':'comments'}</span></Link>
    </div>
    <Link className="problem-entry__open" to={href}>{sq?'Hap problemin':'Open problem'}<ArrowUpRight size={16}/></Link>
   </footer>
   <div className="problem-entry__credit">
    {problem.author?<Link to={currentUser?.id===problem.author.id?'/profile':`/user/${encodeURIComponent(problem.author.username)}`}>{getDisplayName(problem.author.username)}</Link>:<span>{sq?'Autor i panjohur':'Unknown author'}</span>}
    <time dateTime={problem.created_at}>{new Date(problem.created_at).toLocaleDateString(sq?'sq-AL':'en-GB',{day:'numeric',month:'short',year:'numeric'})}</time>
    {showFollow&&currentUser&&problem.author&&problem.author.id!==currentUser.id&&<FollowButton isFollowing={followStatus[problem.author.id]} onFollow={()=>onFollow(problem.author.id)} onUnfollow={()=>onUnfollow(problem.author.id)} size="sm" isDeletedUser={problem.author.username.startsWith('__deleted_user_')}/>}
   </div>
  </div>
 </article>;
}
