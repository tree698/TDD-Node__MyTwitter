import axios from 'axios';
import { startSever, stopSever } from '../../app.js';
import { sequelize } from '../../db/database.js';
import faker from 'faker';

describe('Auth APIs', () => {
  let server;
  let request;
  beforeAll(async () => {
    server = await startSever();
    request = axios.create({
      baseURL: 'http://localhost:8080',
      validateStatus: null,
    });
  });

  afterAll(async () => {
    await sequelize.drop();
    await stopSever(server);
  });

  describe('POST to /auth/signup', () => {
    it('returns 201 and authrozation token when user details are valid', async () => {
      const user = makeValidUserDetails();

      const res = await request.post('/auth/signup', user);

      expect(res.status).toBe(201);
      expect(res.data.token.length).toBeGreaterThan(0);
    });

    it('returns 409 when the username has already been taken', async () => {
      const user = makeValidUserDetails();
      const firstSignup = await request.post('/auth/signup', user);
      expect(firstSignup.status).toBe(201);

      const res = await request.post('/auth/signup', user);

      expect(res.status).toBe(409);
      expect(res.data.message).toBe(`${user.username} already exists`);
    });

    test.each([
      {
        missingFieldName: 'username',
        expectedMessage: 'username should be at least 5 characters',
      },
      {
        missingFieldName: 'password',
        expectedMessage: 'password should be at least 5 characters',
      },
      { missingFieldName: 'name', expectedMessage: 'name is missing' },
      { missingFieldName: 'email', expectedMessage: 'invalid email' },
    ])(
      `returns 400 when $missingFieldName field is missing`,
      async ({ missingFieldName, expectedMessage }) => {
        const user = makeValidUserDetails();
        delete user[missingFieldName];

        const res = await request.post('/auth/signup', user);

        expect(res.status).toBe(400);
        expect(res.data.message).toBe(expectedMessage);
      }
    );

    it('returns 400 when the length of password is less than 5', async () => {
      const user = {
        ...makeValidUserDetails(),
        password: '123',
      };
      const res = await request.post('/auth/signup', user);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('password should be at least 5 characters');
    });

    it('returns 400 when invalid url is provided', async () => {
      const user = {
        ...makeValidUserDetails(),
        url: '123',
      };
      const res = await request.post('/auth/signup', user);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('invalid URL');
    });
  });

  describe('POST to /auth/login', () => {
    it('returns 200 and authentication token when user credentials are valid', async () => {
      const user = await createNewUserAccount();

      const res = await request.post('/auth/login', {
        username: user.username,
        password: user.password,
      });

      expect(res.status).toBe(200);
      expect(res.data.token.length).toBeGreaterThan(0);
    });

    it('returns 401 when password is incorrect', async () => {
      const user = await createNewUserAccount();
      const wrongPassword = user.password.toUpperCase();

      const res = await request.post('/auth/login', {
        username: user.username,
        password: wrongPassword,
      });

      expect(res.status).toBe(401);
      expect(res.data.message).toBe('Invalid user or password');
    });

    it('returns 401 when username is not found', async () => {
      const someRandomNonExistentUser = faker.random.alpha({ count: 32 });

      const res = await request.post('/auth/login', {
        username: someRandomNonExistentUser,
        password: faker.internet.password(10, true),
      });

      expect(res.status).toBe(401);
      expect(res.data.message).toBe('Invalid user or password');
    });
  });

  describe('GET to /auth/me', () => {
    it('returns user details when valid token is present in Authorization header', async () => {
      const user = await createNewUserAccount();

      const res = await request.get('/auth/me', {
        headers: { Authorization: `Bearer ${user.jwt}` },
      });

      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({
        token: user.jwt,
        username: user.username,
      });
    });
  });

  async function createNewUserAccount() {
    const userDetails = makeValidUserDetails();
    const prepareUserResponse = await request.post('/auth/signup', userDetails);
    return {
      ...userDetails,
      jwt: prepareUserResponse.data.token,
    };
  }
});

function makeValidUserDetails() {
  const fakeUser = faker.helpers.userCard();
  return {
    name: fakeUser.name,
    username: fakeUser.username,
    email: fakeUser.email,
    password: faker.internet.password(10, true),
  };
}
