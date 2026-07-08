import { signupSchema } from './auth.validation.js';

describe('signupSchema', () => {
  it('accepts signup payloads without an explicit role', () => {
    const result = signupSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'Password123',
      phoneNumber: '1234567890',
      businessName: 'Example Co',
      businessType: 'Retail',
      country: 'Nigeria',
      timeZone: 'WAT',
      state: 'Lagos',
      city: 'Ikeja',
      businessAddress: '1 Main Street',
      pin: '1234',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.role).toBe('user');
    }
  });
});
