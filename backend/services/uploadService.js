const cloudinary = require('../config/cloudinary');

/**
 * Upload a base64 string to Cloudinary
 * @param {string} base64String - The base64 string (with or without data URI prefix)
 * @param {string} folder - The folder to upload to (default: 'laundry-buddy/profiles')
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
exports.uploadBase64 = async (base64String, folder = 'laundry-buddy/profiles') => {
    try {
        if (!base64String) throw new Error('No image data provided');

        // Cloudinary uploader can handle data URIs directly
        const result = await cloudinary.uploader.upload(base64String, {
            folder: folder,
            resource_type: 'image',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [
                { width: 500, height: 500, crop: 'limit' }, // Optimize size
                { quality: 'auto' } // Optimize quality
            ]
        });

        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Image upload failed');
    }
};
