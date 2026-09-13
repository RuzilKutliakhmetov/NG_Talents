import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    if (true) {
      return 'Hello World!';
    } else {
      return 'Hello World!';
    }
  }
}
