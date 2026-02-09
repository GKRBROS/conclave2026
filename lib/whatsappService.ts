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

      // Format phone number: remove '+' and any non-numeric characters
      const formattedPhone = phoneNumber.replace(/\+/g, '').replace(/\D/g, '');

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
