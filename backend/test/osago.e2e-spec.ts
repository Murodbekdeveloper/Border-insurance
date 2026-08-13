import { Test, TestingModule } from '@nestjs/testing';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface AuthResponseBody {
  user: { email: string; passwordHash?: string };
  accessToken: string;
  refreshToken: string;
}

interface UserResponseBody {
  email: string;
  residentType: string;
}

interface VehicleResponseBody {
  id: string;
}

interface PolicyResponseBody {
  id: string;
  status: string;
  drivers: unknown[];
  policyNumber: string;
  validFrom: string;
  validTo: string;
}

interface PriceResponseBody {
  price: number;
}

interface CardResponseBody {
  id: string;
  maskedNumber: string;
  cardType: string;
}

interface PaymentResponseBody {
  status: string;
  amount: number;
}

interface PolicyListItem {
  status: string;
  vehicle: { plateNumber: string };
}

describe('OSAGO API (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const email = `e2e${Date.now()}@example.com`;
  const password = 'password123';
  let accessToken: string;
  let refreshToken: string;
  let vehicleId: string;
  let policyId: string;
  let cardId: string;

  describe('auth', () => {
    it('registers a new user and never returns the password hash', async () => {
      const res = await request(server)
        .post('/auth/register')
        .send({ fullName: 'E2E Test', email, phone: '+998901234567', password })
        .expect(201);
      const body = res.body as AuthResponseBody;

      expect(body.user.email).toBe(email);
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));

      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    });

    it('rejects registering the same email twice', () => {
      return request(server)
        .post('/auth/register')
        .send({ fullName: 'Dup', email, phone: '+998901234567', password })
        .expect(409);
    });

    it('rejects an invalid phone format', () => {
      return request(server)
        .post('/auth/register')
        .send({
          fullName: 'Bad Phone',
          email: `bad${Date.now()}@example.com`,
          phone: '901234567',
          password,
        })
        .expect(400);
    });

    it('rejects an unknown extra field (forbidNonWhitelisted)', () => {
      return request(server)
        .post('/auth/register')
        .send({
          fullName: 'Extra Field',
          email: `extra${Date.now()}@example.com`,
          phone: '+998901234567',
          password,
          isAdmin: true,
        })
        .expect(400);
    });

    it('rejects login with the wrong password', () => {
      return request(server)
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    });

    it('logs in with the correct password', async () => {
      const res = await request(server)
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      const body = res.body as AuthResponseBody;

      expect(body.accessToken).toEqual(expect.any(String));
    });

    it('rejects requests without a bearer token', () => {
      return request(server).get('/users/me').expect(401);
    });

    it('returns the current user for a valid token', async () => {
      const res = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const body = res.body as UserResponseBody;

      expect(body.email).toBe(email);
    });

    it('sets the resident type', async () => {
      const res = await request(server)
        .patch('/users/me/resident-type')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ residentType: 'resident' })
        .expect(200);
      const body = res.body as UserResponseBody;

      expect(body.residentType).toBe('resident');
    });

    it('issues a new access token via refresh', async () => {
      const res = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);
      const body = res.body as AuthResponseBody;

      expect(body.accessToken).toEqual(expect.any(String));
    });
  });

  describe('vehicles', () => {
    it('rejects an invalid vehicle payload (bad VIN length)', () => {
      return request(server)
        .post('/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          weightCategory: 'yengil',
          registrationCountry: 'UZ',
          plateNumber: '01A123AA',
          techPassportSeries: 'AAB',
          techPassportNumber: '1234567',
          model: 'Chevrolet Cobalt',
          vehicleType: 'yengil_avtomobil',
          techPassportIssueDate: '2022-05-10',
          manufactureYear: 2021,
          bodyNumber: 'AB',
          engineNumber: 'ENG1234567',
          city: 'Toshkent shahri',
          phone: '+998901234567',
        })
        .expect(400);
    });

    it('creates a vehicle', async () => {
      const res = await request(server)
        .post('/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          weightCategory: "og'ir",
          registrationCountry: 'UZ',
          plateNumber: '01A123AA',
          techPassportSeries: 'AAB',
          techPassportNumber: '1234567',
          model: 'Chevrolet Cobalt',
          vehicleType: 'yengil_avtomobil',
          techPassportIssueDate: '2022-05-10',
          manufactureYear: 2021,
          bodyNumber: 'ABC1234567',
          engineNumber: 'ENG1234567',
          city: 'Toshkent shahri',
          phone: '+998901234567',
        })
        .expect(201);
      const body = res.body as VehicleResponseBody;

      expect(body.id).toEqual(expect.any(String));
      vehicleId = body.id;
    });
  });

  describe('policies + pricing', () => {
    it('creates a draft policy with a driver', async () => {
      const res = await request(server)
        .post('/policies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          vehicleId,
          driverRestriction: 'cheklangan',
          drivers: [
            {
              fullName: 'Ali Valiyev',
              birthDate: '1990-01-01',
              passportSeries: 'AA',
              passportNumber: '1234567',
              licenseNumber: 'LIC123456',
              licenseIssueDate: '2015-06-01',
              drivingExperienceSince: 2015,
            },
          ],
        })
        .expect(201);
      const body = res.body as PolicyResponseBody;

      expect(body.status).toBe('draft');
      expect(body.drivers).toHaveLength(1);
      policyId = body.id;
    });

    it("computes the correct price (og'ir + cheklangan + resident + UZ)", async () => {
      const res = await request(server)
        .get(`/policies/${policyId}/price`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const body = res.body as PriceResponseBody;

      // 400000 * 1.5 (heavy) * 1 (restricted) * 1 (resident) * 1 (UZ)
      expect(body.price).toBe(600_000);
    });

    it('rejects fetching a policy that belongs to another user', async () => {
      const otherEmail = `other${Date.now()}@example.com`;
      const otherRes = await request(server)
        .post('/auth/register')
        .send({
          fullName: 'Other User',
          email: otherEmail,
          phone: '+998901234567',
          password,
        })
        .expect(201);
      const otherBody = otherRes.body as AuthResponseBody;
      const otherToken = otherBody.accessToken;

      await request(server)
        .get(`/policies/${policyId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('cards + payments', () => {
    it('rejects an unsupported card brand (not Visa/Mastercard)', () => {
      return request(server)
        .post('/cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cardHolderName: 'ALI VALIYEV',
          cardNumber: '6011000000000004',
          expDate: '12/30',
          cvv: '123',
        })
        .expect(400);
    });

    it('adds a card and never stores the full PAN', async () => {
      const res = await request(server)
        .post('/cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cardHolderName: 'ALI VALIYEV',
          cardNumber: '4111111111111111',
          expDate: '12/30',
          cvv: '123',
        })
        .expect(201);
      const body = res.body as CardResponseBody;

      expect(body.maskedNumber).toBe('1111');
      expect(body.cardType).toBe('visa');
      expect(JSON.stringify(body)).not.toContain('4111111111111111');
      cardId = body.id;
    });

    it('lists the saved card', async () => {
      const res = await request(server)
        .get('/cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const body = res.body as CardResponseBody[];

      expect(body).toHaveLength(1);
    });

    it('rejects a Payme verification request for a card not tokenized via Payme (mock gateway mode)', () => {
      return request(server)
        .post(`/cards/${cardId}/payme/verify-request`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('declines a payment for a test card ending in 0000', async () => {
      const declineCard = await request(server)
        .post('/cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          cardHolderName: 'DECLINE TEST',
          cardNumber: '4000000000000000',
          expDate: '12/30',
          cvv: '123',
        })
        .expect(201);
      const declineCardBody = declineCard.body as CardResponseBody;

      await request(server)
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ policyId, cardId: declineCardBody.id })
        .expect(402);
    });

    it('charges the payment successfully', async () => {
      const res = await request(server)
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ policyId, cardId })
        .expect(201);
      const body = res.body as PaymentResponseBody;

      expect(body.status).toBe('success');
      expect(body.amount).toBe(600_000);
    });

    it('ignores a client-supplied amount (forbidNonWhitelisted)', () => {
      return request(server)
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ policyId, cardId, amount: 1 })
        .expect(400);
    });
  });

  describe('confirmation + pdf', () => {
    it('confirms the policy and generates a policy number', async () => {
      const res = await request(server)
        .post(`/policies/${policyId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      const body = res.body as PolicyResponseBody;

      expect(body.status).toBe('paid');
      expect(body.policyNumber).toMatch(/^OSG-\d{4}-\d{6}$/);
      expect(body.validFrom).toEqual(expect.any(String));
      expect(body.validTo).toEqual(expect.any(String));
    });

    it('downloads a real PDF file', async () => {
      const res = await request(server)
        .get(`/policies/${policyId}/pdf`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(Buffer.isBuffer(res.body as Buffer)).toBe(true);
      expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('lists the policy for the user, with the vehicle nested', async () => {
      const res = await request(server)
        .get('/policies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const body = res.body as PolicyListItem[];

      expect(body).toHaveLength(1);
      expect(body[0].status).toBe('paid');
      expect(body[0].vehicle.plateNumber).toBe('01A123AA');
    });
  });
});
