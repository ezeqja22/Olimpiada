import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommentComposer from './CommentComposer';
vi.mock('../ImageUpload', () => ({ default: () => null }));
test('attachment removal is keyboard-addressable and removes only the selected image', () => {
 const images=[{preview:'one.png'},{preview:'two.png'}];
 const setImages=vi.fn();
 render(<MemoryRouter><CommentComposer newComment="" setNewComment={vi.fn()} commentImages={images} setCommentImages={setImages} commentImageUrls={['one.png','two.png']} openImageModal={vi.fn()} onSubmit={vi.fn()} /></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Remove attachment 1'}));
 expect(setImages.mock.calls[0][0](images)).toEqual([images[1]]);
 expect(screen.getByRole('button',{name:'Send'})).not.toBeDisabled();
});
test('empty comment is disabled, text is associated with its label and submission stays in the form', () => {
 const submit=vi.fn(event=>event.preventDefault());
 const props={newComment:'',setNewComment:vi.fn(),commentImages:[],setCommentImages:vi.fn(),onSubmit:submit};
 const {rerender}=render(<MemoryRouter><CommentComposer {...props}/></MemoryRouter>);
 expect(screen.getByLabelText('Add to the discussion')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Send'})).toBeDisabled();
 rerender(<MemoryRouter><CommentComposer {...props} newComment="A mathematical solution"/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Send'}));expect(submit).toHaveBeenCalledOnce();
});
