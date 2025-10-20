import React, { useState, useRef } from 'react';

const ImageUpload = ({ onImagesChange, maxImages = 5, disabled = false, resetTrigger, variant = 'default', showHelper = true }) => {
    const [images, setImages] = useState([]);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);

    // Allow parent to reset the internal state (after successful submit)
    React.useEffect(() => {
        setImages([]);
        onImagesChange([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [resetTrigger]);

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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: '10px',
                    marginBottom: '12px'
                }}>
                    {images.map((image) => (
                        <div key={image.id} style={{
                            position: 'relative',
                            width: '90px',
                            height: '90px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
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
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: variant === 'compact' ? '6px' : '10px',
                        padding: variant === 'compact' ? '4px 6px' : '10px 14px',
                        backgroundColor: variant === 'compact' ? (isHovered ? 'rgba(118, 75, 162, 0.12)' : 'rgba(118, 75, 162, 0.08)') : (isHovered ? '#eff6ff' : '#f8fafc'),
                        border: variant === 'compact' ? '1px solid rgba(118, 75, 162, 0.35)' : '1.5px dashed #cbd5e1',
                        borderRadius: variant === 'compact' ? '9999px' : '10px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.18s ease',
                        opacity: disabled ? 0.5 : 1,
                        boxShadow: isHovered ? '0 6px 20px rgba(0,0,0,0.08)' : '0 2px 10px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        height: variant === 'compact' ? '20px' : 'auto',
                        minHeight: variant === 'compact' ? '20px' : 'auto',
                        transform: variant === 'compact' ? 'translateY(2px)' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{
                        width: variant === 'compact' ? '16px' : '26px',
                        height: variant === 'compact' ? '16px' : '26px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(118, 75, 162)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: variant === 'compact' ? '12px' : '16px',
                        fontWeight: 'bold',
                        transition: 'all 0.18s ease'
                    }}>
                        +
                    </div>
                    <span style={{
                        fontSize: variant === 'compact' ? '13px' : '14px',
                        color: 'rgba(118, 75, 162)',
                        fontWeight: '600',
                        transition: 'width 0.18s ease, opacity 0.18s ease',
                        whiteSpace: 'nowrap',
                        width: variant === 'compact' ? (isHovered ? 'auto' : '0') : 'auto',
                        opacity: variant === 'compact' ? (isHovered ? 1 : 0) : 1,
                        marginLeft: variant === 'compact' ? (isHovered ? '6px' : '0') : '8px'
                    }}>
                        {variant === 'compact' ? 'Add Images' : (isHovered ? 'Add Images' : `Add Image (${images.length}/${maxImages})`)}
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

            {/* Helper Text (optional) */}
            {showHelper && (
                <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '6px'
                }}>
                    {images.length > 0 && `${images.length}/${maxImages} images selected`}
                    {images.length === 0 && `Upload up to ${maxImages} images (max 5MB each)`}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
