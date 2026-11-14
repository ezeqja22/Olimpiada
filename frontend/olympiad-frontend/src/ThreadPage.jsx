import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import MathRenderer from './MathRenderer';
import { useLanguage } from './context/LanguageContext';
import './ThreadWorkspace.css';
import { getUserInitial, getDisplayName } from './utils';
import Header from './components/Header';

function ThreadPage() {
    const { forumId, messageId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const scrollAfterSend = useRef(false);
    const { lang } = useLanguage();
    const sq = lang === 'sq';
    
    const [forum, setForum] = useState(null);
    const [originalMessage, setOriginalMessage] = useState(null);
    const [replies, setReplies] = useState([]);
    const [newReply, setNewReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [replyCounts, setReplyCounts] = useState({});
    const [members,setMembers]=useState([]);
    const [sendError,setSendError]=useState('');
    const [sending,setSending]=useState(false);
    const [userRole, setUserRole] = useState('member');
    
    // Get scroll position from location state
    const scrollPosition = location.state?.scrollPosition || 0;

    const loadThread = async () => {
        setLoading(true);setError(null);
        await Promise.all([fetchCurrentUser(),fetchForumData(),fetchOriginalMessage(),fetchReplies()]);
        setLoading(false);
    };
    useEffect(() => {loadThread();}, [forumId, messageId]);

    useEffect(()=>{setUserRole(members.find(m=>m.user_id===currentUser?.id)?.role||'member')},[members,currentUser]);
    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    };

    const fetchForumData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setForum(response.data);
            
            // Get user role in forum
            const membersResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(membersResponse.data);
        } catch (error) {
            console.error("Error fetching forum:", error);
            setError("Failed to load forum");
        }
    };

    const fetchOriginalMessage = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const message = response.data.find(msg => msg.id === parseInt(messageId));
            setOriginalMessage(message);
            if (!message) setError("This message is no longer available.");
        } catch (error) {
            setError("The original message could not load. Please retry.");
        }
    };

    const fetchReplies = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/${messageId}/replies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReplies(response.data);
        } catch (error) {
            setError("Replies could not load. Please retry.");
        }
    };

    const sendReply = async () => {
        if (!newReply.trim()||sending) return;
        setSending(true);setSendError('');

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/messages/${messageId}/replies`, 
                { content: newReply, parent_message_id: parseInt(messageId) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            scrollAfterSend.current = true;
            setNewReply('');
            fetchReplies(); // Refresh replies
        } catch (error) {
            setSendError("Your reply was not sent. Your text is still here; please try again.");
        } finally {setSending(false)}
    };

    const handleBackToForum = () => {
        navigate(`/forum/${forumId}`, { 
            state: { scrollPosition: scrollPosition }
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            sendReply();
        }
    };

    // Permission helpers
    const hasPermission = (permission) => {
        if (userRole === 'creator') return true;
        if (userRole === 'moderator') return ['moderate', 'pin', 'kick'].includes(permission);
        if (userRole === 'helper') return ['pin'].includes(permission);
        return false;
    };

    const canDeleteReply = (reply) => {
        return (
            reply.author_id === currentUser?.id ||  // Author can delete their own reply
            hasPermission('moderate')  // Moderator/creator can delete any reply
        );
    };

    // Delete a reply
    const deleteReply = async (replyId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/${forumId}/replies/${replyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            fetchReplies(); // Refresh replies
        } catch (error) {
            setSendError("The reply could not be deleted. Please try again.");
        }
    };

    useEffect(() => {
        if (scrollAfterSend.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            scrollAfterSend.current = false;
        }
    }, [replies]);

    const author = (message) => <div className="thread-author">
        <span className="thread-avatar" aria-hidden="true">{message.author?.profile_picture
            ? <img src={message.author.profile_picture} alt="" />
            : getUserInitial(message.author?.username || '?')}</span>
        <div><strong>{getDisplayName(message.author?.username || 'Unknown')}</strong>
        <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString(sq ? 'sq-AL' : 'en-GB')}</time></div>
    </div>;

    return <><Header /><main className="thread-workspace">
        <header className="thread-heading"><div><span>{forum?.title || (sq ? 'Forumi' : 'Forum')}</span>
            <h1>{sq ? 'Diskutimi' : 'Discussion'}</h1></div>
            <button type="button" onClick={handleBackToForum}>← {sq ? 'Kthehu në forum' : 'Back to forum'}</button>
        </header>
        {loading ? <p role="status">{sq ? 'Duke ngarkuar…' : 'Loading discussion…'}</p> : error
            ? <div role="alert"><p>{error}</p><button onClick={loadThread}>{sq ? 'Provo përsëri' : 'Retry'}</button></div>
            : <div className="thread-layout">
                <aside className="thread-context"><span>{sq ? 'Mesazhi fillestar' : 'Original message'}</span>
                    {originalMessage && <article>{author(originalMessage)}<div className="thread-body"><MathRenderer text={originalMessage.content || ''} /></div></article>}
                </aside>
                <section className="thread-conversation" aria-labelledby="thread-replies-title">
                    <h2 id="thread-replies-title">{sq ? 'Përgjigjet' : 'Replies'} <span>{replies.length}</span></h2>
                    {!replies.length && <p className="thread-empty">{sq ? 'Ende nuk ka përgjigje. Shto mendimin ose pyetjen tënde.' : 'No replies yet. Add your reasoning or ask a question.'}</p>}
                    <div className="thread-replies">{replies.map(reply => <article key={reply.id} className="thread-reply">
                        <header>{author(reply)}{canDeleteReply(reply) && <button type="button" className="thread-delete" onClick={() => deleteReply(reply.id)} aria-label={sq ? 'Fshi përgjigjen' : 'Delete reply'}>{sq ? 'Fshi' : 'Delete'}</button>}</header>
                        <div className="thread-body"><MathRenderer text={reply.content || ''} /></div>
                    </article>)}<div ref={messagesEndRef} /></div>
                    <form className="thread-composer" onSubmit={e => { e.preventDefault(); sendReply(); }}>
                        <label htmlFor="thread-reply">{sq ? 'Përgjigjja jote' : 'Your reply'}</label>
                        <textarea id="thread-reply" value={newReply} onChange={e => setNewReply(e.target.value)} onKeyDown={handleKeyPress} placeholder={sq ? 'Shkruaj një përgjigje…' : 'Write a reply...'} rows={4} />
                        {sendError && <p role="alert">{sendError}</p>}
                        <div><small>{sq ? 'Shift + Enter për rresht të ri. Mbështet LaTeX.' : 'Shift + Enter for a new line. LaTeX supported.'}</small><button type="submit" disabled={!newReply.trim() || sending}>{sending ? (sq ? 'Duke dërguar…' : 'Sending…') : (sq ? 'Përgjigju' : 'Reply')}</button></div>
                    </form>
                </section>
            </div>}
    </main></>;
}

export default ThreadPage;
