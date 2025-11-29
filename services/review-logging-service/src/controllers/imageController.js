const Image = require('../models/Image');

const getImages = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;

    const query = {};
    if (entity_type) query.entity_type = entity_type;
    if (entity_id) query.entity_id = entity_id;

    const images = await Image.find(query)
      .sort({ 'metadata.is_primary': -1, created_at: 1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch images'
    });
  }
};

const getPrimaryImage = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      res.status(400).json({
        success: false,
        error: 'entity_type and entity_id are required'
      });
      return;
    }

    // Try to get primary image first
    let image = await Image.findOne({
      entity_type,
      entity_id,
      'metadata.is_primary': true
    });

    // If no primary image, get the first one
    if (!image) {
      image = await Image.findOne({
        entity_type,
        entity_id
      }).sort({ created_at: 1 });
    }

    if (!image) {
      res.status(404).json({
        success: false,
        error: 'No image found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch image'
    });
  }
};

module.exports = {
  getImages,
  getPrimaryImage
};

