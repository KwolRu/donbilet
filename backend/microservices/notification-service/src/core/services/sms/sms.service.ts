import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private logger = new Logger(SmsService.name);

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`[SMS] OTP for ${phone}: ${code}`);
  }
}
