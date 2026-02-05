import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Initialize AWS SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export class OtpService {
  static async sendOtp(phoneNumber: string, otpCode: string) {
    try {
      const message = `Your Conclave 2026 verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code.`;

      const command = new PublishCommand({
        Message: message,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });

      const response = await snsClient.send(command);

      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: response.MessageId,
      };
    } catch (error: any) {
      console.error('Error sending OTP:', error.message);

      return {
        success: false,
        message: 'Failed to send OTP',
        error: error.message,
      };
    }
  }
}

// Generate random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
