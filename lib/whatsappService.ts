import axios from 'axios';

export class WhatsappService {
  private static readonly API_URL = 'https://api.makemypass.com/whatsapp/send';
  private static readonly API_KEY = process.env.MAKEMYPASS_API_KEY;

  /**
   * Sends a WhatsApp message with an image URL to a phone number.
   * @param phoneNumber The recipient's phone number. Should be numeric string.
   * @param imageUrl The URL of the image to send.
   */
  static async sendImage(phoneNumber: string, imageUrl: string): Promise<{ success: boolean; message: string; data?: any; error?: any }> {
    try {
      if (!this.API_KEY) {
        console.error('❌ MAKEMYPASS_API_KEY is not configured');
        return { success: false, message: 'MakeMuPass API key not configured' };
      }

      // Format phone number: remove all non-numeric characters (including '+')
      let formattedPhone = phoneNumber.replace(/\D/g, '');

      // Check if the number already starts with a country code (assuming 11-15 digits total)
      // If it's exactly 10 digits, assume it's an Indian number and prepend 91
      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
      }
      // If it's more than 10 digits, we assume the first digits are the country code 
      // already provided by the user/frontend, so we leave it as is.

      console.log(`📤 Sending WhatsApp image to ${formattedPhone}...`);
      console.log(`🔗 Image URL: ${imageUrl}`);

      const response = await axios.post(
        this.API_URL,
        {
          phone_number: formattedPhone,
          image_url: imageUrl,
        },
        {
          headers: {
            'x-api-key': this.API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ WhatsApp message sent successfully:', response.data);

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to send WhatsApp message',
        error: error.response?.data || error.message,
      };
    }
  }
}
