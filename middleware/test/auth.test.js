import httpMocks from 'node-mocks-http';
import faker from 'faker';
import { isAuth } from '../auth.js';
import jwt from 'jsonwebtoken';
import * as userRepository from '../../data/auth.js';

jest.mock('jsonwebtoken');
jest.mock('../../data/auth.js');

describe('Auth Middleware', () => {
  it('returns 401 for the request without authorization header', async () => {
    //given
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
    });
    const response = httpMocks.createResponse();
    const next = jest.fn();

    //when
    await isAuth(request, response, next);

    //then
    expect(response.statusCode).toBe(401);
    expect(response._getJSONData().message).toBe('Authentication Error');
    expect(next).not.toBeCalled();
  });

  it('returns 401 for the request with unsupported authorizaton header', async () => {
    //given
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: { authorization: 'basic' },
    });
    const response = httpMocks.createResponse();
    const next = jest.fn();
    //when
    await isAuth(request, response, next);
    //then
    expect(response.statusCode).toBe(401);
    expect(response._getJSONData().message).toBe('Authentication Error');
    expect(next).not.toBeCalled();
  });

  it('returns 401 for the request with invalid JWT', async () => {
    //given
    const token = faker.random.alphaNumeric(128);
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: { authorization: `Bearer ${token}` },
    });
    const response = httpMocks.createResponse();
    const next = jest.fn();
    jwt.verify = jest.fn((token, secret, callBack) => {
      callBack(new Error('bad token'), undefined);
    });
    //when
    await isAuth(request, response, next);
    //then
    expect(response.statusCode).toBe(401);
    expect(response._getJSONData().message).toBe('Authentication Error');
    expect(next).not.toBeCalled();
  });

  it('returns 401 when cannot find a user by id from the JWT', async () => {
    //given
    const token = faker.random.alphaNumeric(128);
    const userId = faker.random.alphaNumeric(32);
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: { authorization: `Bearer ${token}` },
    });
    const response = httpMocks.createResponse();
    const next = jest.fn();
    jwt.verify = jest.fn((token, secret, callBack) => {
      callBack(undefined, { id: userId });
    });
    userRepository.findById = jest.fn((id) => Promise.resolve(undefined));
    //when
    await isAuth(request, response, next);
    //then
    expect(response.statusCode).toBe(401);
    expect(response._getJSONData().message).toBe('Authentication Error');
    expect(next).not.toBeCalled();
  });

  it('passes a request with valid authorization header with token', async () => {
    //given
    const token = faker.random.alphaNumeric(128);
    const userId = faker.random.alphaNumeric(32);
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: { authorization: `Bearer ${token}` },
    });
    const response = httpMocks.createResponse();
    const next = jest.fn();
    jwt.verify = jest.fn((token, secret, callBack) => {
      callBack(undefined, { id: userId });
    });
    userRepository.findById = jest.fn((id) => Promise.resolve({ id }));
    //when
    await isAuth(request, response, next);
    //then
    expect(request).toMatchObject({ userId, token });
    expect(next).toBeCalledTimes(1);
  });
});
