
// Create the image-analysis.service.js file
// services/image-analysis.service.js

const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { logger } = require('../utils/logger');

// Create a client
const client = new ImageAnnotatorClient();

// Extract text from bill
exports.extractTextFromBill = async (filePath) => {
  try {
    // Read the file
    const [result] = await client.textDetection(filePath);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return {
        success: false,
        error: 'No text detected in the image'
      };
    }
    
    // The first annotation contains the entire detected text
    const fullText = detections[0].description;
    
    // Process the text to extract relevant information
    // This is a simple example and would need to be customized based on bill format
    
    // Extract potential amount values (numbers with decimal points)
    const amountRegex = /\$?\s*\d+\.\d{2}/g;
    const potentialAmounts = fullText.match(amountRegex) || [];
    
    // Extract potential dates
    const dateRegex = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g;
    const potentialDates = fullText.match(dateRegex) || [];
    
    // Extract potential vendor/store names (capitalized words)
    const nameRegex = /([A-Z][A-Za-z]+\s)+/g;
    const potentialNames = fullText.match(nameRegex) || [];
    
    // Extract potential item descriptions (lines with numbers and words)
    const lines = fullText.split('\n');
    const potentialItems = lines.filter(line => 
      line.match(/\d+/) && line.match(/[A-Za-z]+/) && !line.match(/total|subtotal|tax/i)
    );
    
    // Make a best guess at the total amount (usually the largest number or followed by "total")
    let totalAmount = 0;
    if (potentialAmounts.length > 0) {
      const amounts = potentialAmounts.map(a => parseFloat(a.replace(/\$|\s/g, '')));
      totalAmount = Math.max(...amounts);
    }
    
    // Make a best guess at the date (the first date found)
    let date = potentialDates.length > 0 ? potentialDates[0] : '';
    
    // Make a best guess at the vendor name (the first capitalized name found)
    let vendor = potentialNames.length > 0 ? potentialNames[0].trim() : '';
    
    return {
      success: true,
      data: {
        fullText,
        extractedData: {
          totalAmount,
          date,
          vendor,
          items: potentialItems,
        },
        potentialData: {
          amounts: potentialAmounts,
          dates: potentialDates,
          names: potentialNames
        }
      }
    };
  } catch (error) {
    logger.error('Error extracting text from bill:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Analyze product image
exports.analyzeProductImage = async (filePath) => {
  try {
    // Use multiple features for comprehensive analysis
    const [labelResult] = await client.labelDetection(filePath);
    const [imagePropertiesResult] = await client.imageProperties(filePath);
    
    const labels = labelResult.labelAnnotations || [];
    const dominantColors = imagePropertiesResult.imagePropertiesAnnotation?.dominantColors?.colors || [];
    
    // Extract useful information
    const categories = labels
      .filter(label => label.score > 0.7) // Only high confidence labels
      .map(label => ({
        name: label.description,
        confidence: label.score
      }));
    
    // Extract color information
    const colors = dominantColors.map(color => {
      const rgb = color.color;
      return {
        red: rgb.red,
        green: rgb.green,
        blue: rgb.blue,
        score: color.score,
        pixelFraction: color.pixelFraction,
        // Convert RGB to Hex
        hex: '#' + 
          ((1 << 24) + (rgb.red << 16) + (rgb.green << 8) + rgb.blue)
            .toString(16)
            .slice(1)
      };
    });
    
    // Determine primary color (highest score)
    const primaryColor = colors.length > 0 ? colors[0] : null;
    
    // Determine if the image is suitable for a fashion product
    const fashionRelated = labels.some(label => 
      ['clothing', 'dress', 'shirt', 'pants', 'fashion', 'apparel', 'textile']
        .includes(label.description.toLowerCase())
    );
    
    return {
      success: true,
      data: {
        categories,
        colors,
        primaryColor,
        fashionRelated,
        quality: {
          highQuality: labelResult.labelAnnotations.some(label => 
            label.description.toLowerCase().includes('high quality')
          ),
          recommendedCategories: categories
            .filter(category => category.confidence > 0.8)
            .map(category => category.name)
        }
      }
    };
  } catch (error) {
    logger.error('Error analyzing product image:', error);
    return {
      success: false,
      error: error.message
    };
  }
};