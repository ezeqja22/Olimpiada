import React, { useState, useRef } from 'react';

const ImageUpload = ({ onImagesChange, maxImages = 5, disabled = false }) => {
    const [images, setImages] = useState([]);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        const newImages = [...images];
        
        // Filter valid image files
        const validFiles = files.filter(file => {
            const isValidType = file.type.startsWith('image/');
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
            return isValidType && isValidSize;
        });

        // Add new images if under limit
        const remainingSlots = maxImages - images.length;
        const filesToAdd = validFiles.slice(0, remainingSlots);
        
        filesToAdd.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newImage = {
                    id: Date.now() + Math.random(),
                    file: file,
                    preview: e.target.result,
                    name: file.name
                };
                newImages.push(newImage);
                setImages(newImages);
                onImagesChange(newImages);
            };
            reader.readAsDataURL(file);
        });

        // Reset file input
        event.target.value = '';
    };

    const removeImage = (imageId) => {
        const newImages = images.filter(img => img.id !== imageId);
        setImages(newImages);
        onImagesChange(newImages);
    };

    const openFileDialog = () => {
        if (!disabled && images.length < maxImages) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div style={{ marginBottom: '12px' }}>
            {/* Image Preview Grid */}
            {images.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '8px',
                    marginBottom: '12px'
                }}>
                    {images.map((image) => (
                        <div key={image.id} style={{
                            position: 'relative',
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '2px solid #e5e7eb',
                            backgroundColor: '#f9fafb'
                        }}>
                            <img
                                src={image.preview}
                                alt={image.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                            <button
                                onClick={() => removeImage(image.id)}
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Image Button */}
            {images.length < maxImages && (
                <div
                    onClick={openFileDialog}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: isHovered ? '#f3f4f6' : '#f9fafb',
                        border: '2px dashed #d1d5db',
                        borderRadius: '8px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: disabled ? 0.5 : 1,
                        width: 'fit-content'
                    }}
                >
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: isHovered ? '#3b82f6' : '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                    }}>
                        +
                    </div>
                    <span style={{
                        fontSize: '14px',
                        color: isHovered ? '#3b82f6' : '#6b7280',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                    }}>
                        {isHovered ? 'Add Images' : `Add Image (${images.length}/${maxImages})`}
                    </span>
                </div>
            )}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={disabled}
            />

            {/* Helper Text */}
            <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
            }}>
                {images.length > 0 && `${images.length}/${maxImages} images selected`}
                {images.length === 0 && `Upload up to ${maxImages} images (max 5MB each)`}
            </div>
        </div>
    );
};

export default ImageUpload;
