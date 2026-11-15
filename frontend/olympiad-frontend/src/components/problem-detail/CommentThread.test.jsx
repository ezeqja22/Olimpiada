import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentThread from './CommentThread';
const comment={id:5,author_id:2,author:{username:'Student'},text:'Proof $x^2$',created_at:'2026-01-01T12:00:00Z',replies:[{id:6,author_id:3,author:{username:'Reader'},text:'A question',created_at:'2026-01-01T13:00:00Z',replies:[]}]};
const props={comment,problem:{author_id:9},replyImages:[],replyText:'',setReplyingTo:vi.fn(),onOpenAuthor:vi.fn(),onReportComment:vi.fn()};
test('regular readers can reply and report but cannot edit or mark other users solutions',()=>{
 render(<CommentThread {...props} currentUser={{id:7,role:'student'}}/>);
 expect(screen.queryByRole('button',{name:'Edit',exact:true})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Mark Solution'})).not.toBeInTheDocument();
 expect(document.querySelector('.discussion-entry-body .katex')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Hide 1 reply'}));expect(screen.queryByText('A question')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Show 1 reply'}));expect(screen.getByText('A question')).toBeInTheDocument();
});
test('problem authors retain solution controls without gaining edit rights on others comments',()=>{
 const mark=vi.fn();render(<CommentThread {...props} currentUser={{id:9,role:'student'}} onMarkAsSolution={mark}/>);expect(screen.queryByRole('button',{name:'Edit',exact:true})).not.toBeInTheDocument();fireEvent.click(screen.getAllByRole('button',{name:'Mark Solution'})[0]);expect(mark).toHaveBeenCalledWith(5);
});
