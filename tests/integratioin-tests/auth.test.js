import axios from 'axios';
import faker from 'faker';
import { startSever, stopSever } from '../../app.js';
import { sequelize } from '../../db/database.js';

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

  //   describe('POST to /auth/login', () => {
  //     it('returns 200 and authrozation token when user details are valid', async () => {
  //       const fakerUser = faker.helpers.userCard();
  //       const user = {
  //         username: fakerUser.username,
  //         password: faker.internet.password(10, true),
  //       };
  //       userRepository.findByUsername = jest.fn();
  //       bcrypt.compare = jest.fn();
  //       const token = createJwtToken();

  //       const res = await request.post('/auth/login', user);

  //       expect(res.status).toBe(200);
  //       expect(res._getJSONData()).toMatchObject({
  //         token,
  //         username: user.usesrname,
  //       });
  //     });
  //   });
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
